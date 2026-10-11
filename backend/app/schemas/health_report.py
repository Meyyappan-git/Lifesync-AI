from typing import Optional, Any, Dict, Union
from datetime import datetime
import uuid
from pydantic import BaseModel, ConfigDict

class HealthReportBase(BaseModel):
    report_type: str  # "file" or "manual"

class HealthReportCreateManual(BaseModel):
    age: int
    gender: str
    symptoms: str
    medical_history: Optional[str] = None
    lifestyle_factors: Optional[str] = None

class HealthReportResponse(HealthReportBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Union[uuid.UUID, str, int]
    raw_content: Optional[str] = None
    manual_data: Optional[Dict[str, Any]] = None
    cautions: Optional[str] = None
    remedies: Optional[str] = None
    created_at: datetime
