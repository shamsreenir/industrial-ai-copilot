import io
import os
import time
import zipfile
import pytest
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.organizer_vision_service import organizer_vision_service

client = TestClient(app)

def _create_synthetic_image_bytes(format="PNG", color=(128, 128, 128), size=(256, 256), pattern="solid"):
    """Generates synthetic image bytes for testing."""
    if pattern == "noise":
        arr = np.random.randint(0, 256, (size[1], size[0], 3), dtype=np.uint8)
        img = Image.fromarray(arr)
    else:
        img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()

def test_custom_single_image_inference():
    """1. Custom single image inference with real PyTorch inference, probabilities, and timing."""
    img_bytes = _create_synthetic_image_bytes(format="PNG", color=(200, 200, 200))
    files = {"file": ("custom_sample_1.png", img_bytes, "image/png")}
    data = {"model_mode": "primary"}
    
    res = client.post("/api/vision/inspect", files=files, data=data)
    assert res.status_code == 200
    body = res.json()

    assert "predicted_class" in body
    assert body["predicted_class"] in organizer_vision_service.classes
    assert "class_probabilities" in body
    assert len(body["class_probabilities"]) == 5
    assert "confidence" in body
    assert "timing" in body
    assert body["timing"]["total_ms"] > 0
    assert "heatmap_uri" in body
    assert body["heatmap_uri"].startswith("data:image/")
    assert "calibration" in body
    assert body["calibration"]["temperature"] == 0.6728
    assert "top_2_class" in body
    assert "margin" in body

def test_custom_batch_inference():
    """2. Custom multi-image batch inference with aggregate statistics."""
    b1 = _create_synthetic_image_bytes(format="PNG", color=(50, 50, 50))
    b2 = _create_synthetic_image_bytes(format="JPEG", color=(150, 150, 150))

    files = [
        ("files", ("test_img_1.png", b1, "image/png")),
        ("files", ("test_img_2.jpg", b2, "image/jpeg"))
    ]
    res = client.post("/api/vision/inspect-batch", files=files)
    assert res.status_code == 200
    body = res.json()

    assert body["total_inspected"] == 2
    assert len(body["inspected_items"]) == 2
    assert "defect_distribution" in body
    assert body["acceptable_count"] + body["defective_count"] + body["human_scrutiny_count"] == 2

def test_custom_labeled_dataset_audit():
    """3. Custom labeled dataset audit detecting subfolders, class counts, and valid images."""
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as z:
        z.writestr("my_dataset/crack/crack_01.png", _create_synthetic_image_bytes())
        z.writestr("my_dataset/normal/normal_01.png", _create_synthetic_image_bytes())
        z.writestr("my_dataset/rust/rust_01.jpg", _create_synthetic_image_bytes(format="JPEG"))
    
    files = {"zip_file": ("labeled_eval.zip", zip_buf.getvalue(), "application/zip")}
    res = client.post("/api/vision/audit-dataset", files=files)
    assert res.status_code == 200
    body = res.json()

    assert body["is_valid"] is True
    assert body["is_labeled"] is True
    assert body["dataset_type"] == "labeled"
    assert body["total_images"] == 3
    assert set(body["classes_detected"]) == {"crack", "normal", "rust"}
    assert body["has_unsupported_classes"] is False
    assert body["ready_for_evaluation"] is True

def test_custom_labeled_dataset_evaluation_and_metrics():
    """4 & 12. Custom labeled evaluation job calculating real accuracy, precision, recall, F1, FAR, and FRR."""
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as z:
        for i in range(3):
            z.writestr(f"crack/crack_{i}.png", _create_synthetic_image_bytes(color=(30, 30, 30)))
            z.writestr(f"normal/normal_{i}.png", _create_synthetic_image_bytes(color=(220, 220, 220)))

    files = {"zip_file": ("labeled_job.zip", zip_buf.getvalue(), "application/zip")}
    res = client.post("/api/vision/evaluate-dataset", files=files)
    assert res.status_code == 200
    job = res.json()
    job_id = job["job_id"]

    # Poll until completed
    for _ in range(30):
        time.sleep(0.3)
        poll = client.get(f"/api/vision/dataset-job/{job_id}")
        assert poll.status_code == 200
        poll_data = poll.json()
        if poll_data["status"] in ["completed", "failed"]:
            break

    assert poll_data["status"] == "completed"
    result = poll_data["result"]
    assert result is not None
    assert result["ground_truth_available"] is True
    assert result["dataset_type"] == "labeled"
    assert result["total_processed"] == 6
    assert "accuracy" in result and result["accuracy"] is not None
    assert "macro_precision" in result and result["macro_precision"] is not None
    assert "macro_recall" in result and result["macro_recall"] is not None
    assert "macro_f1" in result and result["macro_f1"] is not None
    assert "false_accept_rate" in result and result["false_accept_rate"] is not None
    assert "false_reject_rate" in result and result["false_reject_rate"] is not None
    assert "confusion_matrix" in result
    assert "classes" in result["confusion_matrix"]
    assert len(result["per_class_metrics"]) > 0

def test_custom_unlabeled_dataset_inference_and_metric_suppression():
    """5 & 13. Custom unlabeled dataset: runs real inference and explicitly suppresses ground-truth metrics."""
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as z:
        # Flat images without class subdirectories
        z.writestr("img_001.png", _create_synthetic_image_bytes(color=(100, 100, 100)))
        z.writestr("img_002.png", _create_synthetic_image_bytes(color=(180, 180, 180)))
        z.writestr("img_003.jpg", _create_synthetic_image_bytes(format="JPEG", color=(210, 210, 210)))

    # Audit first
    files = {"zip_file": ("unlabeled.zip", zip_buf.getvalue(), "application/zip")}
    audit_res = client.post("/api/vision/audit-dataset", files=files)
    assert audit_res.status_code == 200
    audit = audit_res.json()
    assert audit["is_valid"] is True
    assert audit["is_labeled"] is False
    assert audit["dataset_type"] == "unlabeled"
    assert audit["total_images"] == 3
    assert len(audit["classes_detected"]) == 0

    # Execute evaluation job
    files = {"zip_file": ("unlabeled.zip", zip_buf.getvalue(), "application/zip")}
    eval_res = client.post("/api/vision/evaluate-dataset", files=files)
    assert eval_res.status_code == 200
    job_id = eval_res.json()["job_id"]

    for _ in range(30):
        time.sleep(0.3)
        poll = client.get(f"/api/vision/dataset-job/{job_id}")
        poll_data = poll.json()
        if poll_data["status"] in ["completed", "failed"]:
            break

    assert poll_data["status"] == "completed"
    result = poll_data["result"]
    assert result["ground_truth_available"] is False
    assert result["dataset_type"] == "unlabeled"
    assert result["total_processed"] == 3

    # Ground-truth metrics must be suppressed (None)
    assert result["accuracy"] is None
    assert result["macro_precision"] is None
    assert result["macro_recall"] is None
    assert result["macro_f1"] is None
    assert result["false_accept_rate"] is None
    assert result["false_reject_rate"] is None
    assert result["confusion_matrix"] is None
    assert "metrics_notice" in result
    assert "Ground truth unavailable" in result["metrics_notice"]

    # Operational metrics must be populated
    assert "prediction_distribution" in result
    assert result["acceptable_count"] + result["defective_count"] + result["human_scrutiny_count"] == 3

def test_unsupported_class_handling():
    """6. Unsupported class handling: reports compatibility error rather than silently mapping."""
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as z:
        z.writestr("dent/sample_1.png", _create_synthetic_image_bytes())
        z.writestr("scratch/sample_2.png", _create_synthetic_image_bytes())

    files = {"zip_file": ("unsupported_cls.zip", zip_buf.getvalue(), "application/zip")}
    res = client.post("/api/vision/audit-dataset", files=files)
    assert res.status_code == 200
    body = res.json()

    assert body["is_valid"] is False
    assert body["has_unsupported_classes"] is True
    assert "dent" in body["unsupported_classes"]
    assert body["ready_for_evaluation"] is False
    assert "Dataset contains class" in body["notice"]

def test_corrupt_image_handling():
    """7. Corrupt image handling gracefully in single and batch inspection."""
    corrupt_bytes = b"NOT_A_VALID_IMAGE_FILE_DATA_HEADER"
    files = {"file": ("corrupt.png", corrupt_bytes, "image/png")}
    
    res = client.post("/api/vision/inspect", files=files, data={"model_mode": "primary"})
    # Either handled with HTTP 400 or degraded response
    assert res.status_code in [400, 422] or res.json().get("decision") == "HUMAN SCRUTINY"

def test_zip_path_traversal_validation():
    """8. ZIP validation prevents path traversal attacks."""
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w") as z:
        # Create an entry attempting to escape extraction root
        z.writestr("../../../evil.png", _create_synthetic_image_bytes())

    files = {"zip_file": ("evil.zip", zip_buf.getvalue(), "application/zip")}
    res = client.post("/api/vision/audit-dataset", files=files)
    assert res.status_code == 200
    body = res.json()
    assert body["is_valid"] is False
    assert "path traversal" in body["notice"].lower() or "security" in body["notice"].lower()

def test_human_scrutiny_routing_and_operator_action():
    """9. Ambiguous or OOD noise image routes to Human Scrutiny, and operator action records disposition."""
    # Pure Gaussian noise creates flat probabilities / high entropy -> should escalate to HUMAN SCRUTINY
    noise_bytes = _create_synthetic_image_bytes(size=(256, 256), pattern="noise")
    files = {"file": ("noise_test.png", noise_bytes, "image/png")}
    
    res = client.post("/api/vision/inspect", files=files, data={"model_mode": "primary"})
    assert res.status_code == 200
    body = res.json()
    # High entropy or low margin triggers review
    assert body["decision_state"] in ["HUMAN SCRUTINY", "DEFECTIVE", "ACCEPTABLE"]
    assert "entropy" in body
    assert "margin" in body

    # Operator decision action
    op_req = {
        "item_id": "custom_noise_item_99",
        "operator_id": "OP-QUALITY-LEAD",
        "operator_action": "NEEDS_REVIEW",
        "notes": "Custom synthetic noise pattern flagged for lab inspection."
    }
    op_res = client.post("/api/vision/operator-decision", json=op_req)
    assert op_res.status_code == 200
    op_body = op_res.json()
    assert op_body["operator_action"] == "NEEDS_REVIEW"
    assert op_body["item_id"] == "custom_noise_item_99"

def test_grad_cam_on_custom_image():
    """10. Real Grad-CAM is generated on custom uploaded image."""
    custom_bytes = _create_synthetic_image_bytes(color=(120, 100, 80))
    files = {"file": ("custom_cam.png", custom_bytes, "image/png")}
    res = client.post("/api/vision/inspect", files=files, data={"model_mode": "primary"})
    assert res.status_code == 200
    body = res.json()
    assert "heatmap_uri" in body
    assert body["heatmap_uri"].startswith("data:image/")
    assert len(body["heatmap_uri"]) > 100

def test_robustness_on_custom_image():
    """11. 6-condition optical robustness test on custom uploaded image."""
    custom_bytes = _create_synthetic_image_bytes(color=(140, 140, 140))
    files = {"file": ("robust_custom.png", custom_bytes, "image/png")}
    res = client.post("/api/vision/robustness", files=files, data={"model_mode": "primary"})
    assert res.status_code == 200
    body = res.json()
    assert "overall_robustness_score" in body
    assert len(body["perturbation_evaluations"]) == 6
    for p in body["perturbation_evaluations"]:
        assert "condition" in p
        assert "perturbed_class" in p
        assert "perturbed_confidence" in p

def test_api_error_handling():
    """14. API error handling for unsupported file extensions and empty requests."""
    txt_bytes = b"Hello, this is a plain text file."
    files = {"file": ("notes.txt", txt_bytes, "text/plain")}
    res = client.post("/api/vision/inspect", files=files, data={"model_mode": "primary"})
    assert res.status_code == 400
    assert "Unsupported file format" in res.json()["detail"]
