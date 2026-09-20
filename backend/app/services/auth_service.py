import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session

from app.repositories.user_repository import UserRepository
from app.repositories.session_repository import SessionRepository
from app.services.token_service import TokenService
from app.services.email_service import EmailService
from app.services.activity_service import ActivityService

from app.core.security import (
    hash_password,
    verify_password,
    validate_password_policy,
    create_access_token,
    hash_token,
)
from app.core.errors import AppException
from app.models.user import User
from app.models.session import Session as AuthSession


def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)
        self.session_repo = SessionRepository(db)
        self.token_service = TokenService(db)
        self.activity_service = ActivityService(db)

    def register(self, full_name: str, email: str, password: str, confirm_password: str, ip: str = "", user_agent: str = "") -> str:
        if password != confirm_password:
            raise AppException(
                status_code=400,
                code="passwords_mismatch",
                message="Passwords do not match",
                fields={"confirm_password": "Passwords do not match"},
            )

        validate_password_policy(password, email)
        email_clean = email.lower().strip()

        existing_user = self.user_repo.get_by_email(email_clean)
        if existing_user:
            # Account enumeration prevention: send email notice and return same 201 response
            EmailService.send_already_registered_email(email_clean)
            return "Registration successful. Please check your email for verification instructions."

        # Create user
        pwd_hash = hash_password(password)
        user = self.user_repo.create(email=email_clean, password_hash=pwd_hash, full_name=full_name)

        # Auto-verify the user since email verification is disabled
        user = self.user_repo.update(user, email_verified_at=datetime.now(timezone.utc))

        self.activity_service.log_event(event="register", user_id=user.id, ip=ip, user_agent=user_agent)
        return "Registration successful. You can now log in."

    def verify_email(self, token: str, ip: str = "", user_agent: str = "") -> User:
        ott = self.token_service.consume_token(token, purpose="verify_email")
        if not ott:
            raise AppException(
                status_code=400,
                code="invalid_token",
                message="Verification link is invalid or has expired",
            )

        user = self.user_repo.get_by_id(ott.user_id)
        if not user:
            raise AppException(status_code=404, code="user_not_found", message="User not found")

        if not user.email_verified_at:
            user = self.user_repo.update(user, email_verified_at=datetime.now(timezone.utc))
            self.activity_service.log_event(event="verify_email", user_id=user.id, ip=ip, user_agent=user_agent)

        return user

    def resend_verification(self, email: str) -> None:
        email_clean = email.lower().strip()
        user = self.user_repo.get_by_email(email_clean)
        if user and not user.email_verified_at:
            verify_token = self.token_service.create_verification_token(user.id)
            EmailService.send_verification_email(email_clean, verify_token)

    def login(
        self,
        email: str,
        password: str,
        remember_me: bool = False,
        ip: str = "",
        user_agent: str = "",
    ) -> Tuple[User, str, str, int]:
        email_clean = email.lower().strip()
        user = self.user_repo.get_by_email(email_clean)

        if not user:
            self.activity_service.log_event(event="login_failed", ip=ip, user_agent=user_agent, metadata={"email": email_clean})
            raise AppException(
                status_code=401,
                code="invalid_credentials",
                message="Invalid email or password",
            )

        # Check account lockout
        now = datetime.now(timezone.utc)
        locked_until_utc = _ensure_utc(user.locked_until)
        if locked_until_utc and locked_until_utc > now:
            retry_after_seconds = int((locked_until_utc - now).total_seconds())
            raise AppException(
                status_code=423,
                code="account_locked",
                message=f"Account is locked due to multiple failed login attempts. Try again in {retry_after_seconds} seconds.",
                headers={"Retry-After": str(retry_after_seconds)},
            )

        # Verify password
        if not verify_password(password, user.password_hash):
            user = self.user_repo.increment_failed_login(user)
            self.activity_service.log_event(event="login_failed", user_id=user.id, ip=ip, user_agent=user_agent)
            
            locked_until_utc = _ensure_utc(user.locked_until)
            if locked_until_utc and locked_until_utc > now:
                self.activity_service.log_event(event="lockout", user_id=user.id, ip=ip, user_agent=user_agent)
                retry_after_seconds = int((locked_until_utc - now).total_seconds())
                raise AppException(
                    status_code=423,
                    code="account_locked",
                    message=f"Account locked due to 5 consecutive failed attempts. Please try again in {retry_after_seconds} seconds.",
                    headers={"Retry-After": str(retry_after_seconds)},
                )

            raise AppException(
                status_code=401,
                code="invalid_credentials",
                message="Invalid email or password",
            )

        # Inactive account check
        if not user.is_active:
            raise AppException(
                status_code=403,
                code="account_disabled",
                message="Account has been disabled",
            )

        # Reset failed login count on successful login
        self.user_repo.reset_failed_login(user)

        # Create session and tokens
        session, raw_refresh_token = self.token_service.create_session(
            user_id=user.id,
            remember_me=remember_me,
            user_agent=user_agent,
            ip=ip,
        )

        access_token, expires_in = create_access_token(
            user_id=str(user.id),
            role=user.role,
            sid=str(session.id),
        )

        self.activity_service.log_event(event="login_success", user_id=user.id, ip=ip, user_agent=user_agent)
        return user, access_token, raw_refresh_token, expires_in

    def refresh_session(self, raw_refresh_token: str, ip: str = "", user_agent: str = "") -> Tuple[User, str, str, int]:
        token_h = hash_token(raw_refresh_token)
        session = self.session_repo.get_by_token_hash(token_h)

        if not session:
            raise AppException(status_code=401, code="invalid_session", message="Session is invalid or expired")

        # Check if session was already revoked (Theft Detection!)
        if session.revoked_at:
            # Revoke entire session family!
            self.session_repo.revoke_family(session.family_id)
            self.activity_service.log_event(
                event="refresh_reuse_detected",
                user_id=session.user_id,
                ip=ip,
                user_agent=user_agent,
                metadata={"family_id": str(session.family_id)},
            )
            raise AppException(status_code=401, code="session_revoked", message="Security alert: Session reuse detected. All sessions revoked.")

        now = datetime.now(timezone.utc)
        expires_at_utc = _ensure_utc(session.expires_at)
        if expires_at_utc and expires_at_utc <= now:
            self.session_repo.revoke_session(session)
            raise AppException(status_code=401, code="session_expired", message="Session has expired. Please log in again.")

        user = self.user_repo.get_by_id(session.user_id)
        if not user or not user.is_active:
            self.session_repo.revoke_session(session)
            raise AppException(status_code=401, code="user_inactive", message="User account is inactive")

        # Rotate session: create new session and link replaced_by_id
        new_session, new_raw_refresh_token = self.token_service.create_session(
            user_id=user.id,
            remember_me=session.remember_me,
            user_agent=user_agent or session.user_agent,
            ip=ip or session.ip,
            family_id=session.family_id,
        )
        self.session_repo.revoke_session(session, replaced_by_id=new_session.id)

        access_token, expires_in = create_access_token(
            user_id=str(user.id),
            role=user.role,
            sid=str(new_session.id),
        )

        return user, access_token, new_raw_refresh_token, expires_in

    def logout(self, raw_refresh_token: str, ip: str = "", user_agent: str = "") -> None:
        if not raw_refresh_token:
            return
        token_h = hash_token(raw_refresh_token)
        session = self.session_repo.get_by_token_hash(token_h)
        if session and not session.revoked_at:
            self.session_repo.revoke_session(session)
            self.activity_service.log_event(event="logout", user_id=session.user_id, ip=ip, user_agent=user_agent)

    def logout_all(self, user_id: uuid.UUID, ip: str = "", user_agent: str = "") -> None:
        self.session_repo.revoke_all_user_sessions(user_id)
        self.activity_service.log_event(event="logout_all", user_id=user_id, ip=ip, user_agent=user_agent)

    def forgot_password(self, email: str, ip: str = "", user_agent: str = "") -> None:
        email_clean = email.lower().strip()
        user = self.user_repo.get_by_email(email_clean)
        if user and user.is_active:
            token = self.token_service.create_reset_token(user.id)
            EmailService.send_password_reset_email(email_clean, token)
            self.activity_service.log_event(event="password_reset_requested", user_id=user.id, ip=ip, user_agent=user_agent)

    def reset_password(self, token: str, password: str, confirm_password: str, ip: str = "", user_agent: str = "") -> None:
        if password != confirm_password:
            raise AppException(
                status_code=400,
                code="passwords_mismatch",
                message="Passwords do not match",
                fields={"confirm_password": "Passwords do not match"},
            )

        ott = self.token_service.consume_token(token, purpose="reset_password")
        if not ott:
            raise AppException(
                status_code=400,
                code="invalid_token",
                message="Password reset link is invalid or has expired",
            )

        user = self.user_repo.get_by_id(ott.user_id)
        if not user:
            raise AppException(status_code=404, code="user_not_found", message="User not found")

        validate_password_policy(password, user.email)
        pwd_hash = hash_password(password)

        self.user_repo.update(user, password_hash=pwd_hash)
        self.session_repo.revoke_all_user_sessions(user.id)

        self.activity_service.log_event(event="password_reset_completed", user_id=user.id, ip=ip, user_agent=user_agent)

    def change_password(self, user_id: uuid.UUID, current_password: str, new_password: str, current_session_id: Optional[uuid.UUID] = None, ip: str = "", user_agent: str = "") -> None:
        user = self.user_repo.get_by_id(user_id)
        if not user or not verify_password(current_password, user.password_hash):
            raise AppException(
                status_code=400,
                code="invalid_current_password",
                message="Current password is incorrect",
                fields={"current_password": "Current password is incorrect"},
            )

        validate_password_policy(new_password, user.email)
        pwd_hash = hash_password(new_password)

        self.user_repo.update(user, password_hash=pwd_hash)
        # Revoke all other sessions except current
        self.session_repo.revoke_all_user_sessions(user.id, except_session_id=current_session_id)

        EmailService.send_password_changed_email(user.email)
        self.activity_service.log_event(event="password_changed", user_id=user.id, ip=ip, user_agent=user_agent)
