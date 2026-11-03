import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_check():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["classifier_status"] == "loaded"

def test_login_demo_admin():
    res = client.post("/api/auth/login", json={
        "email": "admin@complainai.ai",
        "password": "Admin@ComplainAI2026!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"

def test_login_invalid_password():
    res = client.post("/api/auth/login", json={
        "email": "admin@complainai.ai",
        "password": "WrongPassword123"
    })
    assert res.status_code == 401

import uuid

def test_register_new_user():
    random_email = f"user_{uuid.uuid4().hex[:8]}@college.edu"
    res = client.post("/api/auth/register", json={
        "name": "Test User",
        "email": random_email,
        "password": "SecretPassword123"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["user"]["role"] == "user"
    assert "access_token" in data

def test_ai_classification_endpoint():
    res = client.post("/api/ai/classify", json={
        "title": "Severe electric shock from laboratory switchboard",
        "description": "The switchboard near table 4 gave an electrical shock to a student. Live wire exposed and sparking."
    })
    assert res.status_code == 200
    data = res.json()
    assert data["predicted_category"] == "Electrical and lighting"
    assert data["confidence"] > 0.25
    assert len(data["influential_features"]) > 0

def test_ai_priority_prediction_critical_safety():
    res = client.post("/api/ai/predict-priority", json={
        "title": "Live bare wire sparking in auditorium",
        "description": "Exposed high voltage cables sparking with smoke near exit doors.",
        "location": "Auditorium & Seminar Hall",
        "affected_count": 500,
        "duration_days": 1
    })
    assert res.status_code == 200
    data = res.json()
    assert data["recommended_priority"] == "Critical"
    assert data["requires_immediate_review"] is True
    assert data["score"] >= 80

def test_ai_priority_prediction_low_issue():
    res = client.post("/api/ai/predict-priority", json={
        "title": "Notice board corner loose",
        "description": "Small thumb tack missing on the club notice board on wall.",
        "location": "Corridor 1",
        "affected_count": 1,
        "duration_days": 1
    })
    assert res.status_code == 200
    data = res.json()
    assert data["recommended_priority"] in ["Low", "Medium"]

def test_submit_complaint_and_track():
    payload = {
        "title": "Choked urinal drain leaking foul water across washroom floor",
        "description": "The floor drain in ground floor gents washroom is heavily choked and dirty wastewater is flooding out.",
        "location": "Main Academic Block - 1st Floor",
        "category": None,
        "affected_count": 100,
        "duration_days": 2,
        "user_email": "student@complainai.ai"
    }
    res = client.post("/api/complaints", json=payload)
    assert res.status_code == 201
    comp = res.json()
    assert comp["public_id"].startswith("RX-2026-")
    assert comp["predicted_category"] == "Plumbing and sanitation"
    assert comp["status"] == "Submitted"
    public_id = comp["public_id"]

    track_res = client.get(f"/api/complaints/{public_id}")
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["public_id"] == public_id
    assert track_data["category"] == "Plumbing and sanitation"
    assert len(track_data["history"]) >= 1

def test_admin_status_transitions_and_override():
    login_res = client.post("/api/auth/login", json={
        "email": "admin@complainai.ai",
        "password": "Admin@ComplainAI2026!"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    submit_res = client.post("/api/complaints", json={
        "title": "Broken window pane in classroom 204",
        "description": "Glass shard cracked and dangerous during high winds in lecture room.",
        "location": "Main Academic Block - 2nd Floor",
        "user_email": "student@complainai.ai"
    })
    public_id = submit_res.json()["public_id"]

    # Invalid Transition (Submitted -> Resolved directly should fail with 400)
    invalid_res = client.patch(
        f"/api/admin/complaints/{public_id}/status",
        json={"status": "Resolved", "resolution_notes": "Attempting jump"},
        headers=headers
    )
    assert invalid_res.status_code == 400

    # Valid Transition: Submitted -> Under Review
    step1 = client.patch(
        f"/api/admin/complaints/{public_id}/status",
        json={"status": "Under Review", "note": "Verified by floor warden"},
        headers=headers
    )
    assert step1.status_code == 200
    assert step1.json()["status"] == "Under Review"

    # Assign Department
    assign_res = client.patch(
        f"/api/admin/complaints/{public_id}/assign",
        json={"department": "Carpentry & Glazing Works", "note": "Glass replacement queued"},
        headers=headers
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["assigned_department"] == "Carpentry & Glazing Works"

    # Override Priority
    prio_res = client.patch(
        f"/api/admin/complaints/{public_id}/priority",
        json={"priority": "High", "reason": "Immediate hazard to students in front row"},
        headers=headers
    )
    assert prio_res.status_code == 200
    assert prio_res.json()["final_priority"] == "High"

    # Check history has all audited steps
    hist_res = client.get(f"/api/complaints/{public_id}/history")
    assert hist_res.status_code == 200
    history_list = hist_res.json()
    assert len(history_list) >= 3

def test_analytics_endpoints():
    res = client.get("/api/analytics/summary")
    assert res.status_code == 200
    summary = res.json()
    assert summary["total_complaints"] > 0
    assert "open_complaints" in summary

    cats = client.get("/api/analytics/categories")
    assert cats.status_code == 200
    assert len(cats.json()) > 0

    stats = client.get("/api/analytics/statuses")
    assert stats.status_code == 200

    prios = client.get("/api/analytics/priorities")
    assert prios.status_code == 200
