import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.main import app
from backend.models import User
from backend.database import SessionLocal

client = TestClient(app)

def test_verify_firebase_token_invalid():
    from backend.firebase_auth import verify_firebase_token
    # Invalid token string should return None safely without crashing
    assert verify_firebase_token("invalid-token-string") is None

def test_firebase_authenticated_request_mocked():
    fake_firebase_token = "mock-firebase-id-token"
    mock_decoded = {
        "uid": "fb_user_test_12345",
        "email": "firebase_student@college.edu",
        "name": "Firebase Student",
        "admin": False
    }

    with patch("backend.auth.verify_firebase_token", return_value=mock_decoded):
        headers = {"Authorization": f"Bearer {fake_firebase_token}"}

        # 1. Test /api/auth/me automatically registers and returns user
        res = client.get("/api/auth/me", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["email"] == "firebase_student@college.edu"
        assert data["role"] == "user"
        assert data["firebase_uid"] == "fb_user_test_12345"

        # 2. Test /api/auth/sync
        sync_res = client.post("/api/auth/sync", json={"name": "Firebase Student Updated"}, headers=headers)
        assert sync_res.status_code == 200
        assert sync_res.json()["name"] == "Firebase Student Updated"

        # 3. Test submitting complaint with Firebase identity
        comp_res = client.post("/api/complaints", json={
            "title": "Water dripping from AC in lab 202",
            "description": "Continuous water leakage onto the electrical computer tables.",
            "location": "Science Block B - Lab 104",
            "affected_count": 25,
            "duration_days": 1
        }, headers=headers)
        assert comp_res.status_code == 201
        public_id = comp_res.json()["public_id"]

        # 4. Test tracking own complaint
        track_res = client.get(f"/api/complaints/{public_id}", headers=headers)
        assert track_res.status_code == 200
        assert track_res.json()["public_id"] == public_id

def test_firebase_admin_privileges_mocked():
    fake_firebase_admin_token = "mock-firebase-admin-id-token"
    mock_decoded_admin = {
        "uid": "fb_admin_test_99999",
        "email": "admin@complainai.ai",
        "name": "Admin Prof. Kumar",
        "admin": True
    }

    with patch("backend.auth.verify_firebase_token", return_value=mock_decoded_admin):
        headers = {"Authorization": f"Bearer {fake_firebase_admin_token}"}

        # Admin can access admin console
        res = client.get("/api/admin/complaints", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "items" in data or "complaints" in data
