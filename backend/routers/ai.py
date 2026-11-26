import os
import re
import json
import base64
from fastapi import APIRouter, Depends, HTTPException
from backend.schemas import (
    ClassifyRequest,
    ClassifyResponse,
    PriorityPredictRequest,
    PriorityPredictResponse,
    ScannedReportRequest,
    ScannedReportResponse,
    PriorityFactorItem,
    PhotoAnalysisRequest,
    PhotoAnalysisResponse,
    WorkVerificationRequest,
    WorkVerificationResponse,
    WorkVerificationChecklistItem
)
from backend.services.classifier import classifier_service
from backend.services.priority import (
    calculate_priority,
    CRITICAL_SAFETY_KEYWORDS,
    MODERATE_SAFETY_KEYWORDS
)
from backend.services.gemini_service import gemini_vision_service
from backend.ml.train import REPORT_JSON_PATH
from backend.auth import get_current_user

router = APIRouter(prefix="/api/ai", tags=["AI & Machine Learning"], dependencies=[Depends(get_current_user)])

@router.post("/classify", response_model=ClassifyResponse)
def test_classification(payload: ClassifyRequest):
    result = classifier_service.classify(payload.title, payload.description)
    return ClassifyResponse(**result)

@router.post("/predict-priority", response_model=PriorityPredictResponse)
def test_priority(payload: PriorityPredictRequest):
    result = calculate_priority(
        title=payload.title,
        description=payload.description,
        location=payload.location,
        affected_count=payload.affected_count,
        duration_days=payload.duration_days
    )
    return PriorityPredictResponse(**result)

@router.post("/scan-report", response_model=ScannedReportResponse)
def analyze_scanned_report(payload: ScannedReportRequest):
    lines = [line.strip() for line in payload.raw_text.splitlines() if line.strip()]
    full_text = payload.raw_text.strip()
    
    # 1. Extract potential location
    detected_location = None
    location_patterns = [
        r"(?:location|venue|site|block|room|lab|hostel|hall)\s*[:=-]\s*([^\n\r,;]+)",
        r"([A-Za-z0-9\s\-]+(?:Block|Hostel|Lab|Building|Floor|Hall|Auditorium|Complex)[A-Za-z0-9\s\-]*)",
    ]
    for pat in location_patterns:
        match = re.search(pat, full_text, re.IGNORECASE)
        if match:
            cand = match.group(1).strip()
            if len(cand) >= 4 and len(cand) <= 80:
                detected_location = cand
                break
    
    # 2. Extract affected count if mentioned
    detected_count = None
    count_match = re.search(r"(\d+)\s*(?:students|people|occupants|persons|residents|users|staff)", full_text, re.IGNORECASE)
    if count_match:
        try:
            detected_count = int(count_match.group(1))
        except ValueError:
            pass
            
    # 3. Formulate title and description
    title = ""
    for line in lines:
        cleaned = re.sub(r"^(?:report|incident|complaint|title|subject|issue)\s*[:=-]\s*", "", line, flags=re.IGNORECASE).strip()
        if len(cleaned) >= 5 and not cleaned.lower().startswith("date:") and not cleaned.lower().startswith("location:"):
            title = cleaned[:100]
            break
    if not title:
        title = lines[0][:80] if lines else "Scanned Maintenance Incident Report"
        
    description = full_text
    
    # 4. Classify via NLP
    cat_result = classifier_service.classify(title, description)
    
    # 5. Calculate Priority & Critical Ranking
    prio_result = calculate_priority(
        title=title,
        description=description,
        location=detected_location,
        affected_count=detected_count
    )
    
    # 6. Detect specific safety hazards
    lower_text = full_text.lower()
    found_hazards = []
    for kw in CRITICAL_SAFETY_KEYWORDS:
        if kw in lower_text:
            found_hazards.append(f"Critical: {kw}")
    for kw in MODERATE_SAFETY_KEYWORDS:
        if kw in lower_text:
            found_hazards.append(f"Moderate: {kw}")
            
    is_acute = prio_result["recommended_priority"] == "Critical" or prio_result["score"] >= 80
    if is_acute:
        dispatch_rec = "EMERGENCY ACTION REQUIRED: Immediate technician dispatch warranted due to acute safety or structural hazard."
    elif prio_result["recommended_priority"] == "High":
        dispatch_rec = "HIGH PRIORITY: Schedule technician dispatch within 4 hours to prevent operational escalation."
    else:
        dispatch_rec = "STANDARD TRIAGE: Route to designated departmental queue for routine work order fulfillment."

    return ScannedReportResponse(
        extracted_title=title,
        extracted_description=description,
        extracted_location=detected_location,
        extracted_affected_count=detected_count,
        predicted_category=cat_result["predicted_category"],
        confidence=cat_result["confidence"],
        critical_rank=prio_result["recommended_priority"],
        critical_score=prio_result["score"],
        is_acute_emergency=is_acute,
        detected_hazards=found_hazards,
        dispatch_recommendation=dispatch_rec,
        factors=[PriorityFactorItem(**f) for f in prio_result["factors"]],
        reasoning=prio_result["reasoning"]
    )

def decode_base64_image(data_str: str, default_mime: str = "image/jpeg") -> tuple:
    try:
        clean_str = data_str.strip()
        mime = default_mime
        if "," in clean_str and "base64" in clean_str:
            header, b64data = clean_str.split(",", 1)
            if "image/png" in header:
                mime = "image/png"
            elif "image/webp" in header:
                mime = "image/webp"
            elif "image/gif" in header:
                mime = "image/gif"
            elif "image/jpeg" in header or "image/jpg" in header:
                mime = "image/jpeg"
            return base64.b64decode(b64data), mime
        return base64.b64decode(clean_str), mime
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 image data: {str(e)}")

@router.post("/analyze-photo", response_model=PhotoAnalysisResponse)
def analyze_issue_photo(payload: PhotoAnalysisRequest):
    img_bytes, mime = decode_base64_image(payload.image_base64, payload.mime_type or "image/jpeg")
    res = gemini_vision_service.analyze_complaint_image(
        image_bytes=img_bytes,
        mime_type=mime,
        user_notes=payload.user_notes
    )
    return PhotoAnalysisResponse(
        analysis_status=res.get("analysis_status", "unavailable"),
        error_message=res.get("error_message"),
        suggested_title=res.get("suggested_title"),
        simple_report=res.get("simple_report"),
        suggested_department=res.get("suggested_department"),
        suggested_priority=res.get("suggested_priority"),
        is_safety_hazard=res.get("is_safety_hazard"),
        detected_hazards=res.get("detected_hazards") or [],
        recommended_action=res.get("recommended_action"),
        model_used=res.get("model_used"),
    )

@router.post("/verify-work", response_model=WorkVerificationResponse)
def verify_resolution_photo(payload: WorkVerificationRequest):
    img_bytes, mime = decode_base64_image(payload.resolution_image_base64, payload.mime_type or "image/jpeg")
    res = gemini_vision_service.verify_work_completion(
        original_title=payload.original_title,
        original_description=payload.original_description,
        resolution_image_bytes=img_bytes,
        mime_type=mime,
        worker_notes=payload.worker_notes
    )
    checklist_items = [
        WorkVerificationChecklistItem(
            item=item.get("item", "Quality Check"),
            passed=bool(item.get("passed", False)),
            note=item.get("note", "")
        )
        for item in (res.get("checklist") or [])
        if isinstance(item, dict)
    ]
    raw_score = res.get("quality_score")
    return WorkVerificationResponse(
        verification_status=res.get("verification_status", "unavailable"),
        error_message=res.get("error_message"),
        verdict=res.get("verdict"),
        quality_score=int(raw_score) if raw_score is not None else None,
        verdict_headline=res.get("verdict_headline"),
        detailed_report=res.get("detailed_report"),
        checklist=checklist_items,
        requires_rework=res.get("requires_rework"),
        manager_recommendation=res.get("manager_recommendation"),
        model_used=res.get("model_used"),
    )

@router.get("/model-info")
def get_model_info():
    if os.path.exists(REPORT_JSON_PATH):
        with open(REPORT_JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "status": "unavailable",
        "message": "Evaluation report has not been generated yet. Run backend/ml/train.py to generate it.",
        "dataset": None,
        "metrics": None,
        "model_architecture": {
            "vectorizer": "TF-IDF (ngram_range=(1,2), sublinear_tf=True)",
            "classifier": "LogisticRegression (balanced class weights)"
        }
    }

