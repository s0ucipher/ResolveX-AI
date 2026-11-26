"""
Database Migration Utility: SQLite to PostgreSQL (or target SQLAlchemy DB)
ComplainAI - Campus Complaint Intelligence System

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

from backend.database import Base, normalize_database_url
from backend.models import User, Complaint, StatusHistory, ComplaintRelation


class MigrationConflictError(RuntimeError):
    """Raised when destination contains conflicting or mismatched records."""


def _same_dt(a, b) -> bool:
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return a.replace(tzinfo=None) == b.replace(tzinfo=None)


def _verify_user_match(src: User, dst: User, context: str) -> None:
    if (
        dst.email != src.email
        or dst.firebase_uid != src.firebase_uid
        or dst.role != src.role
        or dst.name != src.name
        or dst.password_hash != src.password_hash
        or bool(dst.is_active) != bool(src.is_active)
        or not _same_dt(dst.created_at, src.created_at)
    ):
        raise MigrationConflictError(
            f"User conflict ({context}) for id={src.id} email={src.email}: destination row differs from source."
        )


def _verify_complaint_match(src: Complaint, dst: Complaint, context: str) -> None:
    fields = (
        "public_id",
        "user_id",
        "user_email",
        "title",
        "description",
        "location",
        "category",
        "predicted_category",
        "classification_confidence",
        "priority_score",
        "predicted_priority",
        "final_priority",
        "priority_explanation",
        "assigned_department",
        "status",
        "photo_url",
        "photo_analysis",
        "resolution_photo_url",
        "resolution_quality_status",
        "resolution_quality_report",
        "resolution_quality_score",
        "rejection_reason",
        "resolution_notes",
        "idempotency_key",
    )
    for f in fields:
        if getattr(dst, f) != getattr(src, f):
            raise MigrationConflictError(
                f"Complaint conflict ({context}) for id={src.id} public_id={src.public_id}: field '{f}' differs."
            )
    if (
        not _same_dt(dst.created_at, src.created_at)
        or not _same_dt(dst.updated_at, src.updated_at)
        or not _same_dt(dst.resolved_at, src.resolved_at)
    ):
        raise MigrationConflictError(
            f"Complaint conflict ({context}) for id={src.id} public_id={src.public_id}: timestamps differ."
        )


def _verify_history_match(src: StatusHistory, dst: StatusHistory, context: str) -> None:
    if (
        dst.complaint_id != src.complaint_id
        or dst.previous_status != src.previous_status
        or dst.new_status != src.new_status
        or dst.note != src.note
        or dst.changed_by != src.changed_by
        or not _same_dt(dst.created_at, src.created_at)
    ):
        raise MigrationConflictError(
            f"StatusHistory conflict ({context}) for id={src.id}: destination row differs from source."
        )


def _verify_relation_match(src: ComplaintRelation, dst: ComplaintRelation, context: str) -> None:
    if (
        dst.complaint_id != src.complaint_id
        or dst.related_complaint_id != src.related_complaint_id
        or dst.relationship_type != src.relationship_type
        or dst.similarity_score != src.similarity_score
        or dst.review_status != src.review_status
        or not _same_dt(dst.created_at, src.created_at)
    ):
        raise MigrationConflictError(
            f"ComplaintRelation conflict ({context}) for id={src.id}: destination row differs from source."
        )


def migrate(sqlite_path: str, postgres_url: str) -> None:
    target_url = normalize_database_url(postgres_url)

    print("==================================================")
    print(" ComplainAI - SQLite to PostgreSQL Data Migrator")
    print("==================================================")
    print(f" Source SQLite    : {sqlite_path}")
    print(f" Target Database  : {target_url.split('@')[-1] if '@' in target_url else target_url}")

    if not os.path.exists(sqlite_path):
        raise FileNotFoundError(f"Source SQLite database not found at {sqlite_path}")

    src_engine = create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})
    SrcSession = sessionmaker(bind=src_engine)
    src_db = SrcSession()

    dst_connect_args = {"check_same_thread": False} if target_url.startswith("sqlite") else {}
    dst_engine = create_engine(target_url, pool_pre_ping=True, connect_args=dst_connect_args)
    DstSession = sessionmaker(bind=dst_engine)
    dst_db = DstSession()

    print("[1/6] Ensuring database schema exists on destination...")
    Base.metadata.create_all(bind=dst_engine)

    try:
        # 1. Migrate Users
        users = src_db.query(User).order_by(User.id.asc()).all()
        print(f"[2/6] Migrating {len(users)} Users...")
        for u in users:
            existing = dst_db.query(User).filter(User.id == u.id).first()
            if existing:
                _verify_user_match(u, existing, "existing id")
                continue

            email_conflict = dst_db.query(User).filter(User.email == u.email).first()
            if email_conflict:
                raise MigrationConflictError(
                    f"Destination already has user email={u.email} with different id={email_conflict.id} (source id={u.id})."
                )
            if u.firebase_uid:
                uid_conflict = dst_db.query(User).filter(User.firebase_uid == u.firebase_uid).first()
                if uid_conflict:
                    raise MigrationConflictError(
                        f"Destination already has firebase_uid={u.firebase_uid} with different id={uid_conflict.id}."
                    )

            dst_db.add(User(
                id=u.id,
                firebase_uid=u.firebase_uid,
                name=u.name,
                email=u.email,
                password_hash=u.password_hash,
                role=u.role,
                is_active=u.is_active,
                created_at=u.created_at,
            ))
        dst_db.flush()

        # 2. Migrate Complaints
        complaints = src_db.query(Complaint).order_by(Complaint.id.asc()).all()
        print(f"[3/6] Migrating {len(complaints)} Complaints...")
        for c in complaints:
            existing = dst_db.query(Complaint).filter(Complaint.id == c.id).first()
            if existing:
                _verify_complaint_match(c, existing, "existing id")
                continue

            pub_conflict = dst_db.query(Complaint).filter(Complaint.public_id == c.public_id).first()
            if pub_conflict:
                raise MigrationConflictError(
                    f"Destination already has public_id={c.public_id} with different id={pub_conflict.id} (source id={c.id})."
                )

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
                photo_url=c.photo_url,
                photo_analysis=c.photo_analysis,
                resolution_photo_url=c.resolution_photo_url,
                resolution_quality_status=c.resolution_quality_status,
                resolution_quality_report=c.resolution_quality_report,
                resolution_quality_score=c.resolution_quality_score,
                rejection_reason=c.rejection_reason,
                resolution_notes=c.resolution_notes,
                idempotency_key=c.idempotency_key,
                created_at=c.created_at,
                updated_at=c.updated_at,
                resolved_at=c.resolved_at,
            ))
        dst_db.flush()

        # 3. Migrate Status History
        histories = src_db.query(StatusHistory).order_by(StatusHistory.id.asc()).all()
        print(f"[4/6] Migrating {len(histories)} Status History Records...")
        for h in histories:
            existing = dst_db.query(StatusHistory).filter(StatusHistory.id == h.id).first()
            if existing:
                _verify_history_match(h, existing, "existing id")
                continue
            dst_db.add(StatusHistory(
                id=h.id,
                complaint_id=h.complaint_id,
                previous_status=h.previous_status,
                new_status=h.new_status,
                note=h.note,
                changed_by=h.changed_by,
                created_at=h.created_at,
            ))
        dst_db.flush()

        # 4. Migrate Complaint Relations
        relations = src_db.query(ComplaintRelation).order_by(ComplaintRelation.id.asc()).all()
        print(f"[5/6] Migrating {len(relations)} Complaint Relations...")
        for r in relations:
            existing = dst_db.query(ComplaintRelation).filter(ComplaintRelation.id == r.id).first()
            if existing:
                _verify_relation_match(r, existing, "existing id")
                continue
            dst_db.add(ComplaintRelation(
                id=r.id,
                complaint_id=r.complaint_id,
                related_complaint_id=r.related_complaint_id,
                relationship_type=r.relationship_type,
                similarity_score=r.similarity_score,
                review_status=r.review_status,
                created_at=r.created_at,
            ))
        dst_db.commit()

        # 5. Verify counts and field values
        print("[6/6] Verifying migrated counts and field values...")
        for model, label, verifier in (
            (User, "users", _verify_user_match),
            (Complaint, "complaints", _verify_complaint_match),
            (StatusHistory, "status_history", _verify_history_match),
            (ComplaintRelation, "complaint_relations", _verify_relation_match),
        ):
            src_rows = src_db.query(model).order_by(model.id.asc()).all()
            dst_map = {row.id: row for row in dst_db.query(model).all()}
            if len(dst_map) < len(src_rows):
                raise MigrationConflictError(
                    f"Row count mismatch for {label}: source={len(src_rows)}, destination={len(dst_map)}"
                )
            for s_row in src_rows:
                d_row = dst_map.get(s_row.id)
                if d_row is None:
                    raise MigrationConflictError(f"Missing {label} row id={s_row.id} in destination.")
                verifier(s_row, d_row, "post-commit verification")

        # 6. Reset PostgreSQL sequences so subsequent inserts don't collide
        if dst_engine.dialect.name == "postgresql":
            print("Resetting PostgreSQL primary key sequences...")
            tables = [
                ("users", "id"),
                ("complaints", "id"),
                ("status_history", "id"),
                ("complaint_relations", "id"),
            ]
            with dst_engine.connect() as conn:
                for tbl, col in tables:
                    conn.execute(
                        text(
                            f"SELECT setval(pg_get_serial_sequence('{tbl}', '{col}'), "
                            f"coalesce(max({col}), 0) + 1, false) FROM {tbl};"
                        )
                    )
                    conn.commit()

        print("\nMigration completed and verified successfully!")
    except Exception:
        dst_db.rollback()
        raise
    finally:
        src_db.close()
        dst_db.close()
        src_engine.dispose()
        dst_engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate ComplainAI SQLite DB to PostgreSQL")
    parser.add_argument("--sqlite", default="backend/resolvex.db", help="Path to SQLite file")
    parser.add_argument("--postgres", default=os.getenv("DATABASE_URL", ""), help="PostgreSQL connection URL")
    args = parser.parse_args()

    if not args.postgres:
        print("[Error] PostgreSQL URL not provided. Use --postgres or set DATABASE_URL.")
        sys.exit(1)

    try:
        migrate(args.sqlite, args.postgres)
    except Exception as exc:
        print(f"\n[Migration Error] {exc}")
        sys.exit(1)
