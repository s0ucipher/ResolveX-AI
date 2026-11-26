import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.database import get_db
from backend.models import Complaint, StatusHistory, ComplaintRelation, User
from backend.schemas import (
    ComplaintOut,
    StatusUpdate,
    CategoryOverride,
    PriorityOverride,
    DepartmentAssign,
    ComplaintRelationOut,
    DuplicateCandidate,
    ResolutionSubmissionRequest
)
from backend.auth import get_current_admin
from backend.services.audit import transition_complaint_status
from backend.services.duplicates import find_potential_duplicates
from backend.services.gemini_service import gemini_vision_service

router = APIRouter(prefix="/api/admin", tags=["Admin Operations"], dependencies=[Depends(get_current_admin)])

def get_utc_now():
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

@router.get("/complaints")
def list_admin_complaints(
    query: Optional[str] = Query(None, description="Search term for title, description, location or tracking ID"),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    q = db.query(Complaint)

    if query and query.strip():
        term = f"%{query.strip()}%"
        q = q.filter(
            or_(
                Complaint.public_id.ilike(term),
                Complaint.title.ilike(term),
                Complaint.description.ilike(term),
                Complaint.location.ilike(term)
            )
        )

    if category and category.strip():
        q = q.filter(Complaint.category == category.strip())

    if priority and priority.strip():
        q = q.filter(Complaint.final_priority == priority.strip())

    if status and status.strip():
        q = q.filter(Complaint.status == status.strip())

    if department and department.strip():
        q = q.filter(Complaint.assigned_department == department.strip())

    total = q.count()
    items = q.order_by(Complaint.created_at.desc(), Complaint.id.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": [ComplaintOut.model_validate(c) for c in items]
    }

@router.patch("/complaints/{public_id}/status", response_model=ComplaintOut)
def update_status(
    public_id: str,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    complaint = db.query(Complaint).filter(Complaint.public_id == public_id.strip().upper()).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    updated = transition_complaint_status(
        complaint=complaint,
        new_status=payload.status,
        changed_by=f"Admin ({admin.name})",
        note=payload.note,
        rejection_reason=payload.rejection_reason,
        resolution_notes=payload.resolution_notes,
        db=db
    )
    return ComplaintOut.model_validate(updated)

@router.post("/complaints/{public_id}/verify-resolution", response_model=ComplaintOut)
def verify_and_resolve_complaint(
    public_id: str,
    payload: ResolutionSubmissionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    import base64
    complaint = db.query(Complaint).filter(Complaint.public_id == public_id.strip().upper()).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    gemini_result = None
    if payload.resolution_photo_base64 and payload.run_gemini_verification:
        try:
            clean_str = payload.resolution_photo_base64.strip()
            mime = payload.mime_type or "image/jpeg"
            if "," in clean_str and "base64" in clean_str:
                _, b64data = clean_str.split(",", 1)
                img_bytes = base64.b64decode(b64data)
            else:
                img_bytes = base64.b64decode(clean_str)

            gemini_result = gemini_vision_service.verify_work_completion(
                original_title=complaint.title,
                original_description=complaint.description,
                resolution_image_bytes=img_bytes,
                mime_type=mime,
                worker_notes=payload.resolution_notes
            )
        except Exception as e:
            print(f"[Gemini Verification Error] {e}")
            gemini_result = {"verification_status": "unavailable", "error_message": str(e)}

    # Update complaint resolution fields inside the same transaction as status transition
    complaint.resolution_notes = payload.resolution_notes
    if payload.resolution_photo_base64:
        complaint.resolution_photo_url = payload.resolution_photo_base64

    is_ai_completed = bool(gemini_result and gemini_result.get("verification_status") == "completed")
    if is_ai_completed:
        complaint.resolution_quality_status = gemini_result.get("verdict")
        complaint.resolution_quality_report = gemini_result.get("detailed_report")
        complaint.resolution_quality_score = (
            int(gemini_result["quality_score"]) if gemini_result.get("quality_score") is not None else None
        )
    elif payload.resolution_photo_base64:
        complaint.resolution_quality_status = "MANUAL_REVIEW_ONLY"
        complaint.resolution_quality_score = None
        if gemini_result and gemini_result.get("error_message"):
            complaint.resolution_quality_report = (
                f"Automated verification {gemini_result.get('verification_status', 'unavailable')}: "
                f"{gemini_result.get('error_message')}. Signed off manually by Admin ({admin.name})."
            )
        else:
            complaint.resolution_quality_report = f"Manual inspection and sign-off by Admin ({admin.name})."
    else:
        complaint.resolution_quality_status = None
        complaint.resolution_quality_score = None
        complaint.resolution_quality_report = None

    note_text = f"Resolution signed off by Admin ({admin.name})."
    if is_ai_completed:
        note_text += (
            f" Gemini QA Verdict: {gemini_result.get('verdict')} "
            f"(Score: {gemini_result.get('quality_score')}/100) - {gemini_result.get('verdict_headline')}."
        )
    elif payload.resolution_photo_base64:
        note_text += " Photo attached; manual administrator review recorded (no automated AI score)."

    updated = transition_complaint_status(
        complaint=complaint,
        new_status=payload.status,
        changed_by=f"Admin ({admin.name})",
        note=note_text,
        rejection_reason=payload.rejection_reason if hasattr(payload, "rejection_reason") else None,
        resolution_notes=payload.resolution_notes,
        db=db
    )
    return ComplaintOut.model_validate(updated)

@router.patch("/complaints/{public_id}/category", response_model=ComplaintOut)
def override_category(
    public_id: str,
    payload: CategoryOverride,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    complaint = db.query(Complaint).filter(Complaint.public_id == public_id.strip().upper()).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    old_cat = complaint.category
    new_cat = payload.category.strip()
    if not payload.reason or not payload.reason.strip():
        raise HTTPException(status_code=400, detail="Correction or verification reason is mandatory.")

    now = get_utc_now()
    complaint.category = new_cat
    complaint.updated_at = now

    if old_cat != new_cat:
        note_text = f"Category updated from '{old_cat}' to '{new_cat}' by Admin ({admin.name}). Reason: {payload.reason.strip()}"
    else:
        note_text = f"Category review confirmed '{new_cat}' by Admin ({admin.name}). Reason: {payload.reason.strip()}"

    history = StatusHistory(
        complaint_id=complaint.id,
        previous_status=complaint.status,
        new_status=complaint.status,
        note=note_text,
        changed_by=f"Admin ({admin.name})",
        created_at=now
    )
    db.add(history)
    db.commit()
    db.refresh(complaint)
    return ComplaintOut.model_validate(complaint)

@router.patch("/complaints/{public_id}/priority", response_model=ComplaintOut)
def override_priority(
    public_id: str,
    payload: PriorityOverride,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    complaint = db.query(Complaint).filter(Complaint.public_id == public_id.strip().upper()).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if payload.priority not in ["Critical", "High", "Medium", "Low"]:
        raise HTTPException(status_code=400, detail="Priority must be Critical, High, Medium, or Low")

    old_priority = complaint.final_priority
    new_priority = payload.priority.strip()
    if not payload.reason or not payload.reason.strip():
        raise HTTPException(status_code=400, detail="Justification or review reason is mandatory.")

    now = get_utc_now()
    complaint.final_priority = new_priority
    complaint.updated_at = now

    if old_priority != new_priority:
        note_text = f"Priority overridden from '{old_priority}' to '{new_priority}' by Admin ({admin.name}). Justification: {payload.reason.strip()}"
    else:
        note_text = f"Priority review confirmed '{new_priority}' by Admin ({admin.name}). Justification: {payload.reason.strip()}"

    history = StatusHistory(
        complaint_id=complaint.id,
        previous_status=complaint.status,
        new_status=complaint.status,
        note=note_text,
        changed_by=f"Admin ({admin.name})",
        created_at=now
    )
    db.add(history)
    db.commit()
    db.refresh(complaint)
    return ComplaintOut.model_validate(complaint)

@router.patch("/complaints/{public_id}/assign", response_model=ComplaintOut)
def assign_department(
    public_id: str,
    payload: DepartmentAssign,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    complaint = db.query(Complaint).filter(Complaint.public_id == public_id.strip().upper()).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    dept = payload.department.strip()
    if not payload.note or not payload.note.strip():
        raise HTTPException(status_code=400, detail="Dispatch note or assigned technician details are mandatory.")

    old_dept = complaint.assigned_department or "Unassigned"
    old_status = complaint.status
    now = get_utc_now()
    complaint.assigned_department = dept
    complaint.updated_at = now

    # Automatically move to 'Assigned' if currently 'Submitted', 'Under Review', or 'Rejected'
    if complaint.status in ["Submitted", "Under Review", "Rejected"]:
        complaint.status = "Assigned"

    if old_status == "Rejected":
        note_text = f"Ticket restored from Rejected and assigned to department '{dept}' by Admin ({admin.name}). Note: {payload.note.strip()}"
    else:
        note_text = f"Assigned to department '{dept}' (previously {old_dept}) by Admin ({admin.name}). Note: {payload.note.strip()}"

    history = StatusHistory(
        complaint_id=complaint.id,
        previous_status=old_status,
        new_status=complaint.status,
        note=note_text,
        changed_by=f"Admin ({admin.name})",
        created_at=now
    )
    db.add(history)
    db.commit()
    db.refresh(complaint)
    return ComplaintOut.model_validate(complaint)

@router.get("/complaints/{public_id}/duplicates", response_model=List[DuplicateCandidate])
def get_complaint_duplicates(
    public_id: str,
    db: Session = Depends(get_db)
):
    complaint = db.query(Complaint).filter(Complaint.public_id == public_id.strip().upper()).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    duplicates = find_potential_duplicates(
        target_id=complaint.id,
        title=complaint.title,
        description=complaint.description,
        category=complaint.category,
        location=complaint.location,
        db=db,
        similarity_threshold=0.45,
        limit=5
    )
    return duplicates
