import os
import sys
import json
import shutil
import time
import numpy as np
import cv2
from glob import glob
from ultralytics import YOLO

def main():
    print("=" * 60)
    print("NEU-DET YOLO TRAINING & VALIDATION-DRIVEN SELECTION")
    print("=" * 60)

    # 1. Paths
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    data_yaml = r"C:\Users\SHAMSREENIR\Downloads\NEU-DET\NEU-YOLO\data.yaml"
    dataset_root = r"C:\Users\SHAMSREENIR\Downloads\NEU-DET\NEU-YOLO"
    models_dir = os.path.join(base_dir, "app", "models")
    assets_dir = os.path.join(base_dir, "app", "assets", "demo_images")
    runs_dir = os.path.join(base_dir, "runs")
    
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(assets_dir, exist_ok=True)
    os.makedirs(runs_dir, exist_ok=True)

    # Class names mapping
    class_names = {
        0: "crazing",
        1: "inclusion",
        2: "patches",
        3: "pitted_surface",
        4: "rolled_in_scale",
        5: "scratches"
    }

    # 2. Model Initialization & Training
    # We treat 25 epochs as a baseline with early stopping on validation mAP50
    print("\n[STEP 1/5] Initializing YOLO model and starting training...")
    try:
        model = YOLO("yolo11n.pt")
        model_arch = "yolo11n"
    except Exception as e:
        print(f"yolo11n download/init notice: {e}. Falling back to yolov8n.pt")
        model = YOLO("yolov8n.pt")
        model_arch = "yolov8n"

    train_results = model.train(
        data=data_yaml,
        epochs=25,
        patience=8,
        imgsz=224,
        batch=32,
        project=runs_dir,
        name="neu_yolo_run",
        exist_ok=True,
        save=True,
        plots=True,
        verbose=True
    )

    # 3. Model Selection via Validation Performance
    print("\n[STEP 2/5] Selecting best model checkpoint via validation performance...")
    best_pt = os.path.join(runs_dir, "neu_yolo_run", "weights", "best.pt")
    if not os.path.exists(best_pt):
        best_pt = os.path.join(runs_dir, "neu_yolo_run", "weights", "last.pt")
    
    print(f"Best validation checkpoint located at: {best_pt}")
    target_weights_path = os.path.join(models_dir, "yolo_neu_det.pt")
    shutil.copyfile(best_pt, target_weights_path)
    print(f"Saved selected weights to: {target_weights_path}")

    # Load selected best model for downstream calibration & test evaluation
    best_model = YOLO(target_weights_path)

    # 4. Validation Set Analysis & Threshold/Uncertainty Calibration
    print("\n[STEP 3/5] Performing validation-driven decision threshold and uncertainty calibration...")
    val_img_dir = os.path.join(dataset_root, "images", "val")
    val_images = sorted(glob(os.path.join(val_img_dir, "*.jpg")) + glob(os.path.join(val_img_dir, "*.png")))
    print(f"Found {len(val_images)} validation images.")

    val_max_confs = []
    val_entropies = []
    val_predictions = []

    for img_path in val_images:
        res = best_model.predict(img_path, conf=0.05, verbose=False)[0]
        boxes = res.boxes
        if len(boxes) > 0:
            confs = boxes.conf.cpu().numpy()
            classes = boxes.cls.cpu().numpy().astype(int)
            max_c = float(np.max(confs))
            val_max_confs.append(max_c)

            # Class probability distribution / entropy across detected boxes
            cls_counts = np.bincount(classes, minlength=6).astype(float)
            probs = cls_counts / np.sum(cls_counts)
            eps = 1e-9
            entropy = float(-np.sum(probs * np.log2(probs + eps)))
            val_entropies.append(entropy)
            val_predictions.append({"path": img_path, "max_conf": max_c, "detected": True, "entropy": entropy})
        else:
            val_max_confs.append(0.0)
            val_entropies.append(0.0)
            val_predictions.append({"path": img_path, "max_conf": 0.0, "detected": False, "entropy": 0.0})

    # Validation distribution statistics
    nonzero_confs = [c for c in val_max_confs if c > 0.0]
    tau_low = float(np.percentile(nonzero_confs, 5)) if nonzero_confs else 0.30
    conf_median = float(np.median(nonzero_confs)) if nonzero_confs else 0.70
    entropy_p90 = float(np.percentile(val_entropies, 90)) if val_entropies else 0.50

    # Sweep thresholds on validation set to find optimal decision threshold tau*
    # Objective: Maximize unit-level defect detection rate while maintaining confidence integrity
    best_tau = 0.50
    best_f1 = 0.0
    val_total = len(val_images) # all 270 are defective
    
    threshold_candidates = np.arange(0.10, 0.95, 0.05)
    for tau in threshold_candidates:
        # Detected as defect if max_conf >= tau
        tp = sum(1 for p in val_predictions if p["max_conf"] >= tau)
        fn = val_total - tp
        # Unit-level recall / catch rate
        recall = tp / val_total
        # In a 100% defective set, precision = TP / (TP + FP) where FP=0 -> 1.0, so F1 = 2*R/(R+1)
        # To avoid setting threshold arbitrarily near 0.05, balance recall >= 0.95 with confidence margin
        if recall >= 0.95 and tau > best_tau:
            best_tau = round(float(tau), 2)

    print(f"Validation Calibrated Optimal Decision Threshold (tau*): {best_tau}")
    print(f"Validation 5th Percentile Detection Floor (tau_low): {round(tau_low, 3)}")
    print(f"Validation 90th Percentile Entropy Cutoff: {round(entropy_p90, 3)}")

    # 5. Final Unbiased Test Set Evaluation
    print("\n[STEP 4/5] Evaluating selected model on untouched Test Set (270 images)...")
    test_val_results = best_model.val(data=data_yaml, split="test", verbose=False)
    
    # Extract standard detection metrics
    box_metrics = test_val_results.box
    map50 = float(box_metrics.map50)
    map50_95 = float(box_metrics.map)
    macro_p = float(box_metrics.mp)
    macro_r = float(box_metrics.mr)
    macro_f1 = 2 * macro_p * macro_r / (macro_p + macro_r + 1e-9)

    # Per-class metrics from test evaluation
    per_class = []
    for cls_id in range(6):
        c_name = class_names[cls_id]
        cp = float(box_metrics.p[cls_id]) if cls_id < len(box_metrics.p) else 0.0
        cr = float(box_metrics.r[cls_id]) if cls_id < len(box_metrics.r) else 0.0
        cf1 = 2 * cp * cr / (cp + cr + 1e-9)
        per_class.append({
            "class_id": cls_id,
            "class_name": c_name,
            "precision": round(cp, 4),
            "recall": round(cr, 4),
            "f1": round(cf1, 4)
        })

    # Unit-Level Defect Escape Rate (FAR) Sweep on Test Set
    test_img_dir = os.path.join(dataset_root, "images", "test")
    test_images = sorted(glob(os.path.join(test_img_dir, "*.jpg")) + glob(os.path.join(test_img_dir, "*.png")))
    test_total = len(test_images)
    print(f"Evaluating unit-level escape rates across {test_total} test images...")

    test_predictions = []
    class_test_samples = {cls_name: [] for cls_name in class_names.values()}

    for img_path in test_images:
        res = best_model.predict(img_path, conf=0.05, verbose=False)[0]
        boxes = res.boxes
        if len(boxes) > 0:
            confs = boxes.conf.cpu().numpy()
            classes = boxes.cls.cpu().numpy().astype(int)
            max_c = float(np.max(confs))
            top_cls = int(classes[np.argmax(confs)])
            top_cls_name = class_names.get(top_cls, "unknown")
            class_test_samples[top_cls_name].append((img_path, max_c))
            test_predictions.append({"path": img_path, "max_conf": max_c, "top_class": top_cls_name})
        else:
            test_predictions.append({"path": img_path, "max_conf": 0.0, "top_class": "none"})

    far_sweep = []
    for th in [0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90]:
        tp = sum(1 for p in test_predictions if p["max_conf"] >= th)
        fn = test_total - tp
        far = fn / float(test_total) # Defect Escape Rate
        unit_accuracy = tp / float(test_total) # Accuracy in detecting defective plate
        far_sweep.append({
            "threshold": round(th, 2),
            "defective_units_tested": test_total,
            "detected_true_positives": tp,
            "false_accept_missed_defects": fn,
            "false_accept_rate": round(far, 4),
            "unit_detection_accuracy": round(unit_accuracy, 4),
            "note": "Unit-level defect escape rate (FN/Total Defective). FRR undefined (0 normal plates in NEU-DET)."
        })

    # 6. Copy Genuine Representative Test Images to Assets for UI
    print("\n[STEP 5/5] Populating representative test specimens for UI...")
    specimen_catalog = []
    for cls_id, cls_name in class_names.items():
        samples = class_test_samples.get(cls_name, [])
        if samples:
            # Pick the highest confidence test specimen for clear UI inspection
            samples.sort(key=lambda x: x[1], reverse=True)
            chosen_path, conf = samples[0]
            target_fname = f"{cls_name}_test.jpg"
            target_path = os.path.join(assets_dir, target_fname)
            shutil.copyfile(chosen_path, target_path)
            specimen_catalog.append({
                "id": target_fname,
                "label": f"NEU-DET Test Sample: {cls_name.replace('_', ' ').title()}",
                "class_name": cls_name,
                "test_confidence": round(conf, 3),
                "is_genuine_test_sample": True
            })
            print(f"Copied test sample for {cls_name} (conf={conf:.3f}) -> {target_fname}")

    # Generate a clearly labeled baseline calibration plate for reference
    calib_fname = "normal_calibration_surface.png"
    calib_path = os.path.join(assets_dir, calib_fname)
    # 200x200 uniform steel surface
    calib_img = np.full((200, 200), 165, dtype=np.uint8)
    # Add subtle brushed metal grain
    noise = np.random.normal(0, 3, (200, 200)).astype(np.int16)
    calib_img = np.clip(calib_img + noise, 0, 255).astype(np.uint8)
    cv2.imwrite(calib_path, calib_img)
    specimen_catalog.append({
        "id": calib_fname,
        "label": "Baseline Reference Standard (Flawless Calibration Plate)",
        "class_name": "normal_surface",
        "test_confidence": 0.0,
        "is_genuine_test_sample": False,
        "disclosure": "Synthesized reference baseline surface. NEU-DET dataset contains 0 genuine normal steel plates."
    })

    # 7. Compile Final Evaluation Metadata Artifact
    evaluation_metadata = {
        "model_metadata": {
            "model_architecture": model_arch,
            "weights_file": "yolo_neu_det.pt",
            "training_dataset": "NEU-DET (Northeastern University Surface Defect Database)",
            "classes": class_names,
            "train_samples": 1260,
            "val_samples": 270,
            "test_samples": 270,
            "epochs_completed": len(train_results.box.maps) if hasattr(train_results, 'box') else 25,
            "selection_criterion": "Best validation mAP50 checkpoint (early stopping patience=8)"
        },
        "validation_calibration": {
            "optimal_decision_threshold": best_tau,
            "uncertainty_floor_tau_low": round(tau_low, 3),
            "entropy_p90_cutoff": round(entropy_p90, 3),
            "median_confidence": round(conf_median, 3),
            "methodology": "Derived empirically on 270 validation images to balance >=95% defect catch rate with boundary margin"
        },
        "test_set_performance": {
            "test_samples": test_total,
            "box_map50": round(map50, 4),
            "box_map50_95": round(map50_95, 4),
            "macro_precision": round(macro_p, 4),
            "macro_recall": round(macro_r, 4),
            "macro_f1": round(macro_f1, 4),
            "per_class_breakdown": per_class
        },
        "unit_level_evaluation": {
            "dataset_composition": "100% Defective (0 genuine acceptable baseline plates in NEU-DET)",
            "decision_rule": "Defective (Reject) if max_conf >= tau, else Acceptable (Accept)",
            "far_definition": "Defect Escape Rate = Missed Defective Units (FN) / Total Defective Test Units (270)",
            "frr_status": "Mathematically undefined on NEU-DET alone due to N_acceptable = 0",
            "far_sweep": far_sweep
        },
        "specimen_catalog": specimen_catalog,
        "architectural_notice": "AOI Vision Pipeline (NEU-DET benchmark) operates independently from discrete-event factory simulation (Rockwell Arena Model 3). No fabricated cross-dataset batch keys are assumed."
    }

    metrics_out = os.path.join(models_dir, "yolo_eval_metrics.json")
    with open(metrics_out, "w") as f:
        json.dump(evaluation_metadata, f, indent=2)
    print(f"\nSaved evaluation metrics artifact to: {metrics_out}")

    print("\n" + "=" * 60)
    print("TRAINING & VALIDATION EVALUATION COMPLETED SUCCESSFULLY")
    print(f"Test mAP50: {map50:.4f} | Macro F1: {macro_f1:.4f} | Optimal Tau*: {best_tau}")
    print("=" * 60)

if __name__ == "__main__":
    main()
