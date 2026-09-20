import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.repositories.token_repository import TokenRepository
from app.repositories.session_repository import SessionRepository
from app.core.security import generate_opaque_token, hash_token
from app.core.config import settings
from app.models.session import Session as AuthSession
from app.models.one_time_token import OneTimeToken


class TokenService:
    def __init__(self, db: Session):
        self.db = db
        self.token_repo = TokenRepository(db)
        self.session_repo = SessionRepository(db)

    def create_verification_token(self, user_id: uuid.UUID) -> str:
        raw_token = generate_opaque_token()
        token_h = hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        self.token_repo.create(user_id=user_id, purpose="verify_email", token_hash=token_h, expires_at=expires_at)
        return raw_token

    def create_reset_token(self, user_id: uuid.UUID) -> str:
        raw_token = generate_opaque_token()
        token_h = hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
        self.token_repo.create(user_id=user_id, purpose="reset_password", token_hash=token_h, expires_at=expires_at)
        return raw_token

    def consume_token(self, raw_token: str, purpose: str) -> Optional[OneTimeToken]:
        token_h = hash_token(raw_token)
        ott = self.token_repo.get_valid_token(token_h, purpose)
        if not ott:
            return None
        self.token_repo.mark_used(ott)
        return ott

    def create_session(
        self,
        user_id: uuid.UUID,
        remember_me: bool = False,
        user_agent: Optional[str] = None,
        ip: Optional[str] = None,
        family_id: Optional[uuid.UUID] = None,
    ) -> Tuple[AuthSession, str]:
        raw_refresh_token = generate_opaque_token()
        token_h = hash_token(raw_refresh_token)

        if remember_me:
            expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_DAYS)
        else:
            expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

        session = self.session_repo.create(
            user_id=user_id,
            family_id=family_id or uuid.uuid4(),
            refresh_token_hash=token_h,
            expires_at=expires_at,
            user_agent=user_agent,
            ip=ip,
            remember_me=remember_me,
        )
        return session, raw_refresh_token
