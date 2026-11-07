import os
import json
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("complainai.firebase")

_firebase_app = None
_firebase_initialized = False

def init_firebase_admin():
    global _firebase_app, _firebase_initialized
    if _firebase_initialized:
        return _firebase_app

    try:
        import firebase_admin
        from firebase_admin import credentials

        if firebase_admin._apps:
            _firebase_app = firebase_admin.get_app()
            _firebase_initialized = True
            return _firebase_app

        cred = None

        # 1. Check for complete JSON string in environment variable (Render recommended)
        service_json_str = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if service_json_str and service_json_str.strip():
            try:
                cert_dict = json.loads(service_json_str)
                cred = credentials.Certificate(cert_dict)
                logger.info("Initializing Firebase Admin SDK using FIREBASE_SERVICE_ACCOUNT_JSON.")
            except Exception as e:
                logger.error(f"Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: {e}")

        # 2. Check for discrete environment variables (Render friendly)
        if not cred:
            project_id = os.getenv("FIREBASE_PROJECT_ID")
            client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
            private_key = os.getenv("FIREBASE_PRIVATE_KEY")

            if project_id and client_email and private_key:
                try:
                    # Clean escaped newlines if passed through environment strings
                    cleaned_key = private_key.replace("\\n", "\n")
                    cert_dict = {
                        "type": "service_account",
                        "project_id": project_id,
                        "private_key": cleaned_key,
                        "client_email": client_email,
                        "token_uri": "https://oauth2.googleapis.com/token",
                    }
                    cred = credentials.Certificate(cert_dict)
                    logger.info("Initializing Firebase Admin SDK using discrete environment variables.")
                except Exception as e:
                    logger.error(f"Failed to initialize credentials from discrete env vars: {e}")

        # 3. Check for service account file path
        if not cred:
            cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            if cred_path and os.path.exists(cred_path):
                try:
                    cred = credentials.Certificate(cred_path)
                    logger.info(f"Initializing Firebase Admin SDK from file: {cred_path}")
                except Exception as e:
                    logger.error(f"Failed to load certificate from path {cred_path}: {e}")

        # 4. Fallback: Initialize with Project ID only (for Google Cloud / Render environments with default credentials)
        project_id = os.getenv("FIREBASE_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT")
        if cred:
            _firebase_app = firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            logger.info("Firebase Admin SDK successfully initialized.")
        elif project_id:
            try:
                _firebase_app = firebase_admin.initialize_app(options={"projectId": project_id})
                _firebase_initialized = True
                logger.info(f"Firebase Admin SDK initialized with project ID: {project_id}")
            except Exception as e:
                logger.warning(f"Could not initialize Firebase Admin SDK with project ID: {e}")
        else:
            logger.info("Firebase Admin credentials not set. Backend will support both demo/local JWT tokens and Firebase once credentials are provided.")

        return _firebase_app
    except Exception as e:
        logger.warning(f"Firebase Admin SDK setup notice: {e}")
        return None

# Attempt initialization on module load
init_firebase_admin()

def is_firebase_admin_initialized() -> bool:
    try:
        import firebase_admin
        return bool(firebase_admin._apps)
    except Exception:
        return False

def verify_firebase_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Firebase ID token using the Firebase Admin SDK.
    Returns decoded token dictionary on success, or None on failure.
    """
    if not is_firebase_admin_initialized():
        init_firebase_admin()

    if not is_firebase_admin_initialized():
        return None

    try:
        from firebase_admin import auth
        decoded_token = auth.verify_id_token(token, check_revoked=False)
        return decoded_token
    except Exception as e:
        logger.debug(f"Firebase token verification failed: {e}")
        return None
