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

def get_auth_token(email="student@complainai.ai", password="Student@ComplainAI2026!"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]

def test_unauthenticated_requests_blocked():
    # Anonymous submit complaint is rejected with 401
    res = client.post("/api/complaints", json={"title": "Test", "description": "Test"})
    assert res.status_code == 401

    # Anonymous AI classification is rejected with 401
    res = client.post("/api/ai/classify", json={"title": "Test", "description": "Test"})
    assert res.status_code == 401

    # Anonymous complaint tracking is rejected with 401
    res = client.get("/api/complaints/RX-2026-ELE001")
    assert res.status_code == 401

def test_ai_classification_endpoint():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post("/api/ai/classify", json={
        "title": "Severe electric shock from laboratory switchboard",
        "description": "The switchboard near table 4 gave an electrical shock to a student. Live wire exposed and sparking."
    }, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["predicted_category"] == "Electrical and lighting"
    assert data["confidence"] > 0.25
    assert len(data["influential_features"]) > 0

def test_ai_priority_prediction_critical_safety():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post("/api/ai/predict-priority", json={
        "title": "Live bare wire sparking in auditorium",
        "description": "Exposed high voltage cables sparking with smoke near exit doors.",
        "location": "Auditorium & Seminar Hall",
        "affected_count": 500,
        "duration_days": 1
    }, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["recommended_priority"] == "Critical"
    assert data["requires_immediate_review"] is True
    assert data["score"] >= 80

def test_ai_priority_prediction_low_issue():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    res = client.post("/api/ai/predict-priority", json={
        "title": "Notice board corner loose",
        "description": "Small thumb tack missing on the club notice board on wall.",
        "location": "Corridor 1",
        "affected_count": 1,
        "duration_days": 1
    }, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["recommended_priority"] in ["Low", "Medium"]

def test_submit_complaint_and_track():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "title": "Choked urinal drain leaking foul water across washroom floor",
        "description": "The floor drain in ground floor gents washroom is heavily choked and dirty wastewater is flooding out.",
        "location": "Main Academic Block - 1st Floor",
        "category": None,
        "affected_count": 100,
        "duration_days": 2,
        "user_email": "student@complainai.ai"
    }
    res = client.post("/api/complaints", json=payload, headers=headers)
    assert res.status_code == 201
    comp = res.json()
    assert comp["public_id"].startswith("RX-2026-")
    assert comp["predicted_category"] == "Plumbing and sanitation"
    assert comp["status"] == "Submitted"
    public_id = comp["public_id"]

    track_res = client.get(f"/api/complaints/{public_id}", headers=headers)
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["public_id"] == public_id
    assert track_data["category"] == "Plumbing and sanitation"
    assert len(track_data["history"]) >= 1

def test_user_complaint_privacy_isolation():
    student_token = get_auth_token("student@complainai.ai", "Student@ComplainAI2026!")
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Submit a complaint as student
    res = client.post("/api/complaints", json={
        "title": "Private room lock broken in hostel",
        "description": "Room door latch broke and student cannot secure luggage.",
        "location": "Boys Hostel 1",
        "affected_count": 1,
        "duration_days": 1
    }, headers=student_headers)
    assert res.status_code == 201
    public_id = res.json()["public_id"]

    # Register another regular student
    other_email = f"other_{uuid.uuid4().hex[:6]}@college.edu"
    reg_res = client.post("/api/auth/register", json={
        "name": "Other Student",
        "email": other_email,
        "password": "Password123!"
    })
    assert reg_res.status_code == 201
    other_token = reg_res.json()["access_token"]
    other_headers = {"Authorization": f"Bearer {other_token}"}

    # Other student cannot access first student's private complaint -> 403 Forbidden
    other_get = client.get(f"/api/complaints/{public_id}", headers=other_headers)
    assert other_get.status_code == 403

    # Admin CAN access any complaint
    admin_token = get_auth_token("admin@complainai.ai", "Admin@ComplainAI2026!")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    admin_get = client.get(f"/api/complaints/{public_id}", headers=admin_headers)
    assert admin_get.status_code == 200

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
    }, headers=headers)
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

    # Priority verification with same priority and justification note (e.g. "Done Work")
    same_prio_res = client.patch(
        f"/api/admin/complaints/{public_id}/priority",
        json={"priority": "High", "reason": "Done Work - Verified electrical safety"},
        headers=headers
    )
    assert same_prio_res.status_code == 200
    assert same_prio_res.json()["final_priority"] == "High"

    # Category override to new category
    cat_res = client.patch(
        f"/api/admin/complaints/{public_id}/category",
        json={"category": "Civil Infrastructure & Structural Maintenance", "reason": "Window frame masonry broken"},
        headers=headers
    )
    assert cat_res.status_code == 200
    assert cat_res.json()["category"] == "Civil Infrastructure & Structural Maintenance"

    # Category verification with same category and audit note
    same_cat_res = client.patch(
        f"/api/admin/complaints/{public_id}/category",
        json={"category": "Civil Infrastructure & Structural Maintenance", "reason": "Verified by chief engineer"},
        headers=headers
    )
    assert same_cat_res.status_code == 200

    # Check history has all audited steps
    hist_res = client.get(f"/api/complaints/{public_id}/history", headers=headers)
    assert hist_res.status_code == 200
    history_list = hist_res.json()
    assert len(history_list) >= 5
    notes = [h["note"] for h in history_list if h["note"]]
    assert any("Done Work" in n for n in notes)
    assert any("Civil Infrastructure" in n for n in notes)

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

def test_auto_category_classification_and_immediate_dashboard_listing():
    student_token = get_auth_token("student@complainai.ai", "Student@ComplainAI2026!")
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 1. Submit complaint with auto category prediction
    unique_marker = uuid.uuid4().hex[:6]
    title = f"Exposed electrical wires sparking near staircase {unique_marker}"
    desc = "Exposed electrical wires are hanging from the ceiling near the staircase. The wires are sparking intermittently."
    
    payload = {
        "title": title,
        "description": desc,
        "location": "Main Academic Block - 2nd Floor",
        "category": None,
        "affected_count": 150,
        "duration_days": 1,
        "user_email": "student@complainai.ai"
    }
    
    res = client.post("/api/complaints", json=payload, headers=student_headers)
    assert res.status_code == 201
    comp = res.json()
    assert comp["category"] == "Electrical and lighting"
    assert comp["predicted_category"] == "Electrical and lighting"
    assert comp["status"] == "Submitted"
    pub_id = comp["public_id"]

    # 2. Verify Deduplication: immediate resubmission within 30s returns identical record
    res_dup = client.post("/api/complaints", json=payload, headers=student_headers)
    assert res_dup.status_code in [200, 201]
    assert res_dup.json()["public_id"] == pub_id

    # 3. Verify user complaints listing includes the newly lodged complaint immediately
    list_res = client.get("/api/complaints", headers=student_headers)
    assert list_res.status_code == 200
    user_comps = list_res.json()
    matching = [c for c in user_comps if c["public_id"] == pub_id]
    assert len(matching) == 1
    assert matching[0]["category"] == "Electrical and lighting"

    # 4. Manual override category test
    manual_marker = uuid.uuid4().hex[:6]
    manual_payload = {
        "title": f"Room heater short circuit {manual_marker}",
        "description": "Room heater cord shorted out in dorm room.",
        "location": "Boys Hostel 2",
        "category": "Hostel and accommodation",
        "affected_count": 2,
        "duration_days": 1,
        "user_email": "student@complainai.ai"
    }
    res_manual = client.post("/api/complaints", json=manual_payload, headers=student_headers)
    assert res_manual.status_code == 201
    assert res_manual.json()["category"] == "Hostel and accommodation"

def test_facility_admin_portal_access_and_lifecycle_updates():
    # 1. Verify student account receives 403 Forbidden on Admin endpoints
    student_token = get_auth_token("student@complainai.ai", "Student@ComplainAI2026!")
    student_headers = {"Authorization": f"Bearer {student_token}"}
    student_admin_res = client.get("/api/admin/complaints", headers=student_headers)
    assert student_admin_res.status_code == 403
    assert "Administrative privileges required" in student_admin_res.json()["detail"]

    # 2. Verify authorized administrator can access Admin complaints list
    admin_token = get_auth_token("admin@complainai.ai", "Admin@ComplainAI2026!")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    admin_res = client.get("/api/admin/complaints", headers=admin_headers)
    assert admin_res.status_code == 200
    admin_data = admin_res.json()
    assert "items" in admin_data
    assert admin_data["total"] > 0
    first_item = admin_data["items"][0]
    assert "public_id" in first_item
    assert "category" in first_item
    assert "final_priority" in first_item
    assert "priority_score" in first_item
    assert "status" in first_item

    # 3. Submit a complaint as student
    unique_tag = uuid.uuid4().hex[:6]
    comp_res = client.post("/api/complaints", json={
        "title": f"Flickering lights in reading hall {unique_tag}",
        "description": "Library reading room lights are flickering rapidly and buzzing.",
        "location": "Central Library - Reading Hall",
        "category": "Electrical and lighting",
        "affected_count": 50,
        "duration_days": 1,
        "user_email": "student@complainai.ai"
    }, headers=student_headers)
    assert comp_res.status_code == 201
    public_id = comp_res.json()["public_id"]

    # 4. Admin updates status to 'Under Review' and adds note
    review_res = client.patch(
        f"/api/admin/complaints/{public_id}/status",
        json={"status": "Under Review", "note": "Technician dispatched to inspect ballast."},
        headers=admin_headers
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "Under Review"

    # 5. Admin assigns department
    assign_res = client.patch(
        f"/api/admin/complaints/{public_id}/assign",
        json={"department": "Electrical Maintenance Division", "note": "Assigned to Library Zone technician."},
        headers=admin_headers
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["assigned_department"] == "Electrical Maintenance Division"

    # 6. Verify changes are immediately reflected in student's public tracking endpoint
    track_res = client.get(f"/api/complaints/{public_id}", headers=student_headers)
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["status"] == "Assigned"
    assert track_data["assigned_department"] == "Electrical Maintenance Division"
    # History includes the admin note
    assert any("Technician dispatched to inspect ballast" in h["note"] for h in track_data["history"] if h["note"])

    # 7. Test CLI manage_admin promote & demote programmatic functions
    from backend.scripts.manage_admin import promote_user, demote_user
    from backend.database import SessionLocal
    from backend.models import User

    test_email = f"staff_{unique_tag}@college.edu"
    reg = client.post("/api/auth/register", json={
        "name": "Test Staff Member",
        "email": test_email,
        "password": "Password123!"
    })
    assert reg.status_code == 201
    assert reg.json()["user"]["role"] == "user"  # Public registration is strictly role='user'

    # Promote using trusted backend utility
    promote_user(test_email)
    db = SessionLocal()
    promoted_user = db.query(User).filter(User.email == test_email).first()
    assert promoted_user.role == "admin"
    db.close()

    # Demote using trusted backend utility
    demote_user(test_email)
    db = SessionLocal()
    demoted_user = db.query(User).filter(User.email == test_email).first()
    assert demoted_user.role == "user"
    db.close()

    # 8. Test Register-Admin API endpoint
    admin_reg_email = f"newadmin_{unique_tag}@college.edu"
    admin_reg_res = client.post("/api/auth/register-admin", json={
        "name": "Prof. Facility Director",
        "email": admin_reg_email,
        "password": "AdminPassword123!"
    })
    assert admin_reg_res.status_code == 201
    admin_reg_data = admin_reg_res.json()
    assert admin_reg_data["user"]["role"] == "admin"
    new_admin_token = admin_reg_data["access_token"]

    # Verify newly registered administrator can immediately access the Facility Admin Console
    new_admin_check = client.get("/api/admin/complaints", headers={"Authorization": f"Bearer {new_admin_token}"})
    assert new_admin_check.status_code == 200
    assert "items" in new_admin_check.json()



