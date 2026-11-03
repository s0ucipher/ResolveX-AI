from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import get_db
from backend.models import Complaint
from backend.schemas import AnalyticsSummary, ChartDataPoint

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/summary", response_model=AnalyticsSummary)
def get_analytics_summary(db: Session = Depends(get_db)):
    total = db.query(Complaint).count()
    open_c = db.query(Complaint).filter(Complaint.status.in_(["Submitted", "Under Review", "Assigned"])).count()
    in_prog = db.query(Complaint).filter(Complaint.status == "In Progress").count()
    resolved = db.query(Complaint).filter(Complaint.status == "Resolved").count()
    critical = db.query(Complaint).filter(Complaint.final_priority == "Critical").count()
    high_critical = db.query(Complaint).filter(Complaint.final_priority.in_(["High", "Critical"])).count()

    # Calculate average resolution time for resolved complaints
    resolved_cases = db.query(Complaint).filter(
        Complaint.status == "Resolved",
        Complaint.resolved_at.isnot(None)
    ).all()

    avg_hours = None
    if resolved_cases:
        diffs = [
            (c.resolved_at - c.created_at).total_seconds() / 3600.0
            for c in resolved_cases if c.resolved_at and c.created_at
        ]
        if diffs:
            avg_hours = round(sum(diffs) / len(diffs), 1)

    return AnalyticsSummary(
        total_complaints=total,
        open_complaints=open_c,
        in_progress_complaints=in_prog,
        resolved_complaints=resolved,
        high_critical_complaints=high_critical,
        critical_complaints=critical,
        avg_resolution_hours=avg_hours
    )

@router.get("/categories", response_model=List[ChartDataPoint])
def get_category_distribution(db: Session = Depends(get_db)):
    total = db.query(Complaint).count()
    counts = db.query(
        Complaint.category,
        func.count(Complaint.id).label("cnt")
    ).group_by(Complaint.category).order_by(func.count(Complaint.id).desc()).all()

    return [
        ChartDataPoint(
            name=cat or "Other",
            value=cnt,
            percentage=round((cnt / total * 100), 1) if total > 0 else 0.0
        )
        for cat, cnt in counts
    ]

@router.get("/statuses", response_model=List[ChartDataPoint])
def get_status_distribution(db: Session = Depends(get_db)):
    counts = db.query(
        Complaint.status,
        func.count(Complaint.id).label("cnt")
    ).group_by(Complaint.status).all()

    return [
        ChartDataPoint(name=status, value=cnt)
        for status, cnt in counts
    ]

@router.get("/priorities", response_model=List[ChartDataPoint])
def get_priority_distribution(db: Session = Depends(get_db)):
    order = ["Critical", "High", "Medium", "Low"]
    counts = dict(
        db.query(
            Complaint.final_priority,
            func.count(Complaint.id)
        ).group_by(Complaint.final_priority).all()
    )

    return [
        ChartDataPoint(name=p, value=counts.get(p, 0))
        for p in order
    ]

@router.get("/locations", response_model=List[ChartDataPoint])
def get_location_distribution(db: Session = Depends(get_db)):
    counts = db.query(
        Complaint.location,
        func.count(Complaint.id).label("cnt")
    ).group_by(Complaint.location).order_by(func.count(Complaint.id).desc()).limit(8).all()

    return [
        ChartDataPoint(name=loc or "Unspecified", value=cnt)
        for loc, cnt in counts
    ]

