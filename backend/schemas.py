import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, EmailStr, Field, ConfigDict

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

class FirebaseSyncRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

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
    created_at: datetime.datetime
    updated_at: datetime.datetime
    resolved_at: Optional[datetime.datetime] = None
    history: List[StatusHistoryOut] = []

    model_config = ConfigDict(from_attributes=True)

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
