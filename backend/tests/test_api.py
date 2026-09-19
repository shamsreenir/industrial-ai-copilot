import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "Industrial AI Copilot" in data["service"]

def test_data_status():
    response = client.get("/api/data-status")
    assert response.status_code == 200
    data = response.json()
    assert "capabilities" in data
    assert data["has_image_data"] is False
    assert len(data["capabilities"]) > 0

def test_overview():
    response = client.get("/api/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_products_produced" in data
    assert data["total_products_produced"] > 0
    assert len(data["stations"]) > 0
    assert data["active_bottleneck"] != ""

def test_inspect_sample():
    response = client.post("/api/inspect", json={"sample_index": 10, "decision_threshold": 0.65})
    assert response.status_code == 200
    data = response.json()
    assert "decision" in data
    assert data["decision"] in ["ACCEPT", "REJECT", "UNCERTAIN / RE-INSPECT"]
    assert "anomaly_score" in data
    assert 0.0 <= data["anomaly_score"] <= 1.0

def test_defects_tradeoff():
    response = client.get("/api/defects?threshold=0.65")
    assert response.status_code == 200
    data = response.json()
    assert "tradeoff_curve" in data
    assert len(data["tradeoff_curve"]) > 0
    assert "confusion_matrix" in data

def test_root_cause():
    response = client.get("/api/root-cause")
    assert response.status_code == 200
    data = response.json()
    assert "top_contributing_factors" in data
    assert len(data["top_contributing_factors"]) > 0

if __name__ == "__main__":
    test_root()
    test_data_status()
    test_overview()
    test_inspect_sample()
    test_defects_tradeoff()
    test_root_cause()
    print("All core API tests PASSED successfully!")
