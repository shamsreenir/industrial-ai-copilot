"""
Legacy tests for prototype simulation, economics, and recommendations modules.
Isolated from the primary Checkpoint 3 test suite.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_legacy_bottlenecks():
    response = client.get("/api/bottlenecks")
    assert response.status_code == 200
    data = response.json()
    assert data["primary_bottleneck"] == "Assembly Cell 1"
    assert len(data["nodes"]) > 0

def test_legacy_economics():
    response = client.get("/api/economics")
    assert response.status_code == 200
    data = response.json()
    assert data["is_simulated_assumption"] is True
    assert len(data["formula_trace"]) > 0
    assert data["total_daily_loss"] > 0

def test_legacy_simulation():
    req = {
        "interventions": [
            {"station_name": "Assembly Cell 1", "parameter_modified": "cycle_time", "percent_change": -15.0}
        ]
    }
    response = client.post("/api/simulate", json=req)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["throughput"]["delta"] > 0
    assert data["estimated_profit"]["delta"] > 0

def test_legacy_recommendations():
    response = client.get("/api/recommendations")
    assert response.status_code == 200
    data = response.json()
    assert len(data["recommendations"]) > 0
    assert data["recommendations"][0]["confidence"] in ["High", "Medium", "Low"]
