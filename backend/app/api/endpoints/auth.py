from datetime import datetime, timedelta, timezone
import hashlib
import re
import secrets
from collections import defaultdict, deque
from typing import Deque

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, User as UserSchema
from pydantic import BaseModel

router = APIRouter()

RATE_LIMIT_WINDOW_SECONDS = 300
RATE_LIMIT_MAX_REQUESTS = 3
_RATE_LIMITS: dict[str, Deque[datetime]] = defaultdict(deque)


class EmailVerificationRequest(BaseModel):
    email: str


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetPayload(BaseModel):
    token: str
    password: str
    confirm_password: str


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class RefreshTokenPayload(BaseModel):
    refresh_token: str | None = None


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _password_meets_policy(password: str) -> bool:
    if len(password) < 10:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    if not re.search(r"[^A-Za-z0-9]", password):
        return False
    return True


def _rate_limit(key: str) -> None:
    now = datetime.now(timezone.utc)
    bucket = _RATE_LIMITS[key]
    while bucket and (now - bucket[0]).total_seconds() > RATE_LIMIT_WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="Too many requests. Please try again shortly.")
    bucket.append(now)


def _create_email_token(user_id: int, purpose: str, expires_in: timedelta) -> str:
    expire = datetime.now(timezone.utc) + expires_in
    payload = {"sub": str(user_id), "purpose": purpose, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _create_access_token(user_id: int) -> str:
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {"sub": str(user_id), "type": "access", "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _create_refresh_token(user_id: int, version: int) -> str:
    expires_delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {"sub": str(user_id), "type": "refresh", "version": version, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.set_cookie(key="refresh_token", value="", httponly=True, secure=False, samesite="lax", max_age=0)


def _send_verification_email(user: User, token: str) -> None:
    verification_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3002')}/verify-email?token={token}"
    print(f"\n--- VERIFICATION EMAIL ---\nTo: {user.email}\n{verification_url}\n--------------------------\n")


def _send_password_reset_email(user: User, token: str) -> None:
    reset_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3002')}/reset-password?token={token}"
    print(f"\n--- PASSWORD RESET EMAIL ---\nTo: {user.email}\n{reset_url}\n----------------------------\n")


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserCreate,
    request: Request,
    db: Session = Depends(deps.get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    _rate_limit(f"register:{client_ip}")

    normalized_email = _normalize_email(user_in.email)
    if not _password_meets_policy(user_in.password):
        raise HTTPException(status_code=400, detail="Password does not meet the required policy")

    user = db.query(User).filter(User.email == normalized_email).first()
    if user:
        if user.is_verified:
            raise HTTPException(status_code=400, detail="Account already exists for this email")
        token = _create_email_token(user.id, "verify", timedelta(hours=24))
        user.verification_token_hash = _hash_token(token)
        user.verification_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        db.commit()
        _send_verification_email(user, token)
        return {"message": "Verification email resent", "verification_url": f"/verify-email?token={token}"}

    user = User(
        email=normalized_email,
        password_hash=security.get_password_hash(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        is_verified=False,
    )
    token = _create_email_token(user.id, "verify", timedelta(hours=24))
    user.verification_token_hash = _hash_token(token)
    user.verification_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    db.add(user)
    db.commit()
    db.refresh(user)
    _send_verification_email(user, token)
    return {"message": "Verification email sent", "verification_url": f"/verify-email?token={token}"}


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(deps.get_db)):
    if not token:
        raise HTTPException(status_code=400, detail="Verification token is required")

    hashed_token = _hash_token(token)
    user = db.query(User).filter(User.verification_token_hash == hashed_token).first()
    if not user:
        raise HTTPException(status_code=404, detail="Invalid or expired verification token")

    if user.verification_token_expires_at and user.verification_token_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification token expired")

    user.is_verified = True
    user.verification_token_hash = None
    user.verification_token_expires_at = None
    db.commit()
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
def resend_verification(payload: EmailVerificationRequest, request: Request, db: Session = Depends(deps.get_db)):
    client_ip = request.client.host if request.client else "unknown"
    _rate_limit(f"resend:{client_ip}")

    normalized_email = _normalize_email(payload.email)
    user = db.query(User).filter(User.email == normalized_email).first()
    if user and not user.is_verified:
        token = _create_email_token(user.id, "verify", timedelta(hours=24))
        user.verification_token_hash = _hash_token(token)
        user.verification_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        db.commit()
        _send_verification_email(user, token)

    return {"message": "If the account exists and is unverified, a new verification email has been sent"}


@router.post("/login", response_model=Token)
def login_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    client_ip = request.client.host if request.client else "unknown"
    _rate_limit(f"login:{client_ip}")

    normalized_email = _normalize_email(form_data.username)
    user = db.query(User).filter(User.email == normalized_email).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = _create_access_token(user.id)
    refresh_token = _create_refresh_token(user.id, user.refresh_token_version or 0)
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    _set_refresh_cookie(response, refresh_token)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "requires_verification": not user.is_verified,
    }


@router.post("/refresh", response_model=Token)
def refresh_token(payload: RefreshTokenPayload, request: Request, response: Response, db: Session = Depends(deps.get_db)):
    token = payload.refresh_token or request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Refresh token required")

    try:
        decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from exc

    if decoded.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == int(decoded["sub"])).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    expected_version = user.refresh_token_version or 0
    if int(decoded.get("version", 0)) != expected_version:
        raise HTTPException(status_code=401, detail="Refresh token revoked")

    user.refresh_token_version = expected_version + 1
    access_token = _create_access_token(user.id)
    new_refresh_token = _create_refresh_token(user.id, user.refresh_token_version)
    db.commit()

    _set_refresh_cookie(response, new_refresh_token)
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "requires_verification": not user.is_verified,
    }


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(deps.get_db)):
    token = request.cookies.get("refresh_token")
    if token:
        try:
            decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        except JWTError:
            decoded = None

        if decoded and decoded.get("type") == "refresh":
            user = db.query(User).filter(User.id == int(decoded["sub"])).first()
            if user:
                user.refresh_token_version = (user.refresh_token_version or 0) + 1
                db.commit()

    _clear_refresh_cookie(response)
    return {"message": "Logged out successfully"}


@router.post("/forgot-password")
def forgot_password(payload: PasswordResetRequest, request: Request, db: Session = Depends(deps.get_db)):
    client_ip = request.client.host if request.client else "unknown"
    _rate_limit(f"forgot-password:{client_ip}")

    normalized_email = _normalize_email(payload.email)
    user = db.query(User).filter(User.email == normalized_email).first()
    if user:
        token = _create_email_token(user.id, "reset_password", timedelta(hours=1))
        user.password_reset_token_hash = _hash_token(token)
        user.password_reset_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        _send_password_reset_email(user, token)

    return {"message": "If that email exists, a password reset link has been sent"}


@router.post("/reset-password")
def reset_password(payload: PasswordResetPayload, db: Session = Depends(deps.get_db)):
    if not _password_meets_policy(payload.password):
        raise HTTPException(status_code=400, detail="Password does not meet the required policy")
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    hashed_token = _hash_token(payload.token)
    user = db.query(User).filter(User.password_reset_token_hash == hashed_token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if user.password_reset_token_expires_at and user.password_reset_token_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token expired")

    user.password_hash = security.get_password_hash(payload.password)
    user.password_reset_token_hash = None
    user.password_reset_token_expires_at = None
    user.refresh_token_version = (user.refresh_token_version or 0) + 1
    db.commit()
    return {"message": "Password reset successfully"}


@router.post("/change-password")
def change_password(
    payload: ChangePasswordPayload,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    if not security.verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if not _password_meets_policy(payload.new_password):
        raise HTTPException(status_code=400, detail="Password does not meet the required policy")
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    current_user.password_hash = security.get_password_hash(payload.new_password)
    current_user.refresh_token_version = (current_user.refresh_token_version or 0) + 1
    db.commit()
    return {"message": "Password changed successfully"}


@router.get("/me", response_model=UserSchema)
def read_users_me(current_user: User = Depends(deps.get_current_user)):
    return current_user
