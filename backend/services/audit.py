import datetime
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.models import Complaint, StatusHistory

VALID_TRANSITIONS = {
    "Submitted": ["Under Review", "Assigned", "Rejected"],
    "Under Review": ["Assigned", "In Progress", "Resolved", "Rejected"],
    "Assigned": ["In Progress", "Under Review", "Resolved", "Rejected"],
    "In Progress": ["Resolved", "Under Review", "Rejected"],
    "Resolved": ["Reopened"],
    "Reopened": ["In Progress", "Under Review", "Assigned"],
    "Rejected": ["Under Review", "Submitted"]
}

def get_utc_now():
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

def transition_complaint_status(
    complaint: Complaint,
    new_status: str,
    changed_by: str,
    note: Optional[str],
    rejection_reason: Optional[str],
    resolution_notes: Optional[str],
    db: Session
) -> Complaint:
    current_status = complaint.status
    now = get_utc_now()

    if current_status == new_status:
        if note:
            history = StatusHistory(
                complaint_id=complaint.id,
                previous_status=current_status,
                new_status=new_status,
                note=note,
                changed_by=changed_by,
                created_at=now
            )
            db.add(history)
            complaint.updated_at = now
            db.commit()
            db.refresh(complaint)
        return complaint

    allowed = VALID_TRANSITIONS.get(current_status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from '{current_status}' to '{new_status}'. Permitted transitions: {', '.join(allowed) or 'None'}"
        )

    previous_status = complaint.status
    complaint.status = new_status
    complaint.updated_at = now

    if new_status == "Resolved":
        complaint.resolved_at = now
        if resolution_notes:
            complaint.resolution_notes = resolution_notes
    elif new_status == "Rejected":
        if not rejection_reason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A valid rejection reason is required when rejecting a complaint."
            )
        complaint.rejection_reason = rejection_reason

    history_entry = StatusHistory(
        complaint_id=complaint.id,
        previous_status=previous_status,
        new_status=new_status,
        note=note or (f"Status transitioned from {previous_status} to {new_status} by {changed_by}."),
        changed_by=changed_by,
        created_at=now
    )
    db.add(history_entry)
    db.commit()
    db.refresh(complaint)
    return complaint
