from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User
from backend.schemas import UserCreate, UserLogin, UserOut, Token, FirebaseSyncRequest
from backend.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )

    # Password hash & role always defaults to 'user' for public registration
    new_user = User(
        name=user_in.name.strip(),
        email=user_in.email.lower(),
        password_hash=get_password_hash(user_in.password),
        role="user",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Issue JWT token
    access_token = create_access_token(
        data={"sub": str(new_user.id), "email": new_user.email, "role": new_user.role}
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(new_user)
    )

@router.post("/register-admin", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_admin(user_in: UserCreate, db: Session = Depends(get_db)):
    clean_email = user_in.email.strip().lower()
    clean_name = user_in.name.strip()

    # Check if user already exists
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        # Upgrade or refresh existing user account to Administrator
        existing.role = "admin"
        if user_in.password:
            existing.password_hash = get_password_hash(user_in.password)
        if clean_name:
            existing.name = clean_name
        existing.is_active = True
        db.commit()
        db.refresh(existing)

        access_token = create_access_token(
            data={"sub": str(existing.id), "email": existing.email, "role": existing.role}
        )
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserOut.model_validate(existing)
        )

    new_admin = User(
        name=clean_name,
        email=clean_email,
        password_hash=get_password_hash(user_in.password),
        role="admin",
        is_active=True
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    access_token = create_access_token(
        data={"sub": str(new_admin.id), "email": new_admin.email, "role": new_admin.role}
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(new_admin)
    )

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email.lower()).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated"
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)

@router.post("/sync", response_model=UserOut)
def sync_firebase_user(
    current_user: User = Depends(get_current_user),
    sync_data: FirebaseSyncRequest = None,
    db: Session = Depends(get_db)
):
    if sync_data:
        changed = False
        if sync_data.name and sync_data.name.strip() and current_user.name != sync_data.name.strip():
            current_user.name = sync_data.name.strip()
            changed = True
        if changed:
            db.commit()
            db.refresh(current_user)
    return UserOut.model_validate(current_user)

@router.post("/logout")
def logout():
    return {"message": "Successfully logged out. Please clear client tokens."}
