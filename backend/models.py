import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String(128), unique=True, index=True, nullable=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(20), default="user", nullable=False)  # "user" or "admin"
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    complaints = relationship("Complaint", back_populates="user")

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(32), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    user_email = Column(String(120), nullable=True)

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String(150), nullable=False)
    
    # Category: actual assigned/confirmed category
    category = Column(String(100), nullable=False)
    predicted_category = Column(String(100), nullable=False)
    classification_confidence = Column(Float, nullable=True)

    # Priority
    priority_score = Column(Integer, default=0, nullable=False)
    predicted_priority = Column(String(20), nullable=False)
    final_priority = Column(String(20), nullable=False)
    priority_explanation = Column(Text, nullable=False)

    assigned_department = Column(String(100), nullable=True)
    status = Column(String(30), default="Submitted", nullable=False, index=True)
    
    # Administrative updates & notes
    rejection_reason = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="complaints")
    history = relationship("StatusHistory", back_populates="complaint", cascade="all, delete-orphan", order_by="StatusHistory.created_at.desc()")
    relations = relationship("ComplaintRelation", foreign_keys="ComplaintRelation.complaint_id", back_populates="complaint", cascade="all, delete-orphan")

class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    note = Column(Text, nullable=True)
    changed_by = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    complaint = relationship("Complaint", back_populates="history")

class ComplaintRelation(Base):
    __tablename__ = "complaint_relations"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    related_complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    relationship_type = Column(String(50), default="duplicate_candidate", nullable=False)
    similarity_score = Column(Float, nullable=False)
    review_status = Column(String(20), default="pending", nullable=False)  # pending, confirmed, dismissed
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    complaint = relationship("Complaint", foreign_keys=[complaint_id], back_populates="relations")
    related_complaint = relationship("Complaint", foreign_keys=[related_complaint_id])

