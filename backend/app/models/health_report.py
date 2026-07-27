from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class HealthReport(Base):
    __tablename__ = "health_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    report_type = Column(String, nullable=False)  # "file" or "manual"
    raw_content = Column(Text, nullable=True)       # Text extracted from image/PDF
    manual_data = Column(JSON, nullable=True)       # User filled symptoms/metrics
    cautions = Column(Text, nullable=True)          # Predicted future cautions
    remedies = Column(Text, nullable=True)          # Recommended remedies
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="health_reports")
