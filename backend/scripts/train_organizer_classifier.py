import os
import sys
import json
import time
import math
import numpy as np
from PIL import Image
from collections import Counter

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from sklearn.metrics import precision_recall_fscore_support, accuracy_score, confusion_matrix

SPLITS_PATH = r"C:\Users\SHAMSREENIR\.gemini\antigravity\scratch\industrial-ai-copilot\backend\app\assets\organizer_splits.json"
MODEL_SAVE_PATH = r"C:\Users\SHAMSREENIR\.gemini\antigravity\scratch\industrial-ai-copilot\backend\app\models\organizer_vision_best.pt"
METRICS_SAVE_PATH = r"C:\Users\SHAMSREENIR\.gemini\antigravity\scratch\industrial-ai-copilot\backend\app\models\organizer_vision_metrics.json"

class SurfaceDefectDataset(Dataset):
    def __init__(self, root_dir, items, class_to_idx, transform=None):
        self.root_dir = root_dir
        self.items = items
        self.class_to_idx = class_to_idx
        self.transform = transform

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        item = self.items[idx]
        img_path = os.path.join(self.root_dir, item["rel_path"])
        img = Image.open(img_path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        label = self.class_to_idx[item["class"]]
        return img, label, item["rel_path"]

def train_organizer_classifier(epochs=2, batch_size=48):
    print("=== STARTING ORGANIZER CLASSIFIER TRAINING ===", flush=True)
    
    with open(SPLITS_PATH, "r") as f:
        splits = json.load(f)

    meta = splits["dataset_metadata"]
    dataset_root = meta["dataset_root"]
    classes = meta["classes"]
    class_to_idx = meta["class_to_idx"]
    idx_to_class = {v: k for k, v in class_to_idx.items()}
    num_classes = len(classes)

    print(f"Dataset root: {dataset_root}", flush=True)
    print(f"Classes ({num_classes}): {classes}", flush=True)
    print(f"Train samples: {len(splits['train'])}, Val samples: {len(splits['val'])}, Test samples: {len(splits['test'])}", flush=True)

    # Industrial Augmentations
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.ColorJitter(brightness=0.15, contrast=0.15),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    val_test_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    train_dataset = SurfaceDefectDataset(dataset_root, splits["train"], class_to_idx, transform=train_transform)
    val_dataset = SurfaceDefectDataset(dataset_root, splits["val"], class_to_idx, transform=val_test_transform)
    test_dataset = SurfaceDefectDataset(dataset_root, splits["test"], class_to_idx, transform=val_test_transform)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}", flush=True)

    # MobileNetV3-Small architecture
    model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
    in_features = model.classifier[3].in_features
    model.classifier[3] = nn.Linear(in_features, num_classes)
    model.to(device)

    criterion = nn.CrossEntropyLoss()

    # Phase 1: Classifier head warmup (1 epoch)
    for param in model.features.parameters():
        param.requires_grad = False
    
    optimizer = torch.optim.AdamW(model.classifier.parameters(), lr=1.5e-3, weight_decay=1e-4)
    print("\n--- PHASE 1: Classifier Head Warmup ---", flush=True)
    model.train()
    for batch_idx, (images, targets, _) in enumerate(train_loader):
        images, targets = images.to(device), targets.to(device)
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()
        if (batch_idx + 1) % 40 == 0 or (batch_idx + 1) == len(train_loader):
            print(f"  Warmup Step [{batch_idx+1}/{len(train_loader)}] Loss: {loss.item():.4f}", flush=True)

    # Phase 2: Fine-tune top features (layers 9-12) and classifier head
    print("\n--- PHASE 2: Top Features Fine-Tuning ---", flush=True)
    # Freeze lower feature layers 0-8 to keep training ultra-fast and prevent catastrophic forgetting
    for i, layer in enumerate(model.features):
        if i >= 9:
            for p in layer.parameters():
                p.requires_grad = True
        else:
            for p in layer.parameters():
                p.requires_grad = False

    optimizer = torch.optim.AdamW([
        {"params": [p for i, layer in enumerate(model.features) if i >= 9 for p in layer.parameters()], "lr": 3e-4},
        {"params": model.classifier.parameters(), "lr": 1e-3}
    ], weight_decay=1e-4)
    
    best_val_f1 = 0.0
    best_state_dict = None

    for epoch in range(1, epochs + 1):
        t0 = time.time()
        model.train()
        train_loss = 0.0
        
        for batch_idx, (images, targets, _) in enumerate(train_loader):
            images, targets = images.to(device), targets.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
            if (batch_idx + 1) % 40 == 0 or (batch_idx + 1) == len(train_loader):
                print(f"  Epoch [{epoch}/{epochs}] Step [{batch_idx+1}/{len(train_loader)}] Running Loss: {loss.item():.4f}", flush=True)

        avg_train_loss = train_loss / len(train_loader)
        train_time = time.time() - t0

        # Evaluate on Validation
        model.eval()
        val_preds, val_targets = [], []
        with torch.no_grad():
            for images, targets, _ in val_loader:
                images, targets = images.to(device), targets.to(device)
                outputs = model(images)
                preds = outputs.argmax(dim=1)
                val_preds.extend(preds.cpu().numpy())
                val_targets.extend(targets.cpu().numpy())

        val_acc = accuracy_score(val_targets, val_preds)
        val_p, val_r, val_f1, _ = precision_recall_fscore_support(val_targets, val_preds, average="macro", zero_division=0)
        
        print(f"Epoch [{epoch}/{epochs}] ({train_time:.1f}s) - Train Loss: {avg_train_loss:.4f} | Val Acc: {val_acc*100:.2f}% | Val Macro F1: {val_f1*100:.2f}% | Macro P: {val_p*100:.2f}% | Macro R: {val_r*100:.2f}%", flush=True)

        if val_f1 > best_val_f1 or best_state_dict is None:
            best_val_f1 = val_f1
            best_state_dict = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            print(f"  >>> Best Validation Checkpoint Updated: {best_val_f1*100:.2f}%", flush=True)

    # Save best checkpoint
    print(f"\nSaving best checkpoint to: {MODEL_SAVE_PATH}", flush=True)
    os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)
    torch.save({
        "model_state_dict": best_state_dict,
        "classes": classes,
        "class_to_idx": class_to_idx,
        "arch": "MobileNetV3-Small",
        "num_classes": num_classes,
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }, MODEL_SAVE_PATH)

    # Load best weights for calibration & final test
    model.load_state_dict(best_state_dict)
    model.to(device)
    model.eval()

    # =========================================================================
    # PHASE 6: VALIDATION-DRIVEN THRESHOLD & UNCERTAINTY CALIBRATION
    # =========================================================================
    print("\n--- CALIBRATING DECISION THRESHOLDS ON VALIDATION SPLIT ---", flush=True)
    val_probs = []
    val_true_labels = []
    
    with torch.no_grad():
        for images, targets, _ in val_loader:
            images = images.to(device)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1).cpu().numpy()
            val_probs.append(probs)
            val_true_labels.extend(targets.numpy())

    val_probs = np.vstack(val_probs)
    val_true_labels = np.array(val_true_labels)

    top1_conf = np.max(val_probs, axis=1)
    sorted_probs = np.sort(val_probs, axis=1)[:, ::-1]
    top2_margins = sorted_probs[:, 0] - sorted_probs[:, 1]
    
    eps = 1e-9
    val_entropies = -np.sum(val_probs * np.log2(val_probs + eps), axis=1)

    correct_mask = (np.argmax(val_probs, axis=1) == val_true_labels)
    tau_accept = float(np.percentile(top1_conf[correct_mask], 10))
    tau_accept = round(max(0.65, min(0.85, tau_accept)), 3)

    tau_review = float(np.percentile(top1_conf, 10))
    tau_review = round(max(0.40, min(0.60, tau_review)), 3)

    margin_threshold = float(np.percentile(top2_margins[correct_mask], 5))
    margin_threshold = round(max(0.10, min(0.30, margin_threshold)), 3)

    entropy_threshold = float(np.percentile(val_entropies, 90))
    entropy_threshold = round(entropy_threshold, 3)

    print(f"Calibrated Thresholds:", flush=True)
    print(f"  tau_accept (Automatic decision cutoff):        {tau_accept}", flush=True)
    print(f"  tau_review (Floor for review):                 {tau_review}", flush=True)
    print(f"  margin_threshold (Top-1 vs Top-2 separation):  {margin_threshold}", flush=True)
    print(f"  entropy_threshold (Shannon uncertainty):       {entropy_threshold}", flush=True)

    # =========================================================================
    # PHASE 7 & 8: FINAL UNBIASED TEST SET EVALUATION
    # =========================================================================
    print("\n--- FINAL TEST EVALUATION (UNTOUCHED TEST IMAGES) ---", flush=True)
    test_probs = []
    test_true_labels = []

    with torch.no_grad():
        for images, targets, _ in test_loader:
            images = images.to(device)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1).cpu().numpy()
            test_probs.append(probs)
            test_true_labels.extend(targets.numpy())

    test_probs = np.vstack(test_probs)
    test_true_labels = np.array(test_true_labels)
    test_pred_labels = np.argmax(test_probs, axis=1)

    test_acc = accuracy_score(test_true_labels, test_pred_labels)
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(test_true_labels, test_pred_labels, average="macro", zero_division=0)
    weighted_p, weighted_r, weighted_f1, _ = precision_recall_fscore_support(test_true_labels, test_pred_labels, average="weighted", zero_division=0)

    per_cls_p, per_cls_r, per_cls_f1, per_cls_supp = precision_recall_fscore_support(test_true_labels, test_pred_labels, average=None, zero_division=0)
    per_class_metrics = []
    for idx, cls in enumerate(classes):
        per_class_metrics.append({
            "class_name": cls,
            "precision": round(float(per_cls_p[idx]), 4),
            "recall": round(float(per_cls_r[idx]), 4),
            "f1_score": round(float(per_cls_f1[idx]), 4),
            "test_samples": int(per_cls_supp[idx])
        })

    cm = confusion_matrix(test_true_labels, test_pred_labels)

    normal_idx = class_to_idx["normal"]
    is_true_defect = (test_true_labels != normal_idx)
    is_true_normal = (test_true_labels == normal_idx)

    false_accepts = np.sum((test_pred_labels == normal_idx) & is_true_defect)
    total_defective = np.sum(is_true_defect)
    far = float(false_accepts / total_defective) if total_defective > 0 else 0.0

    false_rejects = np.sum((test_pred_labels != normal_idx) & is_true_normal)
    total_normal = np.sum(is_true_normal)
    frr = float(false_rejects / total_normal) if total_normal > 0 else 0.0

    print(f"Test Accuracy:                    {test_acc*100:.2f}%", flush=True)
    print(f"Test Macro Precision:             {macro_p*100:.2f}%", flush=True)
    print(f"Test Macro Recall:                {macro_r*100:.2f}%", flush=True)
    print(f"Test Macro F1-Score:              {macro_f1*100:.2f}%", flush=True)
    print(f"False Accept Rate (FAR / Escape): {far*100:.2f}% ({false_accepts}/{total_defective})", flush=True)
    print(f"False Reject Rate (FRR / Reject): {frr*100:.2f}% ({false_rejects}/{total_normal})", flush=True)

    metrics_data = {
        "model_metadata": {
            "model_name": "Organizer Manufacturing Surface Classifier",
            "model_version": "v1.0-mobilenetv3-small",
            "architecture": "MobileNetV3-Small (Transfer Learning)",
            "primary_model": True,
            "dataset_origin": "Organizer Provided Visual Dataset (train/train)",
            "dataset_root": dataset_root,
            "classes": classes,
            "num_classes": num_classes,
            "total_dataset_images": meta["total_images"],
            "train_samples": len(splits["train"]),
            "validation_samples": len(splits["val"]),
            "test_samples": len(splits["test"]),
            "image_resolution": "256x256 RGB",
            "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        },
        "calibration_policy": {
            "accept_threshold": tau_accept,
            "review_threshold": tau_review,
            "margin_threshold": margin_threshold,
            "entropy_threshold": entropy_threshold,
            "decision_rule": (
                f"Prediction with top confidence >= {tau_accept} and top-2 margin >= {margin_threshold} is automatically decided "
                f"('ACCEPTABLE' if normal, 'DEFECTIVE' if crack/hole/rust/scratch). "
                f"Confidence < {tau_accept}, margin < {margin_threshold}, or entropy > {entropy_threshold} escalates to 'HUMAN SCRUTINY'."
            )
        },
        "test_performance": {
            "accuracy": round(float(test_acc), 4),
            "macro_precision": round(float(macro_p), 4),
            "macro_recall": round(float(macro_r), 4),
            "macro_f1": round(float(macro_f1), 4),
            "weighted_f1": round(float(weighted_f1), 4),
            "false_accept_rate": round(far, 4),
            "false_reject_rate": round(frr, 4),
            "total_defective_tested": int(total_defective),
            "false_accept_count": int(false_accepts),
            "total_normal_tested": int(total_normal),
            "false_reject_count": int(false_rejects),
            "per_class_metrics": per_class_metrics,
            "confusion_matrix": {
                "classes": classes,
                "matrix": cm.tolist()
            }
        },
        "industrial_notice": (
            "ORGANIZER DATASET EVALUATION: Evaluated strictly on the untouched test split of the organizer manufacturing dataset. "
            "Defect Escape Rate (FAR) and False Reject Rate (FRR) are calculated from genuine defective vs normal ground truth. "
            "Localization evidence is generated via true Grad-CAM activation heatmaps rather than bounding-box IoU (no bbox labels exist)."
        )
    }

    with open(METRICS_SAVE_PATH, "w") as f:
        json.dump(metrics_data, f, indent=2)
    print(f"\nSaved empirical evaluation metrics to: {METRICS_SAVE_PATH}", flush=True)
    print("=== TRAINING & VALIDATION CALIBRATION COMPLETED SUCCESSFULLY ===", flush=True)

if __name__ == "__main__":
    train_organizer_classifier(epochs=2, batch_size=48)
