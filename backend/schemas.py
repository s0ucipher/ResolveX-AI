import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_serializer


def _serialize_utc(dt: Optional[datetime.datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    else:
        dt = dt.astimezone(datetime.timezone.utc)
    return dt.isoformat()

# --- User Schemas ---

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime.datetime
    firebase_uid: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime.datetime) -> Optional[str]:
        return _serialize_utc(dt)

class FirebaseSyncRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    department: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
    role: Optional[str] = None

# --- Status History Schema ---

class StatusHistoryOut(BaseModel):
    id: int
    complaint_id: int
    previous_status: Optional[str]
    new_status: str
    note: Optional[str]
    changed_by: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime.datetime) -> Optional[str]:
        return _serialize_utc(dt)

# --- Complaint Schemas ---

class ComplaintCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=15, max_length=4000)
    location: str = Field(..., min_length=3, max_length=150)
    category: Optional[str] = None  # None = let AI predict
    assigned_department: Optional[str] = None
    affected_count: Optional[int] = Field(None, ge=1, le=10000)
    duration_days: Optional[int] = Field(None, ge=0, le=365)
    user_email: Optional[EmailStr] = None
    photo_url: Optional[str] = None
    photo_analysis: Optional[str] = None
    idempotency_key: Optional[str] = Field(None, max_length=64)

class StatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None
    rejection_reason: Optional[str] = None
    resolution_notes: Optional[str] = None

class CategoryOverride(BaseModel):
    category: str
    reason: Optional[str] = None

class PriorityOverride(BaseModel):
    priority: str
    reason: Optional[str] = None

class DepartmentAssign(BaseModel):
    department: str
    note: Optional[str] = None

class ComplaintRelationOut(BaseModel):
    id: int
    complaint_id: int
    related_complaint_id: int
    relationship_type: str
    similarity_score: float
    review_status: str
    created_at: datetime.datetime
    related_title: Optional[str] = None
    related_public_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ComplaintOut(BaseModel):
    id: int
    public_id: str
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    title: str
    description: str
    location: str
    category: str
    predicted_category: str
    classification_confidence: Optional[float] = None
    priority_score: int
    predicted_priority: str
    final_priority: str
    priority_explanation: str
    assigned_department: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    resolution_notes: Optional[str] = None
    photo_url: Optional[str] = None
    photo_analysis: Optional[str] = None
    idempotency_key: Optional[str] = Field(None, max_length=64)
    resolution_photo_url: Optional[str] = None
    resolution_quality_status: Optional[str] = None
    resolution_quality_report: Optional[str] = None
    resolution_quality_score: Optional[int] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    resolved_at: Optional[datetime.datetime] = None
    history: List[StatusHistoryOut] = []

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("created_at", "updated_at", "resolved_at")
    def serialize_datetimes(self, dt: Optional[datetime.datetime]) -> Optional[str]:
        return _serialize_utc(dt)

# --- AI Prediction Schemas ---

class ClassifyRequest(BaseModel):
    title: str
    description: str

class ClassifyResponse(BaseModel):
    predicted_category: str
    confidence: float
    is_uncertain: bool
    uncertainty_note: Optional[str] = None
    influential_features: List[str]
    category_probabilities: Dict[str, float]

class PriorityFactorItem(BaseModel):
    factor: str
    points: int
    max_points: int
    reason: str

class PriorityPredictRequest(BaseModel):
    title: str
    description: str
    location: Optional[str] = None
    affected_count: Optional[int] = None
    duration_days: Optional[int] = None

class PriorityPredictResponse(BaseModel):
    recommended_priority: str
    score: int
    factors: List[PriorityFactorItem]
    reasoning: str
    requires_immediate_review: bool

class DuplicateCandidate(BaseModel):
    complaint_id: int
    public_id: str
    title: str
    category: str
    location: str
    status: str
    similarity_score: float
    explanation: str

# --- Gemini Multimodal Vision Schemas ---

class PhotoAnalysisRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded image data or data URI")
    mime_type: Optional[str] = "image/jpeg"
    user_notes: Optional[str] = None

class PhotoAnalysisResponse(BaseModel):
    analysis_status: str = "completed"  # completed, unavailable, malformed
    error_message: Optional[str] = None
    suggested_title: Optional[str] = None
    simple_report: Optional[str] = None
    suggested_department: Optional[str] = None
    suggested_priority: Optional[str] = None
    is_safety_hazard: Optional[bool] = None
    detected_hazards: List[str] = []
    recommended_action: Optional[str] = None
    model_used: Optional[str] = None

class WorkVerificationChecklistItem(BaseModel):
    item: str
    passed: bool
    note: str

class WorkVerificationRequest(BaseModel):
    original_title: str
    original_description: str
    resolution_image_base64: str = Field(..., description="Base64 encoded completion photo")
    mime_type: Optional[str] = "image/jpeg"
    worker_notes: Optional[str] = None

class WorkVerificationResponse(BaseModel):
    verification_status: str = "completed"  # completed, unavailable, malformed
    error_message: Optional[str] = None
    verdict: Optional[str] = None  # PROPERLY_DONE or BADLY_DONE
    quality_score: Optional[int] = None  # 0 to 100
    verdict_headline: Optional[str] = None
    detailed_report: Optional[str] = None
    checklist: List[WorkVerificationChecklistItem] = []
    requires_rework: Optional[bool] = None
    manager_recommendation: Optional[str] = None
    model_used: Optional[str] = None

class ResolutionSubmissionRequest(BaseModel):
    status: str = "Resolved"
    resolution_notes: str
    resolution_photo_base64: Optional[str] = None
    mime_type: Optional[str] = "image/jpeg"
    run_gemini_verification: bool = True
    manual_signoff: bool = False

class ScannedReportRequest(BaseModel):
    raw_text: str = Field(..., min_length=10, description="Raw OCR or scanned report text")
    filename: Optional[str] = None

class ScannedReportResponse(BaseModel):
    extracted_title: str
    extracted_description: str
    extracted_location: Optional[str] = None
    extracted_affected_count: Optional[int] = None
    predicted_category: str
    confidence: float
    critical_rank: str
    critical_score: int
    is_acute_emergency: bool
    detected_hazards: List[str]
    dispatch_recommendation: str
    factors: List[PriorityFactorItem]
    reasoning: str

# --- Analytics Schemas ---

class AnalyticsSummary(BaseModel):
    total_complaints: int
    open_complaints: int
    in_progress_complaints: int
    resolved_complaints: int
    high_critical_complaints: int
    critical_complaints: int
    avg_resolution_hours: Optional[float] = None

class ChartDataPoint(BaseModel):
    name: str
    value: int
    percentage: Optional[float] = None
