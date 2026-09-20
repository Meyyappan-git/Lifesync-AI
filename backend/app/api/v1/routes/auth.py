from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.services.auth_service import AuthService
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    VerifyEmailRequest,
    ResendVerificationRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
)
from app.schemas.user import UserResponse
from app.schemas.common import MessageResponse

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["Auth"])


def _set_auth_cookies(response: Response, raw_refresh_token: str, remember_me: bool) -> None:
    max_age = 30 * 86400 if remember_me else None

    # 1. Refresh Token (httpOnly, Path=/api/v1/auth)
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/api/v1/auth",
        max_age=max_age,
    )

    # 2. Session Presence Cookie for Next.js Middleware fast redirect
    response.set_cookie(
        key="ls_session",
        value="1",
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        path="/",
        max_age=max_age,
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
    response.delete_cookie(key="ls_session", path="/")


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=MessageResponse)
@limiter.limit("5/minute")
def register(
    payload: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)
    client_ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")

    msg = auth_service.register(
        full_name=payload.full_name,
        email=payload.email,
        password=payload.password,
        confirm_password=payload.confirm_password,
        ip=client_ip,
        user_agent=user_agent,
    )
    return {"message": msg}


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)
    client_ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")

    auth_service.verify_email(token=payload.token, ip=client_ip, user_agent=user_agent)
    return {"message": "Email address verified successfully. You can now log in."}


@router.post("/resend-verification", response_model=MessageResponse)
@limiter.limit("3/minute")
def resend_verification(
    payload: ResendVerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)
    auth_service.resend_verification(email=payload.email)
    return {"message": "If an unverified account exists with that email, a new verification link has been sent."}


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)
    client_ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")

    user, access_token, refresh_token, expires_in = auth_service.login(
        email=payload.email,
        password=payload.password,
        remember_me=payload.remember_me,
        ip=client_ip,
        user_agent=user_agent,
    )

    _set_auth_cookies(response, refresh_token, payload.remember_me)

    user_resp = UserResponse.model_validate(user)
    user_resp.email_verified = user.email_verified_at is not None

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": expires_in,
        "user": user_resp,
    }


@router.post("/refresh", response_model=TokenResponse)
def refresh_session(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    raw_refresh_token = request.cookies.get("refresh_token")
    if not raw_refresh_token:
        _clear_auth_cookies(response)
        return Response(
            status_code=401,
            content='{"error":{"code":"missing_refresh_token","message":"Refresh token cookie missing"}}',
            media_type="application/json",
        )

    auth_service = AuthService(db)
    client_ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")

    try:
        user, access_token, new_refresh_token, expires_in = auth_service.refresh_session(
            raw_refresh_token=raw_refresh_token,
            ip=client_ip,
            user_agent=user_agent,
        )
        _set_auth_cookies(response, new_refresh_token, remember_me=True)

        user_resp = UserResponse.model_validate(user)
        user_resp.email_verified = user.email_verified_at is not None

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": expires_in,
            "user": user_resp,
        }
    except Exception:
        _clear_auth_cookies(response)
        raise


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    raw_refresh_token = request.cookies.get("refresh_token")
    if raw_refresh_token:
        auth_service = AuthService(db)
        client_ip = request.client.host if request.client else ""
        user_agent = request.headers.get("user-agent", "")
        auth_service.logout(raw_refresh_token, ip=client_ip, user_agent=user_agent)

    _clear_auth_cookies(response)
    return {"message": "Logged out successfully"}


@router.post("/logout-all", response_model=MessageResponse)
def logout_all(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)
    client_ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")
    auth_service.logout_all(user_id=current_user.id, ip=client_ip, user_agent=user_agent)

    _clear_auth_cookies(response)
    return {"message": "Logged out from all devices"}


@router.post("/forgot-password", response_model=MessageResponse)
@limiter.limit("5/minute")
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)
    client_ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")

    auth_service.forgot_password(email=payload.email, ip=client_ip, user_agent=user_agent)
    return {"message": "If an account with that email exists, a password reset link has been sent."}


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)
    client_ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")

    auth_service.reset_password(
        token=payload.token,
        password=payload.password,
        confirm_password=payload.confirm_password,
        ip=client_ip,
        user_agent=user_agent,
    )
    _clear_auth_cookies(response)
    return {"message": "Password reset successfully. You can now log in with your new password."}


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db)
    client_ip = request.client.host if request.client else ""
    user_agent = request.headers.get("user-agent", "")

    auth_service.change_password(
        user_id=current_user.id,
        current_password=payload.current_password,
        new_password=payload.new_password,
        ip=client_ip,
        user_agent=user_agent,
    )
    return {"message": "Password changed successfully. All other active sessions have been signed out."}
