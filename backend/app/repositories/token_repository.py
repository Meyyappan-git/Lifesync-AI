import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.one_time_token import OneTimeToken


class TokenRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, user_id: uuid.UUID, purpose: str, token_hash: str, expires_at: datetime) -> OneTimeToken:
        token = OneTimeToken(
            user_id=user_id,
            purpose=purpose,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(token)
        self.db.commit()
        self.db.refresh(token)
        return token

    def get_valid_token(self, token_hash: str, purpose: str) -> Optional[OneTimeToken]:
        now = datetime.now(timezone.utc)
        return (
            self.db.query(OneTimeToken)
            .filter(
                OneTimeToken.token_hash == token_hash,
                OneTimeToken.purpose == purpose,
                OneTimeToken.used_at.is_(None),
                OneTimeToken.expires_at > now,
            )
            .first()
        )

    def mark_used(self, token: OneTimeToken) -> OneTimeToken:
        token.used_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(token)
        return token
