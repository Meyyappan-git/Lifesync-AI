import uuid
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Tuple
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
from app.core.errors import AppException

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash password using bcrypt via passlib."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def validate_password_policy(password: str, email: str = "") -> None:
    """
    Enforce password policy:
    - 10 to 72 bytes (bcrypt max)
    - At least 1 letter
    - At least 1 number
    - Must not contain email local part
    """
    pwd_bytes = password.encode("utf-8")
    if len(pwd_bytes) < 10 or len(pwd_bytes) > 72:
        raise AppException(
            status_code=400,
            code="invalid_password",
            message="Password must be between 10 and 72 characters",
            fields={"password": "Password must be between 10 and 72 characters"},
        )

    if not any(c.isalpha() for c in password):
        raise AppException(
            status_code=400,
            code="invalid_password",
            message="Password must contain at least one letter",
            fields={"password": "Password must contain at least one letter"},
        )

    if not any(c.isdigit() for c in password):
        raise AppException(
            status_code=400,
            code="invalid_password",
            message="Password must contain at least one number",
            fields={"password": "Password must contain at least one number"},
        )

    if email and "@" in email:
        email_prefix = email.split("@")[0].lower()
        if len(email_prefix) >= 3 and email_prefix in password.lower():
            raise AppException(
                status_code=400,
                code="invalid_password",
                message="Password must not contain your email username",
                fields={"password": "Password must not contain your email username"},
            )


def hash_token(token: str) -> str:
    """Compute SHA-256 hash of token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_opaque_token() -> str:
    """Generate secure opaque 32-byte urlsafe token."""
    return secrets.token_urlsafe(32)


def create_access_token(user_id: str, role: str, sid: str, expires_delta: timedelta | None = None) -> Tuple[str, int]:
    """
    Generate JWT access token with claims sub, role, sid, iat, exp, jti.
    Returns (token_str, expires_in_seconds).
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES)

    jti = str(uuid.uuid4())
    payload = {
        "sub": str(user_id),
        "role": role,
        "sid": str(sid),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": jti,
    }

    token = jwt.encode(payload, settings.EFFECTIVE_JWT_SECRET, algorithm=settings.ALGORITHM)
    expires_in = int((expire - now).total_seconds())
    return token, expires_in


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate JWT access token."""
    try:
        payload = jwt.decode(token, settings.EFFECTIVE_JWT_SECRET, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise AppException(
            status_code=401,
            code="token_expired",
            message="Access token is invalid or has expired",
        )
