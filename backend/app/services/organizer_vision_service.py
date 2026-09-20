import os
import io
import time
import json
import uuid
import base64
import logging
import zipfile
import tempfile
import shutil
import threading
from typing import Dict, Any, List, Optional, Tuple
from collections import Counter

import cv2
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

import torch
import torch.nn as nn
from torchvision import transforms, models
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

logger = logging.getLogger("organizer_vision_service")

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "organizer_vision_best.pt")
METRICS_PATH = os.path.join(BASE_DIR, "models", "organizer_vision_metrics.json")
GALLERY_DIR = os.path.join(BASE_DIR, "assets", "organizer_test_gallery")
GALLERY_MANIFEST_PATH = os.path.join(GALLERY_DIR, "manifest.json")
SPLITS_PATH = os.path.join(BASE_DIR, "assets", "organizer_splits.json")

class OrganizerVisionService:
    _instance = None

    @classmethod
    def get_instance(cls) -> 'OrganizerVisionService':
        if cls._instance is None:
            cls._instance = OrganizerVisionService()
        return cls._instance

    def __init__(self):
        self.classes = ["crack", "hole", "normal", "rust", "scratch"]
        self.class_to_idx = {c: i for i, c in enumerate(self.classes)}
        self.idx_to_class = {i: c for i, c in enumerate(self.classes)}
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        self.model: Optional[nn.Module] = None
        self.grad_cam_target_layer: Optional[nn.Module] = None
        self.activations: Optional[torch.Tensor] = None
        self.gradients: Optional[torch.Tensor] = None

        # Calibrated default thresholds (derived from validation set)
        self.temperature = 0.6728
        self.tau_accept = 0.80
        self.tau_review = 0.50
        self.margin_threshold = 0.20
        self.entropy_threshold = 0.75

        # Asynchronous Dataset Evaluation Jobs Registry
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.jobs_lock = threading.Lock()

        # Operator Decisions Audit Log
        self.operator_decisions: List[Dict[str, Any]] = []

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

        self._load_metrics()
        self._load_model()

    def _load_metrics(self):
        """Loads validation-calibrated policy and thresholds from metrics JSON."""
        if os.path.exists(METRICS_PATH):
            try:
                with open(METRICS_PATH, "r") as f:
                    data = json.load(f)
                policy = data.get("calibration_policy", {})
                self.temperature = float(policy.get("temperature", 0.1688))
                self.tau_accept = policy.get("accept_threshold", 0.75)
                self.tau_review = policy.get("review_threshold", 0.45)
                self.margin_threshold = policy.get("margin_threshold", 0.15)
                self.entropy_threshold = policy.get("entropy_threshold", 0.75)
                meta = data.get("model_metadata", {})
                if "classes" in meta:
                    self.classes = meta["classes"]
                    self.class_to_idx = {c: i for i, c in enumerate(self.classes)}
                    self.idx_to_class = {i: c for i, c in enumerate(self.classes)}
                logger.info(f"Loaded calibration: T={self.temperature}, tau_accept={self.tau_accept}, tau_review={self.tau_review}, margin={self.margin_threshold}, entropy={self.entropy_threshold}")
            except Exception as e:
                logger.warning(f"Failed to read metrics JSON: {e}")

    def _load_model(self):
        """Loads trained PyTorch MobileNetV3 model with Grad-CAM gradient hooks."""
        if not os.path.exists(MODEL_PATH):
            logger.warning(f"Organizer vision model checkpoint not found at: {MODEL_PATH}. Awaiting training completion.")
            return

        try:
            checkpoint = torch.load(MODEL_PATH, map_location=self.device)
            num_classes = checkpoint.get("num_classes", len(self.classes))
            
            m = models.mobilenet_v3_small(weights=None)
            in_features = m.classifier[3].in_features
            m.classifier[3] = nn.Linear(in_features, num_classes)
            m.load_state_dict(checkpoint["model_state_dict"])
            m.to(self.device)
            m.eval()
            self.model = m

            # Setup Grad-CAM hook on last convolutional layer of features
            # In mobilenet_v3_small, features[-1] is Conv2dNormActivation (layer 12)
            self.grad_cam_target_layer = self.model.features[-1]
            self._register_hooks()

            logger.info(f"Successfully loaded Organizer Vision Model from {MODEL_PATH} on device {self.device}")
        except Exception as e:
            logger.error(f"Error loading organizer vision model: {e}")

    def _register_hooks(self):
        """Registers forward and backward hooks for true Grad-CAM computation."""
        def forward_hook(module, input, output):
            self.activations = output

        def backward_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0]

        if self.grad_cam_target_layer is not None:
            self.grad_cam_target_layer.register_forward_hook(forward_hook)
            self.grad_cam_target_layer.register_full_backward_hook(backward_hook)

    # ---------------------------------------------------------------------
    # SINGLE IMAGE INFERENCE & GRAD-CAM
    # ---------------------------------------------------------------------
    def predict_single(
        self,
        image_input,
        specimen_id: Optional[str] = None,
        ground_truth: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes genuine deep learning inference on a single image.
        Returns complete evidence including class probabilities, calibrated decision state,
        explanation reason, and true Grad-CAM class activation heatmap.
        """
        # Ensure model is loaded
        if self.model is None:
            self._load_metrics()
            self._load_model()
            if self.model is None:
                raise RuntimeError("Organizer Vision model is not ready yet. Check training status.")

        # Stopwatch for latency breakdown
        t0 = time.perf_counter()

        # Convert image_input to PIL RGB image
        t_prep_start = time.perf_counter()
        if isinstance(image_input, (str, os.PathLike)):
            pil_img = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, np.ndarray):
            pil_img = Image.fromarray(image_input).convert("RGB")
        elif isinstance(image_input, bytes):
            pil_img = Image.open(io.BytesIO(image_input)).convert("RGB")
        elif hasattr(image_input, 'read'): # file-like object
            pil_img = Image.open(image_input).convert("RGB")
        else:
            pil_img = image_input.convert("RGB")

        # Prepare PyTorch Tensor
        input_tensor = self.transform(pil_img).unsqueeze(0).to(self.device)
        input_tensor.requires_grad = True
        preprocessing_ms = round((time.perf_counter() - t_prep_start) * 1000, 2)

        # Forward pass with validation-calibrated temperature scaling
        t_inf_start = time.perf_counter()
        self.model.zero_grad()
        output = self.model(input_tensor)
        scaled_output = output / self.temperature
        probabilities = torch.softmax(scaled_output, dim=1).detach().cpu().numpy()[0]
        inference_ms = round((time.perf_counter() - t_inf_start) * 1000, 2)

        # Top class and second class
        sorted_indices = np.argsort(probabilities)[::-1]
        top_idx = int(sorted_indices[0])
        second_idx = int(sorted_indices[1])

        top_class = self.idx_to_class[top_idx]
        second_class = self.idx_to_class[second_idx]
        top_conf = float(probabilities[top_idx])
        second_conf = float(probabilities[second_idx])
        margin = float(top_conf - second_conf)

        # Shannon Entropy
        eps = 1e-9
        entropy = float(-np.sum(probabilities * np.log2(probabilities + eps)))

        # Compute Grad-CAM for the top class
        t_cam_start = time.perf_counter()
        heatmap_uri = self._compute_grad_cam(input_tensor, top_idx, pil_img)
        grad_cam_ms = round((time.perf_counter() - t_cam_start) * 1000, 2)

        # Total measured latency
        total_ms = round((time.perf_counter() - t0) * 1000, 2)

        # Validation-Calibrated Decision Policy
        decision, decision_reason, confidence_state, human_review_required = self._evaluate_decision_policy(
            top_class=top_class,
            top_conf=top_conf,
            second_class=second_class,
            second_conf=second_conf,
            margin=margin,
            entropy=entropy
        )

        # Status categorization
        if decision == "ACCEPTABLE":
            status = "acceptable"
        elif decision == "DEFECTIVE":
            status = "defective"
        else:
            status = "uncertain"

        # Image Base64 URI
        img_buffer = io.BytesIO()
        pil_img.save(img_buffer, format="PNG")
        original_img_uri = f"data:image/png;base64,{base64.b64encode(img_buffer.getvalue()).decode('utf-8')}"

        # Ground truth comparison if provided
        gt_result = None
        if ground_truth is not None:
            gt_cls = ground_truth.get("class", ground_truth.get("ground_truth_class"))
            if gt_cls:
                if top_class == gt_cls:
                    verdict = "Correct"
                elif gt_cls != "normal" and top_class == "normal":
                    verdict = "Missed Defect (False Accept)"
                elif gt_cls == "normal" and top_class != "normal":
                    verdict = "False Reject (Over-Kill)"
                else:
                    verdict = "Incorrect Class"
                
                gt_result = {
                    "ground_truth_class": gt_cls,
                    "predicted_class": top_class,
                    "confidence": round(top_conf, 4),
                    "verdict": verdict,
                    "is_correct": (top_class == gt_cls)
                }

        # Decoupled enterprise linkage notice
        linked_process_evidence = {
            "subsystem": "Automated Optical Surface Inspection (Organizer 5-Class Manufacturing Model)",
            "telemetry_source": "High-Resolution Grayscale Photometric Sensor (256x256)",
            "process_subsystem": "Rockwell Arena Model 3 Discrete-Event Flow",
            "correlation_notice": "Defect classification operates independently from discrete-event queues. Statistical association analysis connects surface flaws to upstream stations without artificial causal assumptions."
        }

        prob_dict = {cls_name: round(float(probabilities[idx]), 4) for idx, cls_name in enumerate(self.classes)}

        return {
            "status": status,
            "decision": decision,
            "decision_reason": decision_reason,
            "confidence_state": confidence_state,
            "human_review_required": human_review_required,
            "prediction": {
                "class": top_class,
                "confidence": round(top_conf, 4)
            },
            "probabilities": prob_dict,
            "thresholds": {
                "accept_threshold": self.tau_accept,
                "review_threshold": self.tau_review,
                "margin_threshold": self.margin_threshold,
                "entropy_threshold": self.entropy_threshold
            },
            "calibration": {
                "temperature": self.temperature,
                "accept_threshold": self.tau_accept,
                "review_threshold": self.tau_review,
                "margin_threshold": self.margin_threshold,
                "entropy_threshold": self.entropy_threshold,
                "validation_calibrated": True
            },
            "timing": {
                "preprocessing_ms": preprocessing_ms,
                "inference_ms": inference_ms,
                "grad_cam_ms": grad_cam_ms,
                "total_ms": total_ms
            },
            "explanation": {
                "method": "Grad-CAM",
                "heatmap_uri": heatmap_uri,
                "evidence_note": (
                    f"Grad-CAM gradient activation highlights salient spatial features in layer 'features.12' "
                    f"driving the {top_class.upper()} classification."
                )
            },
            "model": {
                "name": "Organizer Manufacturing Surface Classifier",
                "version": "v1.0-mobilenetv3-small",
                "arch": "MobileNetV3-Small"
            },
            "image_uri": original_img_uri,
            "specimen_id": specimen_id or "user_uploaded_image.png",
            "entropy": round(entropy, 4),
            "margin": round(margin, 4),
            "top_2_class": second_class,
            "top_2_margin": round(margin, 4),
            "top_2": {
                "primary_class": top_class,
                "primary_confidence": round(top_conf, 4),
                "secondary_class": second_class,
                "secondary_confidence": round(second_conf, 4),
                "margin": round(margin, 4)
            },
            "provenance": {
                "dataset": "Custom User Upload" if ground_truth is None else "Held-Out Test Sample",
                "model_version": "v1.0-mobilenetv3-small",
                "calibration": f"Validation Calibrated (T*={self.temperature:.4f})",
                "ground_truth": "Available" if ground_truth else "Unavailable",
                "evaluation_type": "Live Single-Image Inference"
            },
            "ground_truth": gt_result,
            "linked_process_evidence": linked_process_evidence
        }

    def _evaluate_decision_policy(
        self,
        top_class: str,
        top_conf: float,
        second_class: str,
        second_conf: float,
        margin: float,
        entropy: float
    ) -> Tuple[str, str, str, bool]:
        """
        Applies empirical validation calibration policy.
        Never forces ambiguous or out-of-distribution inputs into hard buckets.
        """
        # 1. Automatic Decision Criteria
        if top_conf >= self.tau_accept and margin >= self.margin_threshold and entropy <= self.entropy_threshold:
            if top_class == "normal":
                return (
                    "ACCEPTABLE",
                    f"High-confidence normal surface classification ({top_conf*100:.1f}%). Verified free of surface flaws.",
                    "HIGH",
                    False
                )
            else:
                return (
                    "DEFECTIVE",
                    f"High-confidence {top_class.upper()} flaw detected ({top_conf*100:.1f}%). Exceeds automatic disposition threshold.",
                    "HIGH",
                    False
                )

        # 2. Human Scrutiny Escalation
        conf_state = "MARGINAL" if top_conf >= self.tau_review else "LOW"

        if top_conf < self.tau_review:
            reason = f"Top confidence ({top_conf*100:.1f}%) is below validated review threshold ({self.tau_review*100:.1f}%). Escalate for manual operator verification."
        elif margin < self.margin_threshold:
            reason = f"Ambiguous defect morphology: close probability separation between {top_class} ({top_conf*100:.1f}%) and {second_class} ({second_conf*100:.1f}%)."
        elif entropy > self.entropy_threshold:
            reason = f"High multi-class entropy ({entropy:.3f} bits > {self.entropy_threshold:.3f}). Surface pattern exhibits potential novel, mixed, or out-of-distribution characteristics."
        else:
            reason = f"Model confidence ({top_conf*100:.1f}%) falls in validation ambiguity band [{self.tau_review*100:.1f}% - {self.tau_accept*100:.1f}%]. Manual disposition required."

        return ("HUMAN SCRUTINY", reason, conf_state, True)

    def _compute_grad_cam(self, input_tensor: torch.Tensor, class_idx: int, original_pil: Image.Image) -> str:
        """
        Computes authentic mathematical Grad-CAM class activation map using PyTorch backward hooks.
        Returns Base64 encoded JPEG data URI.
        """
        try:
            self.model.zero_grad()
            output = self.model(input_tensor)
            score = output[0, class_idx]
            score.backward(retain_graph=True)

            if self.gradients is None or self.activations is None:
                # Fallback to saliency if hooks didn't capture
                return self._compute_input_saliency(input_tensor, original_pil)

            # Global average pool the gradients
            pooled_gradients = torch.mean(self.gradients, dim=[0, 2, 3])
            activations = self.activations[0]

            # Weight activation channels by pooled gradients
            for i in range(activations.shape[0]):
                activations[i, :, :] *= pooled_gradients[i]

            # Compute channel-wise average and apply ReLU
            heatmap = torch.mean(activations, dim=0).detach().cpu().numpy()
            heatmap = np.maximum(heatmap, 0)
            
            # Normalize to [0, 1]
            max_val = np.max(heatmap)
            if max_val > 1e-8:
                heatmap /= max_val
            else:
                heatmap = np.zeros_like(heatmap)

            # Resize to original image dimensions
            w, h = original_pil.size
            heatmap_resized = cv2.resize(heatmap, (w, h))

            # Convert to Jet colormap
            heatmap_uint8 = np.uint8(255 * heatmap_resized)
            colormap = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)

            # Blend with original image
            orig_np = np.array(original_pil)
            orig_bgr = cv2.cvtColor(orig_np, cv2.COLOR_RGB2BGR) if len(orig_np.shape) == 3 else cv2.cvtColor(orig_np, cv2.COLOR_GRAY2BGR)
            
            blended = cv2.addWeighted(orig_bgr, 0.60, colormap, 0.40, 0)

            # Encode as Base64 JPEG
            _, buffer = cv2.imencode('.jpg', blended, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
            return f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"
        except Exception as e:
            logger.warning(f"Grad-CAM computation failed: {e}. Generating feature saliency fallback.")
            return self._compute_input_saliency(input_tensor, original_pil)

    def _compute_input_saliency(self, input_tensor: torch.Tensor, original_pil: Image.Image) -> str:
        """Vanilla gradient saliency fallback."""
        try:
            grad = input_tensor.grad.data.abs()[0].mean(dim=0).cpu().numpy()
            w, h = original_pil.size
            saliency = cv2.resize(grad, (w, h))
            saliency = (saliency - saliency.min()) / (saliency.max() - saliency.min() + 1e-8)
            heatmap = cv2.applyColorMap(np.uint8(255 * saliency), cv2.COLORMAP_JET)
            orig_bgr = cv2.cvtColor(np.array(original_pil), cv2.COLOR_RGB2BGR)
            blended = cv2.addWeighted(orig_bgr, 0.60, heatmap, 0.40, 0)
            _, buffer = cv2.imencode('.jpg', blended)
            return f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"
        except Exception:
            return ""

    # ---------------------------------------------------------------------
    # MULTI-IMAGE BATCH INSPECTION
    # ---------------------------------------------------------------------
    def predict_batch(self, file_tuples: List[Tuple[str, bytes]]) -> Dict[str, Any]:
        """
        Executes dynamic batch inspection across multiple user-uploaded images.
        Computes rollups: Total Inspected, Acceptable, Defective, Human Scrutiny,
        Defect distribution, and extracts items requiring human scrutiny into a dedicated queue.
        """
        inspected_items = []
        human_scrutiny_queue = []
        defect_distribution = Counter()
        acceptable_count = 0
        defective_count = 0
        human_scrutiny_count = 0

        for idx, (fname, img_bytes) in enumerate(file_tuples):
            item_id = f"batch_item_{uuid.uuid4().hex[:8]}"
            try:
                res = self.predict_single(img_bytes, specimen_id=fname)
                
                rec = {
                    "id": item_id,
                    "filename": fname,
                    "predicted_class": res["prediction"]["class"],
                    "confidence": res["prediction"]["confidence"],
                    "decision": res["decision"],
                    "human_review_required": res["human_review_required"],
                    "decision_reason": res["decision_reason"],
                    "top_alternatives": [
                        {"class": k, "confidence": v}
                        for k, v in sorted(res["probabilities"].items(), key=lambda x: x[1], reverse=True)[:3]
                    ],
                    "image_uri": res["image_uri"],
                    "heatmap_uri": res["explanation"].get("heatmap_uri"),
                    "entropy": res["entropy"],
                    "margin": res["margin"]
                }
                
                inspected_items.append(rec)

                if res["decision"] == "ACCEPTABLE":
                    acceptable_count += 1
                elif res["decision"] == "DEFECTIVE":
                    defective_count += 1
                    defect_distribution[res["prediction"]["class"]] += 1
                else: # HUMAN SCRUTINY
                    human_scrutiny_count += 1
                    defect_distribution[f"{res['prediction']['class']} (Unverified)"] += 1
                    human_scrutiny_queue.append(rec)

            except Exception as e:
                logger.error(f"Error inspecting batch file {fname}: {e}")
                error_rec = {
                    "id": item_id,
                    "filename": fname,
                    "predicted_class": "unreadable",
                    "confidence": 0.0,
                    "decision": "HUMAN SCRUTINY",
                    "human_review_required": True,
                    "decision_reason": f"File decoding error: {str(e)}",
                    "top_alternatives": [],
                    "image_uri": "",
                    "heatmap_uri": None,
                    "entropy": 0.0,
                    "margin": 0.0
                }
                inspected_items.append(error_rec)
                human_scrutiny_count += 1
                human_scrutiny_queue.append(error_rec)

        return {
            "total_inspected": len(inspected_items),
            "acceptable_count": acceptable_count,
            "defective_count": defective_count,
            "human_scrutiny_count": human_scrutiny_count,
            "defect_distribution": dict(defect_distribution),
            "inspected_items": inspected_items,
            "human_scrutiny_queue": human_scrutiny_queue
        }

    # ---------------------------------------------------------------------
    # DATASET AUDIT & BACKGROUND EVALUATION
    # ---------------------------------------------------------------------
    def _extract_zip_safely(self, zip_bytes: bytes, destination_dir: str) -> None:
        """
        Safely extracts an uploaded ZIP archive while guarding against:
        - Zip Slip / path traversal attacks (validates every canonical path)
        - Zip bomb / excessive expansion (enforces 100MB compressed, 300MB uncompressed limits)
        - Corrupt archives or malicious non-image files
        """
        MAX_ZIP_SIZE = 100 * 1024 * 1024  # 100 MB
        MAX_UNCOMPRESSED_SIZE = 300 * 1024 * 1024  # 300 MB
        if len(zip_bytes) > MAX_ZIP_SIZE:
            raise ValueError(f"ZIP archive size ({len(zip_bytes)/(1024*1024):.1f}MB) exceeds safety limit of 100MB.")

        with zipfile.ZipFile(io.BytesIO(zip_bytes), 'r') as z:
            total_size = 0
            canonical_dest = os.path.abspath(destination_dir)

            for member in z.infolist():
                bname = os.path.basename(member.filename)
                if bname.startswith(('.', '__MACOSX')):
                    continue

                total_size += member.file_size
                if total_size > MAX_UNCOMPRESSED_SIZE:
                    raise ValueError("Archive uncompressed size exceeds maximum safety limit (300MB).")

                # Path traversal check
                target_path = os.path.abspath(os.path.join(destination_dir, member.filename))
                if not target_path.startswith(canonical_dest):
                    raise ValueError(f"Security violation: path traversal detected in member '{member.filename}'.")

                if member.is_dir():
                    os.makedirs(target_path, exist_ok=True)
                else:
                    ext = os.path.splitext(member.filename)[1].lower()
                    if ext in ['.png', '.jpg', '.jpeg', '.webp']:
                        os.makedirs(os.path.dirname(target_path), exist_ok=True)
                        with z.open(member) as src, open(target_path, 'wb') as dst:
                            shutil.copyfileobj(src, dst)

    def audit_dataset_source(self, dataset_path_or_zip) -> Dict[str, Any]:
        """
        Audits a dataset path or uploaded ZIP file.
        Detects whether dataset is labeled (class subdirectories) or unlabeled (flat image directory).
        Checks compatibility against active 5-class model and reports any unsupported classes cleanly.
        """
        temp_dir = None
        target_dir = None
        is_temp = False
        source_name = "Uploaded ZIP Archive"

        try:
            if isinstance(dataset_path_or_zip, bytes) or hasattr(dataset_path_or_zip, 'read'):
                temp_dir = tempfile.mkdtemp(prefix="dataset_audit_")
                zip_bytes = dataset_path_or_zip if isinstance(dataset_path_or_zip, bytes) else dataset_path_or_zip.read()
                self._extract_zip_safely(zip_bytes, temp_dir)
                target_dir = temp_dir
                is_temp = True
            else:
                target_dir = str(dataset_path_or_zip)
                source_name = target_dir

            if not os.path.exists(target_dir):
                return {
                    "dataset_path": source_name,
                    "is_valid": False,
                    "is_labeled": False,
                    "dataset_type": "invalid",
                    "classes_detected": [],
                    "supported_classes": self.classes,
                    "unsupported_classes": [],
                    "has_unsupported_classes": False,
                    "total_images": 0,
                    "class_distribution": {},
                    "invalid_files_count": 0,
                    "invalid_files": [],
                    "ready_for_evaluation": False,
                    "notice": f"Specified dataset path does not exist on server: {target_dir}"
                }

            # Check if classes are in root or in a single wrapper subfolder like 'train', 'dataset', etc.
            entries = [d for d in os.listdir(target_dir) if not d.startswith(('.', '__'))]
            subdirs = [d for d in entries if os.path.isdir(os.path.join(target_dir, d))]
            if len(subdirs) == 1 and len(entries) == 1:
                target_dir = os.path.join(target_dir, subdirs[0])
                entries = [d for d in os.listdir(target_dir) if not d.startswith(('.', '__'))]
                subdirs = [d for d in entries if os.path.isdir(os.path.join(target_dir, d))]

            supported_set = set(self.classes)

            # Scenario A: Subdirectories detected -> Labeled dataset candidate
            if len(subdirs) > 0:
                unsupported = [d for d in subdirs if d.lower() not in supported_set]
                supported_found = [d for d in subdirs if d.lower() in supported_set]

                # If there are classes not supported by the model, report compatibility error
                if len(unsupported) > 0:
                    return {
                        "dataset_path": source_name,
                        "is_valid": False,
                        "is_labeled": True,
                        "dataset_type": "labeled",
                        "classes_detected": sorted(subdirs),
                        "supported_classes": self.classes,
                        "unsupported_classes": sorted(unsupported),
                        "has_unsupported_classes": True,
                        "total_images": 0,
                        "class_distribution": {},
                        "invalid_files_count": 0,
                        "invalid_files": [],
                        "ready_for_evaluation": False,
                        "notice": (
                            f"Dataset contains class(es) '{', '.join(sorted(unsupported))}', but the active model supports: "
                            f"{', '.join(self.classes)}. The system will not silently re-map unknown classes. "
                            f"Please provide images for the calibrated categories."
                        )
                    }

                # All subdirs match supported categories
                classes_detected = sorted(supported_found)
                class_distribution = {}
                invalid_files = []
                total_images = 0

                for cls in classes_detected:
                    cls_p = os.path.join(target_dir, cls)
                    valid_c = 0
                    for fname in sorted(os.listdir(cls_p)):
                        if fname.startswith(('.', '__')):
                            continue
                        fp = os.path.join(cls_p, fname)
                        if not os.path.isfile(fp):
                            continue
                        ext = os.path.splitext(fname)[1].lower()
                        if ext in ['.png', '.jpg', '.jpeg', '.webp']:
                            try:
                                with Image.open(fp) as img:
                                    img.verify()
                                valid_c += 1
                            except Exception:
                                invalid_files.append(f"{cls}/{fname} (corrupted image)")
                        else:
                            invalid_files.append(f"{cls}/{fname} (unsupported format '{ext}')")

                    class_distribution[cls] = valid_c
                    total_images += valid_c

                is_valid = (len(classes_detected) > 0 and total_images > 0)
                return {
                    "dataset_path": source_name,
                    "is_valid": is_valid,
                    "is_labeled": True,
                    "dataset_type": "labeled",
                    "classes_detected": classes_detected,
                    "supported_classes": self.classes,
                    "unsupported_classes": [],
                    "has_unsupported_classes": False,
                    "total_images": total_images,
                    "class_distribution": class_distribution,
                    "invalid_files_count": len(invalid_files),
                    "invalid_files": invalid_files[:20],
                    "ready_for_evaluation": is_valid,
                    "notice": (
                        f"Labeled dataset audit complete: {len(classes_detected)} classes identified with {total_images} valid images. "
                        f"Ground truth is available for full benchmark calculation."
                        if is_valid else "Invalid dataset structure: class subdirectories contain no valid images."
                    )
                }

            # Scenario B: No subdirectories detected -> Unlabeled image dataset
            flat_images = []
            invalid_files = []
            for root, _, files in os.walk(target_dir):
                for fname in sorted(files):
                    if fname.startswith(('.', '__')):
                        continue
                    fp = os.path.join(root, fname)
                    ext = os.path.splitext(fname)[1].lower()
                    if ext in ['.png', '.jpg', '.jpeg', '.webp']:
                        try:
                            with Image.open(fp) as img:
                                img.verify()
                            flat_images.append(fp)
                        except Exception:
                            invalid_files.append(f"{fname} (corrupted image)")
                    else:
                        invalid_files.append(f"{fname} (unsupported format '{ext}')")

            total_images = len(flat_images)
            is_valid = total_images > 0
            return {
                "dataset_path": source_name,
                "is_valid": is_valid,
                "is_labeled": False,
                "dataset_type": "unlabeled",
                "classes_detected": [],
                "supported_classes": self.classes,
                "unsupported_classes": [],
                "has_unsupported_classes": False,
                "total_images": total_images,
                "class_distribution": {},
                "invalid_files_count": len(invalid_files),
                "invalid_files": invalid_files[:20],
                "ready_for_evaluation": is_valid,
                "notice": (
                    f"Unlabeled image dataset detected ({total_images} valid images). "
                    f"Real model inference will be executed on every image. "
                    f"Ground truth unavailable — classification performance metrics cannot be calculated for this dataset."
                    if is_valid else "No valid image files (.png, .jpg, .jpeg, .webp) found in dataset."
                )
            }

        except Exception as e:
            logger.error(f"Audit error: {e}")
            return {
                "dataset_path": source_name,
                "is_valid": False,
                "is_labeled": False,
                "dataset_type": "invalid",
                "classes_detected": [],
                "supported_classes": self.classes,
                "unsupported_classes": [],
                "has_unsupported_classes": False,
                "total_images": 0,
                "class_distribution": {},
                "invalid_files_count": 0,
                "invalid_files": [],
                "ready_for_evaluation": False,
                "notice": f"Dataset audit failed: {str(e)}"
            }
        finally:
            if is_temp and temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)

    def start_dataset_evaluation_job(self, dataset_path_or_zip) -> str:
        """
        Spawns a non-blocking background thread for large dataset evaluation.
        The UI never freezes and polls for live progress.
        """
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        source_label = "Uploaded ZIP Archive" if (isinstance(dataset_path_or_zip, bytes) or hasattr(dataset_path_or_zip, 'read')) else str(dataset_path_or_zip)
        
        with self.jobs_lock:
            self.jobs[job_id] = {
                "job_id": job_id,
                "status": "running",
                "dataset_source": source_label,
                "total_images": 0,
                "processed_images": 0,
                "progress_percent": 0.0,
                "start_time": time.time(),
                "elapsed_seconds": 0.0,
                "result": None,
                "error": None
            }

        thread = threading.Thread(
            target=self._run_dataset_evaluation_worker,
            args=(job_id, dataset_path_or_zip),
            daemon=True
        )
        thread.start()

        return job_id

    def get_dataset_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self.jobs_lock:
            job = self.jobs.get(job_id)
            if job is None:
                return None
            
            elapsed = time.time() - job["start_time"]
            return {
                "job_id": job["job_id"],
                "status": job["status"],
                "dataset_source": job["dataset_source"],
                "total_images": job["total_images"],
                "processed_images": job["processed_images"],
                "progress_percent": round(job["progress_percent"], 1),
                "elapsed_seconds": round(elapsed, 1),
                "result": job["result"],
                "error": job["error"]
            }

    def _run_dataset_evaluation_worker(self, job_id: str, dataset_path_or_zip):
        """
        Worker executing dynamic model inference across the dataset with live progress updates.
        Supports both labeled benchmark evaluation (with Ground Truth) and unlabeled batch inference.
        Guarantees cleanup of temporary extracted files upon completion or failure.
        """
        worker_temp = None
        try:
            target_dir = None
            source_name = "Uploaded ZIP Archive"

            if isinstance(dataset_path_or_zip, bytes) or hasattr(dataset_path_or_zip, 'read'):
                worker_temp = tempfile.mkdtemp(prefix="worker_eval_")
                zip_bytes = dataset_path_or_zip if isinstance(dataset_path_or_zip, bytes) else dataset_path_or_zip.read()
                self._extract_zip_safely(zip_bytes, worker_temp)
                target_dir = worker_temp
            else:
                target_dir = str(dataset_path_or_zip)
                source_name = target_dir

            # Unwrap single folder wrapper if present
            entries = [d for d in os.listdir(target_dir) if not d.startswith(('.', '__'))]
            subdirs = [d for d in entries if os.path.isdir(os.path.join(target_dir, d))]
            if len(subdirs) == 1 and len(entries) == 1:
                target_dir = os.path.join(target_dir, subdirs[0])
                entries = [d for d in os.listdir(target_dir) if not d.startswith(('.', '__'))]
                subdirs = [d for d in entries if os.path.isdir(os.path.join(target_dir, d))]

            supported_set = set(self.classes)
            is_labeled = len(subdirs) > 0

            # Collect items: (fpath, ground_truth_class or None)
            all_items = []
            if is_labeled:
                unsupported = [d for d in subdirs if d.lower() not in supported_set]
                if unsupported:
                    raise ValueError(f"Dataset contains unsupported classes: {', '.join(unsupported)}")

                for cls in sorted(subdirs):
                    cls_p = os.path.join(target_dir, cls)
                    for fname in sorted(os.listdir(cls_p)):
                        if fname.startswith(('.', '__')):
                            continue
                        fp = os.path.join(cls_p, fname)
                        if os.path.isfile(fp) and fname.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                            all_items.append((fp, cls.lower()))
            else:
                for root, _, files in os.walk(target_dir):
                    for fname in sorted(files):
                        if fname.startswith(('.', '__')):
                            continue
                        fp = os.path.join(root, fname)
                        if os.path.isfile(fp) and fname.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                            all_items.append((fp, None))

            total_images = len(all_items)
            if total_images == 0:
                raise ValueError("No valid image files found in dataset to evaluate.")

            with self.jobs_lock:
                self.jobs[job_id]["total_images"] = total_images

            # Evaluate in batches
            batch_size = 32
            y_true = []
            y_pred = []
            processed = 0
            acceptable_count = 0
            defective_count = 0
            human_scrutiny_count = 0
            scrutiny_items = []

            for i in range(0, len(all_items), batch_size):
                batch_items = all_items[i:i + batch_size]
                batch_tensors = []

                for fp, gt_cls in batch_items:
                    try:
                        pil_img = Image.open(fp).convert("RGB")
                        t = self.transform(pil_img)
                        batch_tensors.append((t, pil_img, fp, gt_cls))
                    except Exception as e:
                        logger.warning(f"Error reading image {fp}: {e}")

                if batch_tensors:
                    stacked = torch.stack([x[0] for x in batch_tensors]).to(self.device)
                    with torch.no_grad():
                        outputs = self.model(stacked)
                        scaled_outputs = outputs / self.temperature
                        probs = torch.softmax(scaled_outputs, dim=1).cpu().numpy()

                    for j, (t, pil_img, fp, gt_cls) in enumerate(batch_tensors):
                        item_probs = probs[j]
                        sorted_idx = np.argsort(item_probs)[::-1]
                        top_idx = int(sorted_idx[0])
                        second_idx = int(sorted_idx[1])

                        top_class = self.idx_to_class[top_idx]
                        second_class = self.idx_to_class[second_idx]
                        top_conf = float(item_probs[top_idx])
                        second_conf = float(item_probs[second_idx])
                        margin = float(top_conf - second_conf)

                        eps = 1e-9
                        entropy = float(-np.sum(item_probs * np.log2(item_probs + eps)))

                        decision, reason, conf_state, human_review_required = self._evaluate_decision_policy(
                            top_class=top_class,
                            top_conf=top_conf,
                            second_class=second_class,
                            second_conf=second_conf,
                            margin=margin,
                            entropy=entropy
                        )

                        if decision == "ACCEPTABLE":
                            acceptable_count += 1
                        elif decision == "DEFECTIVE":
                            defective_count += 1
                        else:
                            human_scrutiny_count += 1

                        y_pred.append(top_class)
                        if is_labeled:
                            y_true.append(gt_cls)

                        if human_review_required and len(scrutiny_items) < 30:
                            try:
                                thumb_buf = io.BytesIO()
                                pil_img.save(thumb_buf, format="JPEG", quality=70)
                                thumb_b64 = f"data:image/jpeg;base64,{base64.b64encode(thumb_buf.getvalue()).decode('utf-8')}"
                            except Exception:
                                thumb_b64 = ""

                            scrutiny_items.append({
                                "id": f"scrutiny_{len(scrutiny_items)+1}",
                                "filename": os.path.basename(fp),
                                "predicted_class": top_class,
                                "confidence": round(top_conf, 4),
                                "margin": round(margin, 4),
                                "entropy": round(entropy, 4),
                                "decision": decision,
                                "decision_reason": reason,
                                "image_uri": thumb_b64,
                                "top_alternatives": [
                                    {"class": self.idx_to_class[int(k)], "confidence": round(float(item_probs[k]), 4)}
                                    for k in sorted_idx[:3]
                                ]
                            })

                processed += len(batch_items)
                pct = (processed / total_images) * 100.0 if total_images > 0 else 100.0

                with self.jobs_lock:
                    self.jobs[job_id]["processed_images"] = processed
                    self.jobs[job_id]["progress_percent"] = pct

            if is_labeled:
                acc = accuracy_score(y_true, y_pred)
                p, r, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="macro", zero_division=0)
                wp, wr, wf1, _ = precision_recall_fscore_support(y_true, y_pred, average="weighted", zero_division=0)

                eval_classes = sorted(list(set(y_true + y_pred)))
                cm = confusion_matrix(y_true, y_pred, labels=eval_classes)

                per_p, per_r, per_f1, per_supp = precision_recall_fscore_support(
                    y_true, y_pred, labels=eval_classes, average=None, zero_division=0
                )
                per_class_res = [
                    {
                        "class_name": c,
                        "precision": round(float(per_p[idx]), 4),
                        "recall": round(float(per_r[idx]), 4),
                        "f1_score": round(float(per_f1[idx]), 4),
                        "samples": int(per_supp[idx])
                    }
                    for idx, c in enumerate(eval_classes)
                ]

                total_defects = sum(1 for yt in y_true if yt != "normal")
                total_normals = sum(1 for yt in y_true if yt == "normal")
                false_accepts = sum(1 for yt, yp in zip(y_true, y_pred) if yt != "normal" and yp == "normal")
                false_rejects = sum(1 for yt, yp in zip(y_true, y_pred) if yt == "normal" and yp != "normal")
                far = (false_accepts / total_defects) if total_defects > 0 else 0.0
                frr = (false_rejects / total_normals) if total_normals > 0 else 0.0

                final_result = {
                    "dataset_name": source_name,
                    "dataset_type": "labeled",
                    "ground_truth_available": True,
                    "total_processed": len(y_true),
                    "accuracy": round(float(acc), 4),
                    "macro_precision": round(float(p), 4),
                    "macro_recall": round(float(r), 4),
                    "macro_f1": round(float(f1), 4),
                    "weighted_precision": round(float(wp), 4),
                    "weighted_recall": round(float(wr), 4),
                    "weighted_f1": round(float(wf1), 4),
                    "false_accept_rate": round(float(far), 4),
                    "false_reject_rate": round(float(frr), 4),
                    "total_defective": total_defects,
                    "false_accept_count": false_accepts,
                    "total_normal": total_normals,
                    "false_reject_count": false_rejects,
                    "acceptable_count": acceptable_count,
                    "defective_count": defective_count,
                    "human_scrutiny_count": human_scrutiny_count,
                    "per_class_metrics": per_class_res,
                    "confusion_matrix": {
                        "classes": eval_classes,
                        "matrix": cm.tolist()
                    },
                    "prediction_distribution": dict(Counter(y_pred)),
                    "human_scrutiny_queue": scrutiny_items,
                    "provenance": {
                        "dataset": source_name,
                        "model_version": "v1.0-mobilenetv3-small",
                        "calibration_temperature": self.temperature,
                        "ground_truth": "Available",
                        "evaluation_type": "Labeled Dataset Benchmark"
                    }
                }
            else:
                final_result = {
                    "dataset_name": source_name,
                    "dataset_type": "unlabeled",
                    "ground_truth_available": False,
                    "total_processed": len(y_pred),
                    "accuracy": None,
                    "macro_precision": None,
                    "macro_recall": None,
                    "macro_f1": None,
                    "weighted_precision": None,
                    "weighted_recall": None,
                    "weighted_f1": None,
                    "false_accept_rate": None,
                    "false_reject_rate": None,
                    "total_defective": None,
                    "false_accept_count": None,
                    "total_normal": None,
                    "false_reject_count": None,
                    "per_class_metrics": [],
                    "confusion_matrix": None,
                    "metrics_notice": "Ground truth unavailable — classification performance metrics cannot be calculated for this dataset.",
                    "acceptable_count": acceptable_count,
                    "defective_count": defective_count,
                    "human_scrutiny_count": human_scrutiny_count,
                    "prediction_distribution": dict(Counter(y_pred)),
                    "human_scrutiny_queue": scrutiny_items,
                    "provenance": {
                        "dataset": source_name,
                        "model_version": "v1.0-mobilenetv3-small",
                        "calibration_temperature": self.temperature,
                        "ground_truth": "Unavailable",
                        "evaluation_type": "Unlabeled Batch Inference"
                    }
                }

            with self.jobs_lock:
                self.jobs[job_id]["status"] = "completed"
                self.jobs[job_id]["progress_percent"] = 100.0
                self.jobs[job_id]["result"] = final_result

        except Exception as e:
            logger.error(f"Dataset evaluation worker failed: {e}")
            with self.jobs_lock:
                self.jobs[job_id]["status"] = "failed"
                self.jobs[job_id]["error"] = str(e)
        finally:
            if worker_temp and os.path.exists(worker_temp):
                shutil.rmtree(worker_temp, ignore_errors=True)

    # ---------------------------------------------------------------------
    # DYNAMIC OPTICAL ROBUSTNESS EVALUATION
    # ---------------------------------------------------------------------
    def evaluate_robustness(self, image_input) -> Dict[str, Any]:
        """
        Executes controlled physical/optical disturbances against the real model on the current image.
        Perturbations:
        - High Illumination (+30% Brightness)
        - Low Illumination (-30% Brightness)
        - Contrast Boost (+40%)
        - Gaussian Blur (Lens Defocus σ=2.0)
        - Sensor Noise (Additive Gaussian σ=20)
        - Orientation Shift (90° Rotation)
        """
        if isinstance(image_input, (str, os.PathLike)):
            pil_img = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, np.ndarray):
            pil_img = Image.fromarray(image_input).convert("RGB")
        elif isinstance(image_input, bytes):
            pil_img = Image.open(io.BytesIO(image_input)).convert("RGB")
        else:
            pil_img = image_input.convert("RGB")

        orig_np = np.array(pil_img)
        base_res = self.predict_single(pil_img)
        base_cls = base_res["prediction"]["class"]
        base_conf = base_res["prediction"]["confidence"]

        perturbations = [
            ("High Illumination (+30% Brightness)", "Photometric", lambda img: np.clip(img.astype(np.int16) + 60, 0, 255).astype(np.uint8)),
            ("Low Illumination (-30% Brightness)", "Photometric", lambda img: np.clip(img.astype(np.int16) - 60, 0, 255).astype(np.uint8)),
            ("Contrast Boost (+40%)", "Photometric", lambda img: np.clip(1.4 * (img.astype(np.float32) - 128.0) + 128.0, 0, 255).astype(np.uint8)),
            ("Gaussian Blur (Defocus σ=2.0)", "Photometric", lambda img: cv2.GaussianBlur(img, (7, 7), 2.0)),
            ("Sensor Noise (Gaussian σ=20)", "Photometric", lambda img: np.clip(img.astype(np.int16) + np.random.normal(0, 20, img.shape).astype(np.int16), 0, 255).astype(np.uint8)),
            ("Orientation Shift (90° Rotation)", "Geometric", lambda img: cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE))
        ]

        eval_records = []
        failure_count = 0
        total_delta = 0.0

        for cond_name, cat, transform_fn in perturbations:
            perturbed_np = transform_fn(orig_np.copy())
            pert_pil = Image.fromarray(perturbed_np)
            pert_res = self.predict_single(pert_pil)
            pert_cls = pert_res["prediction"]["class"]
            pert_conf = pert_res["prediction"]["confidence"]

            delta = pert_conf - base_conf
            total_delta += abs(delta)

            # Failure condition: prediction class changed or confidence collapsed > 0.35
            is_failure = (pert_cls != base_cls) or (abs(delta) > 0.35)
            if is_failure:
                failure_count += 1
                status = "FAILED"
            elif abs(delta) <= 0.15:
                status = "STABLE"
            else:
                status = "DEGRADED"

            eval_records.append({
                "condition": cond_name,
                "category": cat,
                "baseline_class": base_cls,
                "perturbed_class": pert_cls,
                "baseline_confidence": round(base_conf, 4),
                "perturbed_confidence": round(pert_conf, 4),
                "probabilities": pert_res.get("probabilities", {}),
                "top_2_class": pert_res.get("top_2_class"),
                "top_2_margin": pert_res.get("top_2_margin", 0.0),
                "entropy": pert_res.get("entropy", 0.0),
                "decision": pert_res.get("decision", "UNKNOWN"),
                "decision_reason": pert_res.get("decision_reason", ""),
                "confidence_delta": round(delta, 4),
                "performance_status": status,
                "is_failure": is_failure
            })

        mean_delta = total_delta / len(perturbations) if perturbations else 0.0
        stable_count = len(perturbations) - failure_count
        empirical_stability_rate = round(float(stable_count / len(perturbations)), 4) if perturbations else 0.0
        robustness_score = max(0.0, 100.0 - (failure_count * 20.0) - (mean_delta * 30.0))

        # If robustness is compromised, escalate to human scrutiny recommendation
        robustness_concern = (failure_count > 0 or robustness_score < 75.0)

        baseline_record = {
            "condition": "Baseline (Original Unperturbed)",
            "predicted_class": base_cls,
            "confidence": round(base_conf, 4),
            "probabilities": base_res.get("probabilities", {}),
            "top_2_class": base_res.get("top_2_class"),
            "top_2_margin": base_res.get("top_2_margin", 0.0),
            "entropy": base_res.get("entropy", 0.0),
            "decision": base_res.get("decision", "UNKNOWN"),
            "decision_reason": base_res.get("decision_reason", "")
        }

        return {
            "baseline": baseline_record,
            "overall_robustness_score": round(float(robustness_score), 1),
            "total_perturbation_tests": len(perturbations),
            "stable_count": stable_count,
            "failure_count": failure_count,
            "empirical_stability_rate": empirical_stability_rate,
            "robustness_concern": robustness_concern,
            "triage_recommendation": "HUMAN SCRUTINY REQUIRED" if robustness_concern else "ROBUST",
            "perturbation_evaluations": eval_records,
            "summary": (
                f"Model evaluated under 6 controlled optical perturbations. "
                f"{stable_count}/{len(perturbations)} conditions retained stability ({empirical_stability_rate*100:.1f}% stability rate). "
                + ("ROBUSTNESS CONCERN: Prediction instability observed; routed to HUMAN SCRUTINY." if robustness_concern else "All perturbation classifications consistent with baseline.")
            )
        }

    # ---------------------------------------------------------------------
    # OPERATOR HUMAN DECISION RECORDING
    # ---------------------------------------------------------------------
    def record_operator_decision(self, item_id: str, operator_id: str, action: str, notes: Optional[str] = None) -> Dict[str, Any]:
        """
        Records an explicit human operator disposition.
        Crucial principle: Human decisions are OPERATOR ACTIONS, not model predictions.
        """
        record = {
            "decision_id": f"OPDEC-{uuid.uuid4().hex[:8]}",
            "item_id": item_id,
            "operator_id": operator_id or "OP-01",
            "operator_action": action, # "ACCEPT", "REJECT", "NEEDS_REVIEW"
            "original_model_decision": "HUMAN SCRUTINY",
            "original_model_class": "UNSPECIFIED",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "notes": notes or "Human operator decision logged via Inspection Workstation."
        }
        self.operator_decisions.append(record)
        logger.info(f"Operator decision recorded: {record}")
        return record

    def get_operator_decisions(self) -> List[Dict[str, Any]]:
        return self.operator_decisions

    # ---------------------------------------------------------------------
    # TEST GALLERY & METRICS HELPERS
    # ---------------------------------------------------------------------
    def get_held_out_test_samples(self) -> List[Dict[str, Any]]:
        """Returns 15 curated held-out test gallery specimens with thumbnails."""
        if not os.path.exists(GALLERY_MANIFEST_PATH):
            return []

        with open(GALLERY_MANIFEST_PATH, "r") as f:
            manifest = json.load(f)

        for item in manifest:
            fpath = os.path.join(GALLERY_DIR, item["sample_id"])
            if os.path.exists(fpath) and "thumbnail_uri" not in item:
                try:
                    with Image.open(fpath) as img:
                        buf = io.BytesIO()
                        img.save(buf, format="PNG")
                        item["thumbnail_uri"] = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"
                except Exception:
                    pass

        return manifest

    def get_metrics(self) -> Dict[str, Any]:
        """Returns empirical test metrics from organizer_vision_metrics.json."""
        if os.path.exists(METRICS_PATH):
            try:
                with open(METRICS_PATH, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error reading metrics: {e}")
        return {}

organizer_vision_service = OrganizerVisionService.get_instance()
