import os
import json
from fastapi import APIRouter, Depends
from backend.schemas import (
    ClassifyRequest,
    ClassifyResponse,
    PriorityPredictRequest,
    PriorityPredictResponse
)
from backend.services.classifier import classifier_service
from backend.services.priority import calculate_priority
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

@router.get("/model-info")
def get_model_info():
    if os.path.exists(REPORT_JSON_PATH):
        with open(REPORT_JSON_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "status": "Evaluation report pending training",
        "model_architecture": {
            "vectorizer": "TF-IDF (ngram_range=(1,2), sublinear_tf=True)",
            "classifier": "LogisticRegression (balanced class weights)"
        }
    }

