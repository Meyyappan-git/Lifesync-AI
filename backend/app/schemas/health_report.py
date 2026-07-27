from typing import Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel

class HealthReportBase(BaseModel):
    report_type: str  # "file" or "manual"

class HealthReportCreateManual(BaseModel):
    age: int
    gender: str
    symptoms: str
    medical_history: Optional[str] = None
    lifestyle_factors: Optional[str] = None

class HealthReportResponse(HealthReportBase):
    id: int
    user_id: int
    raw_content: Optional[str] = None
    manual_data: Optional[Dict[str, Any]] = None
    cautions: Optional[str] = None
    remedies: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
