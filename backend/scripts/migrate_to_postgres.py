"""
Database Migration Utility: SQLite to PostgreSQL
ResolveX AI - Campus Complaint Intelligence System

Usage:
    python -m backend.scripts.migrate_to_postgres --sqlite backend/resolvex.db --postgres "postgresql://user:pass@host:port/dbname"
    
Or set DATABASE_URL environment variable:
    DATABASE_URL="postgresql://user:pass@host:port/dbname" python -m backend.scripts.migrate_to_postgres
"""

import os
import sys
import argparse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.models import User, Complaint, StatusHistory, ComplaintRelation

def migrate(sqlite_path: str, postgres_url: str):
    # Ensure scheme
    if postgres_url.startswith("postgres://"):
        postgres_url = postgres_url.replace("postgres://", "postgresql://", 1)

    print("==================================================")
    print(" ResolveX AI - SQLite to PostgreSQL Data Migrator")
    print("==================================================")
    print(f" Source SQLite    : {sqlite_path}")
    print(f" Target PostgreSQL: {postgres_url.split('@')[-1] if '@' in postgres_url else 'configured'}")

    if not os.path.exists(sqlite_path):
        print(f"[Error] Source SQLite database not found at {sqlite_path}")
        sys.exit(1)

    # 1. Connect to SQLite
    src_engine = create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})
    SrcSession = sessionmaker(bind=src_engine)
    src_db = SrcSession()

    # 2. Connect to PostgreSQL
    dst_engine = create_engine(postgres_url, pool_pre_ping=True)
    DstSession = sessionmaker(bind=dst_engine)
    dst_db = DstSession()

    # 3. Create tables on destination PostgreSQL
    print("[1/5] Ensuring database schema exists on PostgreSQL...")
    Base.metadata.create_all(bind=dst_engine)

    try:
        # 4. Migrate Users
        users = src_db.query(User).all()
        print(f"[2/5] Migrating {len(users)} Users...")
        for u in users:
            existing = dst_db.query(User).filter(User.id == u.id).first()
            if not existing:
                dst_db.add(User(
                    id=u.id,
                    name=u.name,
                    email=u.email,
                    password_hash=u.password_hash,
                    role=u.role,
                    is_active=u.is_active,
                    created_at=u.created_at
                ))
        dst_db.commit()

        # 5. Migrate Complaints
        complaints = src_db.query(Complaint).all()
        print(f"[3/5] Migrating {len(complaints)} Complaints...")
        for c in complaints:
            existing = dst_db.query(Complaint).filter(Complaint.id == c.id).first()
            if not existing:
                dst_db.add(Complaint(
                    id=c.id,
                    public_id=c.public_id,
                    user_id=c.user_id,
                    user_email=c.user_email,
                    title=c.title,
                    description=c.description,
                    location=c.location,
                    category=c.category,
                    predicted_category=c.predicted_category,
                    classification_confidence=c.classification_confidence,
                    priority_score=c.priority_score,
                    predicted_priority=c.predicted_priority,
                    final_priority=c.final_priority,
                    priority_explanation=c.priority_explanation,
                    assigned_department=c.assigned_department,
                    status=c.status,
                    rejection_reason=c.rejection_reason,
                    resolution_notes=c.resolution_notes,
                    created_at=c.created_at,
                    updated_at=c.updated_at,
                    resolved_at=c.resolved_at
                ))
        dst_db.commit()

        # 6. Migrate Status History
        histories = src_db.query(StatusHistory).all()
        print(f"[4/5] Migrating {len(histories)} Status History Records...")
        for h in histories:
            existing = dst_db.query(StatusHistory).filter(StatusHistory.id == h.id).first()
            if not existing:
                dst_db.add(StatusHistory(
                    id=h.id,
                    complaint_id=h.complaint_id,
                    previous_status=h.previous_status,
                    new_status=h.new_status,
                    note=h.note,
                    changed_by=h.changed_by,
                    created_at=h.created_at
                ))
        dst_db.commit()

        # 7. Migrate Complaint Relations
        relations = src_db.query(ComplaintRelation).all()
        print(f"[5/5] Migrating {len(relations)} Complaint Relations...")
        for r in relations:
            existing = dst_db.query(ComplaintRelation).filter(ComplaintRelation.id == r.id).first()
            if not existing:
                dst_db.add(ComplaintRelation(
                    id=r.id,
                    complaint_id=r.complaint_id,
                    related_complaint_id=r.related_complaint_id,
                    relationship_type=r.relationship_type,
                    similarity_score=r.similarity_score,
                    review_status=r.review_status,
                    created_at=r.created_at
                ))
        dst_db.commit()

        # 8. Reset PostgreSQL sequences so subsequent inserts don't collide
        print("Resetting PostgreSQL primary key sequences...")
        tables = [
            ("users", "id"),
            ("complaints", "id"),
            ("status_history", "id"),
            ("complaint_relations", "id")
        ]
        with dst_engine.connect() as conn:
            for tbl, col in tables:
                try:
                    conn.execute(text(f"SELECT setval(pg_get_serial_sequence('{tbl}', '{col}'), coalesce(max({col}),0) + 1, false) FROM {tbl};"))
                    conn.commit()
                except Exception as seq_err:
                    print(f"  Note: Sequence sync for {tbl}: {seq_err}")

        print("\n Migration completed successfully! All records migrated to PostgreSQL.")
    except Exception as e:
        dst_db.rollback()
        print(f"\n[Migration Error] {e}")
        sys.exit(1)
    finally:
        src_db.close()
        dst_db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate ResolveX SQLite DB to PostgreSQL")
    parser.add_argument("--sqlite", default="backend/resolvex.db", help="Path to SQLite file")
    parser.add_argument("--postgres", default=os.getenv("DATABASE_URL"), help="PostgreSQL connection string")
    args = parser.parse_args()

    if not args.postgres:
        print("[Error] PostgreSQL connection string required via --postgres or DATABASE_URL env var")
        sys.exit(1)

    migrate(args.sqlite, args.postgres)

