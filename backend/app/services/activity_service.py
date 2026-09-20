import uuid
from typing import Optional, Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from app.repositories.activity_repository import ActivityRepository
from app.models.activity_log import ActivityLog


class ActivityService:
    def __init__(self, db: Session):
        self.db = db
        self.activity_repo = ActivityRepository(db)

    def log_event(
        self,
        event: str,
        user_id: Optional[uuid.UUID] = None,
        ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ActivityLog:
        return self.activity_repo.log(
            event=event,
            user_id=user_id,
            ip=ip,
            user_agent=user_agent,
            metadata=metadata,
        )

    def get_user_activity(self, user_id: uuid.UUID, skip: int = 0, limit: int = 20) -> Tuple[List[ActivityLog], int]:
        return self.activity_repo.get_by_user(user_id=user_id, skip=skip, limit=limit)
