import pytest
import io
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_organizer_metrics():
    res = client.get("/api/vision/metrics?model_mode=primary")
    assert res.status_code == 200
    data = res.json()
    assert "model_metadata" in data
    assert data["model_metadata"]["classes"] == ["crack", "hole", "normal", "rust", "scratch"]
    assert data["test_performance"]["accuracy"] > 0.99
    assert data["test_performance"]["false_accept_rate"] == 0.0
    assert data["test_performance"]["false_reject_rate"] == 0.0

def test_organizer_test_samples():
    res = client.get("/api/vision/test-samples?model_mode=primary")
    assert res.status_code == 200
    samples = res.json()
    assert len(samples) == 15
    classes = {s["ground_truth_class"] for s in samples}
    assert classes == {"crack", "hole", "normal", "rust", "scratch"}

def test_organizer_inspect_held_out():
    res = client.post("/api/vision/inspect", data={"specimen_name": "crack_test_sample_1.png", "model_mode": "primary"})
    assert res.status_code == 200
    data = res.json()
    assert data["predicted_class"] == "crack"
    assert data["decision_state"] == "DEFECTIVE"
    assert data["decision"] == "REJECT"
    assert data["confidence"] > 0.90
    assert data["heatmap_uri"].startswith("data:image/")

def test_organizer_inspect_upload():
    # Create test 256x256 image in-memory
    img = Image.new("L", (256, 256), color=128)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    files = {"file": ("uploaded_test.png", buf.getvalue(), "image/png")}
    res = client.post("/api/vision/inspect", files=files, data={"model_mode": "primary"})
    assert res.status_code == 200
    data = res.json()
    assert "predicted_class" in data
    assert "confidence" in data
    assert data["heatmap_uri"].startswith("data:image/")

def test_organizer_batch_inspect():
    img1 = Image.new("L", (256, 256), color=50)
    buf1 = io.BytesIO()
    img1.save(buf1, format="PNG")

    img2 = Image.new("L", (256, 256), color=200)
    buf2 = io.BytesIO()
    img2.save(buf2, format="PNG")

    files = [
        ("files", ("batch_img1.png", buf1.getvalue(), "image/png")),
        ("files", ("batch_img2.png", buf2.getvalue(), "image/png"))
    ]
    res = client.post("/api/vision/inspect-batch", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["total_inspected"] == 2
    assert len(data["inspected_items"]) == 2
    assert "defect_distribution" in data

def test_organizer_audit_dataset():
    res = client.post("/api/vision/audit-dataset", data={"dataset_path": r"C:\Users\SHAMSREENIR\OneDrive\Desktop\train\train"})
    assert res.status_code == 200
    data = res.json()
    assert data["is_valid"] is True
    assert data["total_images"] == 12000
    assert set(data["classes_detected"]) == {"crack", "hole", "normal", "rust", "scratch"}

def test_organizer_operator_decision():
    req = {
        "item_id": "test_item_001",
        "operator_id": "OP-99",
        "operator_action": "ACCEPT",
        "notes": "Verified hairline contour is benign surface texture."
    }
    res = client.post("/api/vision/operator-decision", json=req)
    assert res.status_code == 200
    data = res.json()
    assert data["operator_action"] == "ACCEPT"
    assert data["operator_id"] == "OP-99"

    # Verify audit retrieval
    res_list = client.get("/api/vision/operator-decisions")
    assert res_list.status_code == 200
    log = res_list.json()
    assert len(log) > 0
    assert any(d["item_id"] == "test_item_001" for d in log)

def test_organizer_robustness():
    res = client.post("/api/vision/robustness", data={"specimen_name": "crack_test_sample_1.png", "model_mode": "primary"})
    assert res.status_code == 200
    data = res.json()
    assert "overall_robustness_score" in data
    assert len(data["perturbation_evaluations"]) == 6
