import os
import re
import json
import base64
from pathlib import Path
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv
try:
    from google import genai
    from google.genai import types
    _GENAI_AVAILABLE = True
except ImportError:
    genai = None
    types = None
    _GENAI_AVAILABLE = False

# Load local environment variables from .env
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

PREF_MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash"]

VALID_CATEGORIES = {
    "Electrical and lighting",
    "Water supply",
    "Plumbing and sanitation",
    "Roads and infrastructure",
    "Classroom and laboratory facilities",
    "Internet and IT services",
    "Hostel and accommodation",
    "Cleanliness and waste management",
    "Safety and security",
    "Other",
}
VALID_PRIORITIES = {"Critical", "High", "Medium", "Low"}


def get_client():
    if not _GENAI_AVAILABLE:
        return None, "google-genai package is not installed."
    api_key = os.getenv("GEMINI_API_KEY", GEMINI_API_KEY).strip()
    if not api_key:
        return None, "GEMINI_API_KEY is not configured."
    return genai.Client(api_key=api_key), None


def _validate_photo_analysis(parsed: Dict[str, Any]) -> Optional[str]:
    required_str = ("suggested_title", "simple_report", "suggested_department", "suggested_priority")
    for field in required_str:
        val = parsed.get(field)
        if not isinstance(val, str) or not val.strip():
            return f"Missing or invalid required field '{field}' in provider response."
    if not isinstance(parsed.get("is_safety_hazard"), bool):
        return "Missing or invalid boolean field 'is_safety_hazard' in provider response."
    if parsed.get("suggested_priority") not in VALID_PRIORITIES:
        return f"Invalid 'suggested_priority' value: {parsed.get('suggested_priority')}"
    if not isinstance(parsed.get("detected_hazards", []), list):
        return "Invalid 'detected_hazards' field in provider response."
    return None


def _validate_work_verification(parsed: Dict[str, Any]) -> Optional[str]:
    if parsed.get("verdict") not in ("PROPERLY_DONE", "BADLY_DONE"):
        return f"Invalid 'verdict' value: {parsed.get('verdict')}"
    score = parsed.get("quality_score")
    if isinstance(score, bool) or not isinstance(score, (int, float)) or not (0 <= int(score) <= 100):
        return f"Invalid 'quality_score' value: {score}"
    for field in ("verdict_headline", "detailed_report", "manager_recommendation"):
        val = parsed.get(field)
        if not isinstance(val, str) or not val.strip():
            return f"Missing or invalid required field '{field}' in provider response."
    if not isinstance(parsed.get("requires_rework"), bool):
        return "Missing or invalid boolean field 'requires_rework' in provider response."
    if not isinstance(parsed.get("checklist", []), list):
        return "Invalid 'checklist' field in provider response."
    return None

def clean_json_response(raw_text: str) -> Dict[str, Any]:
    text = raw_text.strip()
    # Strip markdown code blocks ```json ... ``` or ``` ... ```
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        # Fallback regex search for { ... }
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise ValueError(f"Could not parse valid JSON from Gemini response: {raw_text[:200]}")

class GeminiVisionService:
    def __init__(self):
        self.api_key = GEMINI_API_KEY

    def analyze_complaint_image(
        self,
        image_bytes: bytes,
        mime_type: str = "image/jpeg",
        user_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Multimodal scan of an issue photo submitted by a student or reporter.
        Produces a simple language report, department suggestion, and priority assessment.
        """
        client, config_err = get_client()
        if config_err or client is None:
            return {
                "analysis_status": "unavailable",
                "error_message": config_err or "AI vision provider is not configured.",
                "suggested_title": None,
                "simple_report": None,
                "suggested_department": None,
                "suggested_priority": None,
                "is_safety_hazard": None,
                "detected_hazards": [],
                "recommended_action": None,
                "model_used": None,
            }
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

        prompt = f"""You are ComplainAI's expert campus facility and maintenance vision inspection AI.
A student or campus resident has reported an issue and uploaded this photo as visual evidence.
{f'Reporter Notes: {user_notes}' if user_notes else ''}

Examine the image carefully. Identify:
1. What facility/infrastructure element is shown (e.g., electrical socket, ceiling plaster, water pipe, bathroom commode, road pothole, lab computer).
2. What damage, failure, defect, or hazard is visible.
3. The severity of the problem and whether it presents an acute safety risk to students.

Respond ONLY with a valid JSON object matching this exact schema:
{{
  "suggested_title": "Clear, concise 5-10 word title summarizing the issue",
  "simple_report": "A 2-3 sentence plain English explanation of what is damaged or not working in simple language that any student or technician can understand",
  "suggested_department": "One of: Electrical and lighting, Water supply, Plumbing and sanitation, Roads and infrastructure, Classroom and laboratory facilities, Internet and IT services, Hostel and accommodation, Cleanliness and waste management, Safety and security, Other",
  "suggested_priority": "One of: Critical, High, Medium, Low",
  "is_safety_hazard": true or false,
  "detected_hazards": ["list of observed acute or moderate hazards, e.g. exposed live wire, water leakage, tripping risk, sharp glass"],
  "recommended_action": "Actionable 1-2 sentence recommendation on what tools or repair steps the maintenance crew needs to execute"
}}
"""

        last_err = None
        malformed_err = None
        for model_name in PREF_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[image_part, prompt]
                )
                if not response or not response.text:
                    malformed_err = f"Model {model_name} returned an empty response."
                    continue
                try:
                    parsed = clean_json_response(response.text)
                except ValueError as parse_err:
                    malformed_err = str(parse_err)
                    continue
                validation_err = _validate_photo_analysis(parsed)
                if validation_err:
                    malformed_err = validation_err
                    continue
                parsed["analysis_status"] = "completed"
                parsed["error_message"] = None
                parsed["model_used"] = model_name
                return parsed
            except Exception as e:
                last_err = e
                print(f"[Gemini Vision] Model {model_name} failed: {e}")
                continue

        if malformed_err:
            return {
                "analysis_status": "malformed",
                "error_message": malformed_err,
                "suggested_title": None,
                "simple_report": None,
                "suggested_department": None,
                "suggested_priority": None,
                "is_safety_hazard": None,
                "detected_hazards": [],
                "recommended_action": None,
                "model_used": None,
            }

        return {
            "analysis_status": "unavailable",
            "error_message": str(last_err) if last_err else "AI vision provider did not respond.",
            "suggested_title": None,
            "simple_report": None,
            "suggested_department": None,
            "suggested_priority": None,
            "is_safety_hazard": None,
            "detected_hazards": [],
            "recommended_action": None,
            "model_used": None,
        }

    def verify_work_completion(
        self,
        original_title: str,
        original_description: str,
        resolution_image_bytes: bytes,
        mime_type: str = "image/jpeg",
        worker_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Multimodal quality verification of a repair/completion photo submitted by a worker.
        Analyzes whether the work is PROPERLY_DONE or BADLY_DONE / INCOMPLETE.
        """
        client, config_err = get_client()
        if config_err or client is None:
            return {
                "verification_status": "unavailable",
                "error_message": config_err or "AI vision provider is not configured.",
                "verdict": None,
                "quality_score": None,
                "verdict_headline": None,
                "detailed_report": None,
                "checklist": [],
                "requires_rework": None,
                "manager_recommendation": None,
                "model_used": None,
            }
        image_part = types.Part.from_bytes(data=resolution_image_bytes, mime_type=mime_type)

        prompt = f"""You are ComplainAI's chief quality assurance and facility maintenance auditor.
A technician has reported that a campus maintenance job is resolved and uploaded this photo as proof of completed work.

ORIGINAL COMPLAINT DETAILS:
- Title: {original_title}
- Reported Issue: {original_description}
{f'- Technician Notes: {worker_notes}' if worker_notes else ''}

INSPECTION OBJECTIVES:
1. Examine the photo to see if the original defect has been properly fixed or replaced.
2. Check workmanship: Is it tidy, sealed, properly fastened, and safe? Or are there exposed wires, unfinished plaster, leaking joints, leftover debris, or dangerous temporary patches?
3. Judge whether the job is PROPERLY DONE (Pass) or BADLY DONE / INCOMPLETE (Fail).

Respond ONLY with a valid JSON object matching this exact schema:
{{
  "verdict": "PROPERLY_DONE" or "BADLY_DONE",
  "quality_score": integer between 0 and 100,
  "verdict_headline": "Short 1-sentence verdict, e.g. 'Work Successfully Completed & Verified Safe' or 'Deficient Workmanship: Loose wiring remains uninsulated'",
  "detailed_report": "2-3 sentences in simple, objective language describing what was observed in the completion photo and whether it meets campus safety and quality standards",
  "checklist": [
    {{"item": "Core Defect Remediation", "passed": true or false, "note": "Observation"}},
    {{"item": "Workmanship & Finishing", "passed": true or false, "note": "Observation"}},
    {{"item": "Safety Compliance & Hazard Elimination", "passed": true or false, "note": "Observation"}},
    {{"item": "Debris & Cleanliness", "passed": true or false, "note": "Observation"}}
  ],
  "requires_rework": true or false,
  "manager_recommendation": "One of: 'Approve & Close Ticket' or 'Reject Work Order & Dispatch for Rework'"
}}
"""

        last_err = None
        malformed_err = None
        for model_name in PREF_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[image_part, prompt]
                )
                if not response or not response.text:
                    malformed_err = f"Model {model_name} returned an empty response."
                    continue
                try:
                    parsed = clean_json_response(response.text)
                except ValueError as parse_err:
                    malformed_err = str(parse_err)
                    continue
                validation_err = _validate_work_verification(parsed)
                if validation_err:
                    malformed_err = validation_err
                    continue
                parsed["quality_score"] = int(parsed["quality_score"])
                parsed["verification_status"] = "completed"
                parsed["error_message"] = None
                parsed["model_used"] = model_name
                return parsed
            except Exception as e:
                last_err = e
                print(f"[Gemini QA] Model {model_name} failed: {e}")
                continue

        if malformed_err:
            return {
                "verification_status": "malformed",
                "error_message": malformed_err,
                "verdict": None,
                "quality_score": None,
                "verdict_headline": None,
                "detailed_report": None,
                "checklist": [],
                "requires_rework": None,
                "manager_recommendation": None,
                "model_used": None,
            }

        return {
            "verification_status": "unavailable",
            "error_message": str(last_err) if last_err else "AI vision provider did not respond.",
            "verdict": None,
            "quality_score": None,
            "verdict_headline": None,
            "detailed_report": None,
            "checklist": [],
            "requires_rework": None,
            "manager_recommendation": None,
            "model_used": None,
        }

gemini_vision_service = GeminiVisionService()
