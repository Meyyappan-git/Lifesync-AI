import uuid
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from app.models.activity_log import ActivityLog


class ActivityRepository:
    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        event: str,
        user_id: Optional[uuid.UUID] = None,
        ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ActivityLog:
        log_entry = ActivityLog(
            user_id=user_id,
            event=event,
            ip=ip,
            user_agent=user_agent,
            metadata_json=metadata,
        )
        self.db.add(log_entry)
        self.db.commit()
        self.db.refresh(log_entry)
        return log_entry

    def get_by_user(self, user_id: uuid.UUID, skip: int = 0, limit: int = 20) -> Tuple[List[ActivityLog], int]:
        query = self.db.query(ActivityLog).filter(ActivityLog.user_id == user_id)
        total = query.count()
        logs = query.order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()
        return logs, total
