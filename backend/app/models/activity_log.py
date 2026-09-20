import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Uuid
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base_class import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    event = Column(String(100), nullable=False, index=True)
    ip = Column(String(64), nullable=True)
    user_agent = Column(String(512), nullable=True)
    metadata_json = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", backref="auth_activity_logs")
