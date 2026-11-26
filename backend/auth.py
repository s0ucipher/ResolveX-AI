import os
import datetime
import bcrypt
import logging
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User
from backend.schemas import TokenData
from backend.firebase_auth import verify_firebase_token

_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

logger = logging.getLogger("complainai.auth")

_DEV_DEFAULT_SECRET = "complainai-dev-secret-key-college-caa-2026-viva-security"
_CONFIGURED_SECRET = (
    os.getenv("SECRET_KEY")
    or os.getenv("COMPLAINAI_SECRET_KEY")
    or os.getenv("RESOLVEX_SECRET_KEY")
    or ""
).strip()

_IS_DEPLOYED = (
    os.getenv("ENVIRONMENT", "").strip().lower() == "production"
    or os.getenv("APP_ENV", "").strip().lower() == "production"
    or os.getenv("RENDER", "").strip().lower() == "true"
    or os.getenv("VERCEL", "").strip() == "1"
)

if _IS_DEPLOYED and (not _CONFIGURED_SECRET or _CONFIGURED_SECRET == _DEV_DEFAULT_SECRET):
    raise RuntimeError(
        "A strong SECRET_KEY (or COMPLAINAI_SECRET_KEY) environment variable must be configured in production/deployed mode."
    )

SECRET_KEY = _CONFIGURED_SECRET or _DEV_DEFAULT_SECRET
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

ADMIN_EMAILS = [
    e.strip().lower()
    for e in os.getenv("ADMIN_EMAILS", "admin@complainai.ai,admin@resolvex.ai").split(",")
    if e.strip()
]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    if not hashed_password:
        return False
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    expire = now_utc + (expires_delta or datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not token:
        return None

    # Clean bearer prefix if present
    token_str = token.strip()
    if token_str.lower().startswith("bearer "):
        token_str = token_str[7:].strip()

    # 1. Primary verification: Firebase Admin SDK
    firebase_decoded = verify_firebase_token(token_str)
    if firebase_decoded:
        uid = firebase_decoded.get("uid") or firebase_decoded.get("sub")
        email = (firebase_decoded.get("email") or "").strip().lower()
        name = firebase_decoded.get("name") or (email.split("@")[0] if email else "User")
        # Only trust server-set Firebase custom admin claim or configured ADMIN_EMAILS allowlist
        is_admin = (firebase_decoded.get("admin") is True) or (bool(email) and email in ADMIN_EMAILS)

        # Lookup existing user by firebase_uid or email
        user = None
        if uid:
            user = db.query(User).filter(User.firebase_uid == uid).first()
        if not user and email:
            user = db.query(User).filter(User.email == email).first()

        if user:
            # Prevent binding a different Firebase UID to an existing account
            if uid and user.firebase_uid and user.firebase_uid != uid:
                logger.warning("Firebase UID mismatch for existing account %s", email)
                return None

            # Sync user profile attributes
            changed = False
            if uid and not user.firebase_uid:
                user.firebase_uid = uid
                changed = True
            if name and not user.name:
                user.name = name
                changed = True
            if is_admin and user.role != "admin":
                user.role = "admin"
                changed = True

            if changed:
                db.commit()
                db.refresh(user)

            return user if user.is_active else None
        else:
            # Create user profile linked to Firebase UID
            role = "admin" if is_admin else "user"
            new_user = User(
                name=name or "ComplainAI User",
                email=email or f"user_{uid[:10]}@complainai.firebase",
                firebase_uid=uid,
                password_hash="firebase_managed",
                role=role,
                is_active=True
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            return new_user

    # 2. Fallback verification: Local JWT (for backward compatibility & unit testing)
    try:
        payload = jwt.decode(token_str, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user if user and user.is_active else None
    except (JWTError, ValueError):
        return None

def get_current_user(
    user: Optional[User] = Depends(get_current_user_optional)
) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in or create an account to access ComplainAI features.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to access this resource"
        )
    return current_user
