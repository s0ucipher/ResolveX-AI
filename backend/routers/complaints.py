import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Complaint, StatusHistory, ComplaintRelation, User
from backend.schemas import (
    ComplaintCreate,
    ComplaintOut,
    StatusHistoryOut,
    DuplicateCandidate
)
from backend.auth import get_current_user_optional, get_current_user
from backend.services.classifier import classifier_service
from backend.services.priority import calculate_priority
from backend.services.duplicates import find_potential_duplicates

router = APIRouter(prefix="/api/complaints", tags=["Complaints"])

def get_utc_now():
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

def generate_public_id() -> str:
    year = get_utc_now().year
    uid = uuid.uuid4().hex[:6].upper()
    return f"RX-{year}-{uid}"

@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def submit_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Run Machine Learning Category Prediction
    ai_result = classifier_service.classify(payload.title, payload.description)
    predicted_category = ai_result["predicted_category"]
    confidence = ai_result["confidence"]

    # Final category: user-selected or AI recommendation
    assigned_category = payload.category if (payload.category and payload.category.strip()) else predicted_category

    # 2. Run Priority Scoring Engine
    priority_result = calculate_priority(
        title=payload.title,
        description=payload.description,
        location=payload.location,
        affected_count=payload.affected_count,
        duration_days=payload.duration_days
    )
    priority_score = priority_result["score"]
    predicted_priority = priority_result["recommended_priority"]
    priority_explanation = priority_result["reasoning"]

    # 3. Create Unique Public Tracking ID
    public_id = generate_public_id()
    while db.query(Complaint).filter(Complaint.public_id == public_id).first():
        public_id = generate_public_id()

    # 4. Persist Complaint Record with authenticated user ownership
    user_id = current_user.id
    user_email = current_user.email
    now = get_utc_now()

    # Prevent accidental duplicate creation within a 30-second window
    recent_cutoff = now - datetime.timedelta(seconds=30)
    existing_dup = db.query(Complaint).filter(
        or_(Complaint.user_id == user_id, func.lower(Complaint.user_email) == user_email.lower()),
        Complaint.title == payload.title.strip(),
        Complaint.description == payload.description.strip(),
        Complaint.created_at >= recent_cutoff
    ).first()
    if existing_dup:
        return ComplaintOut.model_validate(existing_dup)

    complaint = Complaint(
        public_id=public_id,
        user_id=user_id,
        user_email=user_email,
        title=payload.title.strip(),
        description=payload.description.strip(),
        location=payload.location.strip(),
        category=assigned_category,
        predicted_category=predicted_category,
        classification_confidence=confidence,
        priority_score=priority_score,
        predicted_priority=predicted_priority,
        final_priority=predicted_priority,
        priority_explanation=priority_explanation,
        assigned_department=payload.assigned_department or None,
        status="Submitted",
        created_at=now,
        updated_at=now
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # 5. Add Initial Status History Entry
    history = StatusHistory(
        complaint_id=complaint.id,
        previous_status=None,
        new_status="Submitted",
        note=f"Complaint lodged by {current_user.name} ({current_user.email}). AI Category: '{predicted_category}' ({confidence*100:.1f}% confidence). Priority: '{predicted_priority}'.",
        changed_by=current_user.name,
        created_at=now
    )
    db.add(history)

    # 6. Check for Potential Duplicates and Link Relations
    dup_candidates = find_potential_duplicates(
        target_id=complaint.id,
        title=complaint.title,
        description=complaint.description,
        category=complaint.category,
        location=complaint.location,
        db=db,
        similarity_threshold=0.55
    )
    for dup in dup_candidates:
        rel = ComplaintRelation(
            complaint_id=complaint.id,
            related_complaint_id=dup["complaint_id"],
            relationship_type="duplicate_candidate",
            similarity_score=dup["similarity_score"],
            review_status="pending",
            created_at=now
        )
        db.add(rel)

    db.commit()
    db.refresh(complaint)

    return ComplaintOut.model_validate(complaint)

@router.get("", response_model=List[ComplaintOut])
def list_user_complaints(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "admin":
        complaints = db.query(Complaint).order_by(Complaint.created_at.desc()).all()
    else:
        complaints = db.query(Complaint).filter(
            or_(
                Complaint.user_id == current_user.id,
                func.lower(Complaint.user_email) == current_user.email.lower()
            )
        ).order_by(Complaint.created_at.desc()).all()
    return [ComplaintOut.model_validate(c) for c in complaints]

@router.get("/{public_id}", response_model=ComplaintOut)
def get_complaint_by_public_id(
    public_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    complaint = db.query(Complaint).filter(Complaint.public_id == public_id.strip().upper()).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No complaint found with tracking ID '{public_id}'"
        )

    # Permission check: Administrators can view all; regular users only view their own
    is_owner = (
        (complaint.user_id is not None and complaint.user_id == current_user.id) or
        (complaint.user_email and complaint.user_email.lower() == current_user.email.lower())
    )
    if current_user.role != "admin" and not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this complaint."
        )

    return ComplaintOut.model_validate(complaint)

@router.get("/{public_id}/history", response_model=List[StatusHistoryOut])
def get_complaint_history(
    public_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    complaint = db.query(Complaint).filter(Complaint.public_id == public_id.strip().upper()).first()
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No complaint found with tracking ID '{public_id}'"
        )

    # Permission check: Administrators can view all; regular users only view their own
    is_owner = (
        (complaint.user_id is not None and complaint.user_id == current_user.id) or
        (complaint.user_email and complaint.user_email.lower() == current_user.email.lower())
    )
    if current_user.role != "admin" and not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this complaint history."
        )

    return [StatusHistoryOut.model_validate(h) for h in complaint.history]
