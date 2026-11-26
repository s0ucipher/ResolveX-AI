"""
Targeted regression tests for audit findings 1–20.
Uses isolated temporary SQLite databases and mocked external providers
(Gemini / Firebase) so tests are deterministic and repeatable.
"""

import os
import datetime
import tempfile
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base, normalize_database_url
from backend.models import User, Complaint, StatusHistory, ComplaintRelation
from backend.services.gemini_service import GeminiVisionService
from backend.services.priority import calculate_priority
from backend.services.duplicates import find_potential_duplicates
from backend.services.classifier import classifier_service
from backend.scripts.migrate_to_postgres import migrate, MigrationConflictError


def _register_and_login(client, name: str, email: str, password: str = "Pass12345!"):
    res = client.post("/api/auth/register", json={"name": name, "email": email, "password": password})
    if res.status_code == 201:
        return res.json()["access_token"], res.json()["user"]
    login_res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert login_res.status_code == 200
    return login_res.json()["access_token"], login_res.json()["user"]


def test_finding_2_clean_startup_has_no_demo_admins():
    """Normal startup on a clean DB must create 0 demo users/admins."""
    from fastapi.testclient import TestClient
    from backend.main import app
    from backend.database import SessionLocal

    # Clean all users in a fresh in-place check by using a fresh temp DB via sqlalchemy
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = os.path.join(tmpdir, "clean_check.db")
        eng = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=eng)
        Session = sessionmaker(bind=eng)
        with patch("backend.main.engine", eng), patch("backend.main.SessionLocal", Session):
            with TestClient(app) as c:
                res = c.get("/api/health")
                assert res.status_code == 200
        db = Session()
        try:
            assert db.query(User).count() == 0
        finally:
            db.close()
        eng.dispose()


def test_finding_4_gemini_unavailability_and_malformed_responses():
    """Missing key, API failure, invalid JSON, and incomplete JSON must never fabricate passing results."""
    svc = GeminiVisionService()

    # 1. Missing API key
    with patch.dict(os.environ, {"GEMINI_API_KEY": ""}, clear=False), patch("backend.services.gemini_service.GEMINI_API_KEY", ""):
        photo_res = svc.analyze_complaint_image(b"fakeimg", "image/jpeg")
        assert photo_res["analysis_status"] == "unavailable"
        assert photo_res["suggested_priority"] is None
        assert photo_res["is_safety_hazard"] is None

        work_res = svc.verify_work_completion("Title", "Desc", b"fakeimg", "image/jpeg")
        assert work_res["verification_status"] == "unavailable"
        assert work_res["verdict"] is None
        assert work_res["quality_score"] is None
        assert work_res["manager_recommendation"] is None

    # 2. Invalid JSON
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.text = "not valid json at all"
    mock_client.models.generate_content.return_value = mock_resp
    with patch("backend.services.gemini_service.get_client", return_value=(mock_client, None)):
        work_res = svc.verify_work_completion("Title", "Desc", b"fakeimg", "image/jpeg")
        assert work_res["verification_status"] == "malformed"
        assert work_res["verdict"] is None
        assert work_res["quality_score"] is None

    # 3. Incomplete JSON (missing quality_score)
    mock_resp.text = '{"verdict": "PROPERLY_DONE", "verdict_headline": "Ok"}'
    with patch("backend.services.gemini_service.get_client", return_value=(mock_client, None)):
        work_res = svc.verify_work_completion("Title", "Desc", b"fakeimg", "image/jpeg")
        assert work_res["verification_status"] == "malformed"
        assert work_res["verdict"] is None

    # 4. Timeout / exception
    mock_client.models.generate_content.side_effect = TimeoutError("Provider timed out")
    with patch("backend.services.gemini_service.get_client", return_value=(mock_client, None)):
        work_res = svc.verify_work_completion("Title", "Desc", b"fakeimg", "image/jpeg")
        assert work_res["verification_status"] == "unavailable"
        assert work_res["verdict"] is None


def test_finding_5_photo_resolution_with_ai_disabled_and_text_only(seeded_client, db_session):
    """Photo resolution with AI disabled or unavailable must persist photo, manual review, and history."""
    student_tok, _ = _register_and_login(seeded_client, "Photo Student", "photo_stu@college.edu")
    admin_login = seeded_client.post("/api/auth/login", json={
        "email": "admin@complainai.ai",
        "password": "Admin@ComplainAI2026!"
    })
    assert admin_login.status_code == 200
    admin_hdrs = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    stu_hdrs = {"Authorization": f"Bearer {student_tok}"}

    # Create ticket and move to In Progress
    c_res = seeded_client.post("/api/complaints", json={
        "title": "Broken corridor tube light",
        "description": "Corridor light near room 105 has been flickering and dark.",
        "location": "Block A - 1st Floor",
    }, headers=stu_hdrs)
    assert c_res.status_code == 201
    pid = c_res.json()["public_id"]

    assert seeded_client.patch(f"/api/admin/complaints/{pid}/assign", json={
        "department": "Electrical Maintenance Division", "note": "Assigned"
    }, headers=admin_hdrs).status_code == 200
    assert seeded_client.patch(f"/api/admin/complaints/{pid}/status", json={
        "status": "In Progress", "note": "Technician dispatched"
    }, headers=admin_hdrs).status_code == 200

    # Resolve with photo and AI disabled
    res = seeded_client.post(f"/api/admin/complaints/{pid}/verify-resolution", json={
        "status": "Resolved",
        "resolution_notes": "Replaced tube light starter and ballast.",
        "resolution_photo_base64": "data:image/jpeg;base64,ZmFrZQ==",
        "run_gemini_verification": False,
        "manual_signoff": True,
    }, headers=admin_hdrs)
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "Resolved"
    assert body["resolution_photo_url"] == "data:image/jpeg;base64,ZmFrZQ=="
    assert body["resolution_quality_status"] == "MANUAL_REVIEW_ONLY"
    assert body["resolution_quality_score"] is None
    assert any("manual administrator review" in (h["note"] or "").lower() for h in body["history"])


def test_finding_7_idempotency_two_rooms_and_concurrent_retries(seeded_client, db_session):
    """Identical text in two rooms -> 2 tickets; same idempotency_key -> 1 ticket; mismatched payload -> 409."""
    tok, _ = _register_and_login(seeded_client, "Idem Student", "idem_stu@college.edu")
    hdrs = {"Authorization": f"Bearer {tok}"}

    base_payload = {
        "title": "Ceiling fan wobbling dangerously",
        "description": "The ceiling fan is making loud grinding noise and wobbling.",
        "location": "Hostel Room 201",
    }
    r1 = seeded_client.post("/api/complaints", json=base_payload, headers=hdrs)
    r2 = seeded_client.post("/api/complaints", json={**base_payload, "location": "Hostel Room 202"}, headers=hdrs)
    assert r1.status_code == 201 and r2.status_code == 201
    assert r1.json()["public_id"] != r2.json()["public_id"]

    # Same idempotency key with same payload -> returns same ticket
    idem_payload = {**base_payload, "location": "Hostel Room 305", "idempotency_key": "idem-key-room-305"}
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda _: seeded_client.post("/api/complaints", json=idem_payload, headers=hdrs), range(4)))
    assert all(r.status_code == 201 for r in results)
    ids = {r.json()["public_id"] for r in results}
    assert len(ids) == 1

    # Reusing same idempotency key with different data -> 409 Conflict
    conflict_res = seeded_client.post("/api/complaints", json={
        **idem_payload,
        "location": "Hostel Room 999",
    }, headers=hdrs)
    assert conflict_res.status_code == 409


def test_finding_8_and_9_driver_normalization_and_migration():
    """URL normalization selects psycopg2; SQLite migration preserves all fields and detects conflicts."""
    assert normalize_database_url("postgres://u:p@host:5432/db") == "postgresql+psycopg2://u:p@host:5432/db"
    assert normalize_database_url("postgresql://u:p@host:5432/db") == "postgresql+psycopg2://u:p@host:5432/db"
    assert normalize_database_url("sqlite:///./test.db") == "sqlite:///./test.db"

    with tempfile.TemporaryDirectory() as tmpdir:
        src_path = os.path.join(tmpdir, "src.db")
        dst_path = os.path.join(tmpdir, "dst.db")
        src_eng = create_engine(f"sqlite:///{src_path}", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=src_eng)
        SrcSess = sessionmaker(bind=src_eng)
        s = SrcSess()
        u = User(id=1, firebase_uid="fb_mig_1", name="Mig User", email="mig@college.edu", role="user", is_active=True)
        s.add(u)
        s.flush()
        c1 = Complaint(
            id=1, public_id="RX-2026-MIG001", user_id=1, user_email="mig@college.edu",
            title="Migrated issue 1", description="Full description for migration test 1.",
            location="Block A", category="Electrical and lighting", predicted_category="Electrical and lighting",
            classification_confidence=0.91, priority_score=82, predicted_priority="Critical",
            final_priority="Critical", priority_explanation="Sparking", status="Resolved",
            photo_url="data:image/png;base64,AAA", photo_analysis='{"analysis_status":"completed"}',
            resolution_photo_url="data:image/png;base64,BBB", resolution_quality_status="PROPERLY_DONE",
            resolution_quality_report="Verified", resolution_quality_score=92,
            idempotency_key="mig-idem-1"
        )
        c2 = Complaint(
            id=2, public_id="RX-2026-MIG002", user_id=1, user_email="mig@college.edu",
            title="Migrated issue 2", description="Full description for migration test 2.",
            location="Block A", category="Electrical and lighting", predicted_category="Electrical and lighting",
            classification_confidence=0.88, priority_score=40, predicted_priority="Medium",
            final_priority="Medium", priority_explanation="Routine", status="Submitted"
        )
        s.add_all([c1, c2])
        s.flush()
        s.add(StatusHistory(id=1, complaint_id=1, previous_status=None, new_status="Submitted", note="Created", changed_by="Mig User"))
        s.add(ComplaintRelation(id=1, complaint_id=2, related_complaint_id=1, relationship_type="duplicate_candidate", similarity_score=0.72, review_status="pending"))
        s.commit()
        s.close()
        src_eng.dispose()

        # Run migration
        migrate(src_path, f"sqlite:///{dst_path}")
        # Repeat run should succeed idempotently
        migrate(src_path, f"sqlite:///{dst_path}")

        dst_eng = create_engine(f"sqlite:///{dst_path}", connect_args={"check_same_thread": False})
        DstSess = sessionmaker(bind=dst_eng)
        d = DstSess()
        migrated_u = d.query(User).filter(User.id == 1).first()
        migrated_c = d.query(Complaint).filter(Complaint.id == 1).first()
        assert migrated_u.firebase_uid == "fb_mig_1"
        assert migrated_c.photo_url == "data:image/png;base64,AAA"
        assert migrated_c.resolution_quality_score == 92
        assert migrated_c.idempotency_key == "mig-idem-1"
        assert d.query(StatusHistory).count() == 1
        assert d.query(ComplaintRelation).count() == 1

        # Introduce conflict on destination and verify migration fails loudly
        migrated_u.email = "tampered@college.edu"
        d.commit()
        d.close()
        dst_eng.dispose()

        with pytest.raises(MigrationConflictError):
            migrate(src_path, f"sqlite:///{dst_path}")


def test_finding_10_reopened_ticket_clears_resolved_at_and_updates_counts(seeded_client):
    """Resolve -> Reopen -> In Progress -> Resolve clears resolved_at while reopened and preserves both resolutions."""
    tok, _ = _register_and_login(seeded_client, "Reopen Student", "reopen_stu@college.edu")
    admin_login = seeded_client.post("/api/auth/login", json={
        "email": "admin@complainai.ai",
        "password": "Admin@ComplainAI2026!"
    })
    admin_hdrs = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    stu_hdrs = {"Authorization": f"Bearer {tok}"}

    c_res = seeded_client.post("/api/complaints", json={
        "title": "Water cooler leaking again",
        "description": "Water cooler on 2nd floor is dripping onto the hallway.",
        "location": "Academic Block - 2nd Floor"
    }, headers=stu_hdrs)
    pid = c_res.json()["public_id"]

    seeded_client.patch(f"/api/admin/complaints/{pid}/assign", json={"department": "Water Supply & Plumbing Works", "note": "Assigned"}, headers=admin_hdrs)
    seeded_client.patch(f"/api/admin/complaints/{pid}/status", json={"status": "In Progress", "note": "Working"}, headers=admin_hdrs)
    r1 = seeded_client.patch(f"/api/admin/complaints/{pid}/status", json={
        "status": "Resolved", "resolution_notes": "Tightened valve", "note": "First resolution"
    }, headers=admin_hdrs)
    assert r1.status_code == 200
    assert r1.json()["resolved_at"] is not None

    before_reopen_open = seeded_client.get("/api/analytics/summary").json()["open_complaints"]
    reopened = seeded_client.patch(f"/api/admin/complaints/{pid}/status", json={
        "status": "Reopened", "note": "Leak returned after 2 hours"
    }, headers=admin_hdrs)
    assert reopened.status_code == 200
    assert reopened.json()["status"] == "Reopened"
    assert reopened.json()["resolved_at"] is None
    after_reopen_open = seeded_client.get("/api/analytics/summary").json()["open_complaints"]
    assert after_reopen_open == before_reopen_open + 1

    seeded_client.patch(f"/api/admin/complaints/{pid}/status", json={"status": "In Progress", "note": "Replacing valve"}, headers=admin_hdrs)
    r2 = seeded_client.patch(f"/api/admin/complaints/{pid}/status", json={
        "status": "Resolved", "resolution_notes": "Replaced entire valve assembly", "note": "Second resolution"
    }, headers=admin_hdrs)
    assert r2.status_code == 200
    assert r2.json()["resolved_at"] is not None
    resolved_events = [h for h in r2.json()["history"] if h["new_status"] == "Resolved"]
    assert len(resolved_events) == 2


def test_finding_12_utc_timestamp_serialization(seeded_client):
    """API responses must serialize timestamps with explicit UTC timezone offset."""
    tok, _ = _register_and_login(seeded_client, "TZ Student", "tz_stu@college.edu")
    res = seeded_client.post("/api/complaints", json={
        "title": "Timezone serialization check",
        "description": "Verifying that created_at includes explicit UTC offset.",
        "location": "Block C"
    }, headers={"Authorization": f"Bearer {tok}"})
    assert res.status_code == 201
    created_at = res.json()["created_at"]
    assert created_at.endswith("+00:00") or created_at.endswith("Z")


@pytest.mark.parametrize("title,desc,expected_prio,min_score,max_score", [
    ("A socket is sparking", "Electrical socket near desk is sparking.", "Critical", 82, 100),
    ("There is no sparking", "Checked the switchboard and there is no sparking at all.", "Low", 15, 34),
    ("Flames are coming out of an outlet", "Visible flames are coming out of an outlet in lab 2.", "Critical", 82, 100),
    ("Mixed hazard check", "No smoke now, but the socket is still sparking.", "Critical", 82, 100),
])
def test_finding_14_priority_negation_and_reconciliation(title, desc, expected_prio, min_score, max_score):
    """Priority scoring handles negation, common fire wording, and factor sums reconcile with score."""
    res = calculate_priority(title, desc, "Lab 2")
    assert res["recommended_priority"] == expected_prio
    assert min_score <= res["score"] <= max_score
    assert sum(f["points"] for f in res["factors"]) == res["score"]


def test_finding_15_duplicates_exclude_resolved_and_rejected(db_session):
    """Active duplicate search excludes Resolved and Rejected tickets, includes Reopened."""
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    c_active = Complaint(
        public_id="RX-2026-DUPACT", title="WiFi router down in Hostel B",
        description="No internet connection on third floor of Hostel B.",
        location="Hostel B", category="Internet and IT services",
        predicted_category="Internet and IT services", priority_score=40,
        predicted_priority="Medium", final_priority="Medium", priority_explanation="Routine",
        status="Reopened", created_at=now
    )
    c_resolved = Complaint(
        public_id="RX-2026-DUPRES", title="WiFi router down in Hostel B",
        description="No internet connection on third floor of Hostel B.",
        location="Hostel B", category="Internet and IT services",
        predicted_category="Internet and IT services", priority_score=40,
        predicted_priority="Medium", final_priority="Medium", priority_explanation="Routine",
        status="Resolved", created_at=now
    )
    c_rejected = Complaint(
        public_id="RX-2026-DUPREJ", title="WiFi router down in Hostel B",
        description="No internet connection on third floor of Hostel B.",
        location="Hostel B", category="Internet and IT services",
        predicted_category="Internet and IT services", priority_score=40,
        predicted_priority="Medium", final_priority="Medium", priority_explanation="Routine",
        status="Rejected", created_at=now
    )
    db_session.add_all([c_active, c_resolved, c_rejected])
    db_session.commit()

    matches = find_potential_duplicates(
        target_id=None,
        title="WiFi router down in Hostel B",
        description="No internet connection on third floor of Hostel B.",
        category="Internet and IT services",
        location="Hostel B",
        db=db_session,
        similarity_threshold=0.50,
    )
    match_ids = {m["public_id"] for m in matches}
    assert "RX-2026-DUPACT" in match_ids
    assert "RX-2026-DUPRES" not in match_ids
    assert "RX-2026-DUPREJ" not in match_ids


def test_finding_16_and_17_unknown_words_and_scan_missing_location(seeded_client):
    """Unknown words must not fabricate title-word features; missing location stays None."""
    res = classifier_service.classify("Zqxwvt", "Plmoknijbuhvygcftxdrz")
    assert res["influential_features"] == []

    tok, _ = _register_and_login(seeded_client, "Scan Student", "scan_stu@college.edu")
    scan_res = seeded_client.post("/api/ai/scan-report", json={
        "raw_text": "12 students reported that the ceiling fan is making noise and wobbling."
    }, headers={"Authorization": f"Bearer {tok}"})
    assert scan_res.status_code == 200
    body = scan_res.json()
    assert body["extracted_location"] is None
    assert body["extracted_affected_count"] == 12


def test_finding_18_admin_pagination_and_search_over_100(seeded_client, db_session):
    """Seeding >100 complaints: server-side search and pagination must find older tickets."""
    admin_login = seeded_client.post("/api/auth/login", json={
        "email": "admin@complainai.ai",
        "password": "Admin@ComplainAI2026!"
    })
    admin_hdrs = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    base_time = datetime.datetime(2026, 1, 1, 12, 0, 0)
    bulk = []
    for i in range(105):
        bulk.append(Complaint(
            public_id=f"RX-2026-PG{i:04d}",
            title=f"Paginated ticket {i}",
            description=f"Bulk pagination test complaint number {i}.",
            location="Main Block",
            category="Other",
            predicted_category="Other",
            priority_score=20,
            predicted_priority="Low",
            final_priority="Low",
            priority_explanation="Routine",
            status="Submitted",
            created_at=base_time,
        ))
    db_session.add_all(bulk)
    db_session.commit()

    # Search for oldest ticket
    search_res = seeded_client.get("/api/admin/complaints?query=RX-2026-PG0000", headers=admin_hdrs)
    assert search_res.status_code == 200
    assert search_res.json()["total"] == 1
    assert search_res.json()["items"][0]["public_id"] == "RX-2026-PG0000"

    # Page 1 and Page 2 with equal timestamps must not overlap
    p1 = seeded_client.get("/api/admin/complaints?limit=8&offset=0", headers=admin_hdrs).json()
    p2 = seeded_client.get("/api/admin/complaints?limit=8&offset=8", headers=admin_hdrs).json()
    assert p1["total"] >= 105
    p1_ids = {c["public_id"] for c in p1["items"]}
    p2_ids = {c["public_id"] for c in p2["items"]}
    assert p1_ids.isdisjoint(p2_ids)


def test_finding_11_unknown_api_returns_404_and_spa_deep_link_returns_200(seeded_client):
    """Unknown /api routes must return 404 even when frontend/dist exists; SPA deep links return 200."""
    api_404 = seeded_client.get("/api/does-not-exist")
    assert api_404.status_code == 404

    spa_res = seeded_client.get("/track")
    assert spa_res.status_code == 200

