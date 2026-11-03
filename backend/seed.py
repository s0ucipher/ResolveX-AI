"""
Database Seeding Script for ResolveX AI.
Provisions demo users (admin and student) and realistic campus complaints across categories and lifecycles.
Safe to run repeatedly; does not duplicate records if already seeded.
"""

import datetime
from backend.database import SessionLocal, engine, Base
from backend.models import User, Complaint, StatusHistory, ComplaintRelation
from backend.auth import get_password_hash
from backend.services.classifier import classifier_service
from backend.services.priority import calculate_priority

Base.metadata.create_all(bind=engine)

DEMO_USERS = [
    {
        "name": "Prof. Arvind Kumar (Campus Facilities Dean)",
        "email": "admin@resolvex.ai",
        "password": "Admin@ResolveX2026!",
        "role": "admin"
    },
    {
        "name": "Rohan Sharma (Student Council Representative)",
        "email": "student@resolvex.ai",
        "password": "Student@ResolveX2026!",
        "role": "user"
    }
]

SAMPLE_COMPLAINTS = [
    {
        "public_id": "RX-2026-ELE001",
        "title": "Exposed electrical wiring sparking near staircase",
        "description": "Exposed live wires hanging from the ceiling near the staircase, sparking intermittently when the AC turns on. Severe electrocution danger.",
        "location": "Main Academic Block - 2nd Floor",
        "assigned_department": "Electrical Maintenance Division",
        "status": "In Progress",
        "days_ago": 2,
        "affected_count": 250,
        "duration_days": 2,
        "history_notes": [
            ("Submitted", "Complaint lodged by student via ResolveX portal.", "student@resolvex.ai"),
            ("Under Review", "Investigated immediately due to Critical safety flag.", "Admin (Prof. Arvind Kumar)"),
            ("Assigned", "Assigned to Senior Campus Electrician team.", "Admin (Prof. Arvind Kumar)"),
            ("In Progress", "Power to hallway isolated. Conduit replacement underway.", "Admin (Prof. Arvind Kumar)")
        ]
    },
    {
        "public_id": "RX-2026-WAT002",
        "title": "No running water in hostel floor washrooms",
        "description": "There has been zero tap water supply on the 3rd floor of hostel 2 since yesterday morning. Students cannot shower or use sanitation facilities.",
        "location": "Boys Hostel 2 - 3rd Floor",
        "assigned_department": "Water Supply & Plumbing Works",
        "status": "Assigned",
        "days_ago": 1,
        "affected_count": 80,
        "duration_days": 1,
        "history_notes": [
            ("Submitted", "Lodged by Hostel 2 residents.", "student@resolvex.ai"),
            ("Under Review", "High priority confirmed due to student residential impact.", "Admin (Prof. Arvind Kumar)"),
            ("Assigned", "Dispatched plumbing maintenance crew to inspect booster pump.", "Admin (Prof. Arvind Kumar)")
        ]
    },
    {
        "public_id": "RX-2026-IT003",
        "title": "Campus Wi-Fi authentication portal down",
        "description": "The captive portal login page for Student-WiFi returns error 502 Bad Gateway. Students in CS lab cannot access online course material.",
        "location": "Computer Science Building - Lab 3",
        "assigned_department": "IT Infrastructure & Network Cell",
        "status": "Under Review",
        "days_ago": 3,
        "affected_count": 120,
        "duration_days": 1,
        "history_notes": [
            ("Submitted", "Automated classification categorized as Internet and IT services.", "student@resolvex.ai"),
            ("Under Review", "Network administrators inspecting RADIUS server logs.", "Admin (Prof. Arvind Kumar)")
        ]
    },
    {
        "public_id": "RX-2026-ROA004",
        "title": "Deep pothole causing bike skidding at main gate",
        "description": "A deep pothole has formed near the campus main gate bend, two students have already slipped on their two-wheelers during rainy conditions.",
        "location": "Main Gate and Security Post",
        "assigned_department": "Civil Infrastructure & Roads",
        "status": "Submitted",
        "days_ago": 0,
        "affected_count": 400,
        "duration_days": 4,
        "history_notes": [
            ("Submitted", "Landed in triage queue with high priority score.", "User")
        ]
    },
    {
        "public_id": "RX-2026-CLS005",
        "title": "Projector bulb dead in lecture hall 101",
        "description": "Ceiling projector in LH-101 will not turn on and bulb warning light is blinking red. Faculty cannot project lecture slides.",
        "location": "Central Library - Reading Hall",
        "assigned_department": "Audio-Visual & Classroom Support",
        "status": "Resolved",
        "days_ago": 5,
        "affected_count": 60,
        "duration_days": 1,
        "history_notes": [
            ("Submitted", "Reported by visiting lecturer.", "student@resolvex.ai"),
            ("Under Review", "Verified by A/V coordinator.", "Admin (Prof. Arvind Kumar)"),
            ("Assigned", "New lamp module dispatched.", "Admin (Prof. Arvind Kumar)"),
            ("In Progress", "Technician replaced projector lamp and calibrated resolution.", "Admin (Prof. Arvind Kumar)"),
            ("Resolved", "Projector tested and operational. Resolution verified.", "Admin (Prof. Arvind Kumar)")
        ],
        "resolution_notes": "Projector lamp replaced with new 3500-lumen OEM bulb. Calibrated HDMI input and verified 1080p output."
    },
    {
        "public_id": "RX-2026-CLN006",
        "title": "Overflowing dustbins outside cafeteria",
        "description": "The two large green municipal bins outside cafeteria have been overflowing for 3 days with food waste spilling and attracting crows.",
        "location": "Campus Cafeteria & Food Court",
        "assigned_department": "Campus Sanitation & Housekeeping",
        "status": "In Progress",
        "days_ago": 2,
        "affected_count": 300,
        "duration_days": 3,
        "history_notes": [
            ("Submitted", "Classified into Cleanliness and waste management.", "User"),
            ("Under Review", "Housekeeping supervisor notified.", "Admin (Prof. Arvind Kumar)"),
            ("In Progress", "Extra garbage compaction truck deployed.", "Admin (Prof. Arvind Kumar)")
        ]
    },
    {
        "public_id": "RX-2026-SEC007",
        "title": "Emergency fire exit door padlocked shut",
        "description": "The emergency fire exit door at the end of the east corridor has been chained and padlocked, trapping occupants in case of fire emergency.",
        "location": "Science Block B - Lab 104",
        "assigned_department": "Campus Security & Safety Office",
        "status": "Under Review",
        "days_ago": 1,
        "affected_count": 150,
        "duration_days": 1,
        "history_notes": [
            ("Submitted", "CRITICAL SAFETY RISK detected by ResolveX Priority Engine.", "student@resolvex.ai"),
            ("Under Review", "Security chief dispatched keymaster immediately to remove padlock.", "Admin (Prof. Arvind Kumar)")
        ]
    },
    {
        "public_id": "RX-2026-HOS008",
        "title": "Bed bug infestation in hostel room 214",
        "description": "Persistent bed bug outbreak in room 214 of Block A. Mattresses and bed frames require urgent chemical pest control.",
        "location": "Boys Hostel 1 - Wing A",
        "assigned_department": "Hostel Affairs & Maintenance",
        "status": "Assigned",
        "days_ago": 4,
        "affected_count": 4,
        "duration_days": 5,
        "history_notes": [
            ("Submitted", "Categorized into Hostel and accommodation.", "student@resolvex.ai"),
            ("Under Review", "Warden acknowledged pest control request.", "Admin (Prof. Arvind Kumar)"),
            ("Assigned", "Pest extermination scheduled for Saturday.", "Admin (Prof. Arvind Kumar)")
        ]
    }
]

def seed_database():
    db = SessionLocal()
    try:
        # 1. Seed Users
        user_map = {}
        for udata in DEMO_USERS:
            existing = db.query(User).filter(User.email == udata["email"]).first()
            if not existing:
                u = User(
                    name=udata["name"],
                    email=udata["email"],
                    password_hash=get_password_hash(udata["password"]),
                    role=udata["role"],
                    is_active=True
                )
                db.add(u)
                db.commit()
                db.refresh(u)
                user_map[u.email] = u
                print(f"Created demo user: {u.email} ({u.role})")
            else:
                user_map[existing.email] = existing

        student_user = user_map.get("student@resolvex.ai")

        # 2. Seed Sample Complaints
        now = datetime.datetime.utcnow()
        for cdata in SAMPLE_COMPLAINTS:
            existing = db.query(Complaint).filter(Complaint.public_id == cdata["public_id"]).first()
            if existing:
                continue

            # Run classifier and priority
            ai_res = classifier_service.classify(cdata["title"], cdata["description"])
            prio_res = calculate_priority(
                cdata["title"],
                cdata["description"],
                cdata["location"],
                cdata.get("affected_count"),
                cdata.get("duration_days")
            )

            created_time = now - datetime.timedelta(days=cdata.get("days_ago", 1))
            resolved_time = (created_time + datetime.timedelta(hours=14)) if cdata["status"] == "Resolved" else None

            complaint = Complaint(
                public_id=cdata["public_id"],
                user_id=student_user.id if student_user else None,
                user_email="student@resolvex.ai",
                title=cdata["title"],
                description=cdata["description"],
                location=cdata["location"],
                category=ai_res["predicted_category"],
                predicted_category=ai_res["predicted_category"],
                classification_confidence=ai_res["confidence"],
                priority_score=prio_res["score"],
                predicted_priority=prio_res["recommended_priority"],
                final_priority=prio_res["recommended_priority"],
                priority_explanation=prio_res["reasoning"],
                assigned_department=cdata.get("assigned_department"),
                status=cdata["status"],
                resolution_notes=cdata.get("resolution_notes"),
                created_at=created_time,
                updated_at=created_time,
                resolved_at=resolved_time
            )
            db.add(complaint)
            db.commit()
            db.refresh(complaint)

            # Add history
            for idx, h in enumerate(cdata.get("history_notes", [])):
                h_time = created_time + datetime.timedelta(hours=idx * 3)
                history = StatusHistory(
                    complaint_id=complaint.id,
                    previous_status=cdata["history_notes"][idx-1][0] if idx > 0 else None,
                    new_status=h[0],
                    note=h[1],
                    changed_by=h[2],
                    created_at=h_time
                )
                db.add(history)
            db.commit()
            print(f"Seeded complaint: {complaint.public_id} - {complaint.title}")

        print("Database seeding completed successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

