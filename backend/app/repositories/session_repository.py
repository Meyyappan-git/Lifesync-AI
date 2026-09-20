import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.session import Session as AuthSession


class SessionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        user_id: uuid.UUID,
        refresh_token_hash: str,
        expires_at: datetime,
        family_id: Optional[uuid.UUID] = None,
        user_agent: Optional[str] = None,
        ip: Optional[str] = None,
        remember_me: bool = False,
    ) -> AuthSession:
        session = AuthSession(
            user_id=user_id,
            family_id=family_id or uuid.uuid4(),
            refresh_token_hash=refresh_token_hash,
            expires_at=expires_at,
            user_agent=user_agent,
            ip=ip,
            remember_me=remember_me,
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_by_token_hash(self, token_hash: str) -> Optional[AuthSession]:
        return self.db.query(AuthSession).filter(AuthSession.refresh_token_hash == token_hash).first()

    def get_by_id(self, session_id: uuid.UUID) -> Optional[AuthSession]:
        return self.db.query(AuthSession).filter(AuthSession.id == session_id).first()

    def get_user_active_sessions(self, user_id: uuid.UUID) -> List[AuthSession]:
        now = datetime.now(timezone.utc)
        return (
            self.db.query(AuthSession)
            .filter(
                AuthSession.user_id == user_id,
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > now,
            )
            .order_by(AuthSession.last_used_at.desc())
            .all()
        )

    def revoke_session(self, session: AuthSession, replaced_by_id: Optional[uuid.UUID] = None) -> AuthSession:
        session.revoked_at = datetime.now(timezone.utc)
        if replaced_by_id:
            session.replaced_by_id = replaced_by_id
        self.db.commit()
        self.db.refresh(session)
        return session

    def revoke_family(self, family_id: uuid.UUID) -> int:
        now = datetime.now(timezone.utc)
        revoked_count = (
            self.db.query(AuthSession)
            .filter(AuthSession.family_id == family_id, AuthSession.revoked_at.is_(None))
            .update({"revoked_at": now}, synchronize_session=False)
        )
        self.db.commit()
        return revoked_count

    def revoke_all_user_sessions(self, user_id: uuid.UUID, except_session_id: Optional[uuid.UUID] = None) -> int:
        now = datetime.now(timezone.utc)
        query = self.db.query(AuthSession).filter(
            AuthSession.user_id == user_id,
            AuthSession.revoked_at.is_(None),
        )
        if except_session_id:
            query = query.filter(AuthSession.id != except_session_id)
        revoked_count = query.update({"revoked_at": now}, synchronize_session=False)
        self.db.commit()
        return revoked_count
