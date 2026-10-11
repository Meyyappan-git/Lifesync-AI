from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid


class ReminderCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    message: Optional[str] = None
    trigger_time: datetime


class ReminderUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    message: Optional[str] = None
    trigger_time: Optional[datetime] = None
    is_sent: Optional[bool] = None


class ReminderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    message: Optional[str] = None
    trigger_time: str
    is_sent: bool
    created_at: Optional[str] = None


class DocumentUpdateRequest(BaseModel):
    name: Optional[str] = None
    folder_id: Optional[int] = None
    metadata: Optional[Dict[str, str]] = None


class DocumentRelationshipCreate(BaseModel):
    target_document_id: int
    relationship_type: str = "related_to"  # "depends_on", "related_to", "supersedes"
    notes: Optional[str] = None


class DocumentRelationshipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_document_id: int
    target_document_id: int
    relationship_type: str
    notes: Optional[str] = None
    target_document_name: Optional[str] = None
    created_at: Optional[str] = None


class RiskResolveRequest(BaseModel):
    risk_title: str
    is_resolved: bool = True


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    created_at: Optional[str] = None


class TravelCheckRequest(BaseModel):
    destination: Optional[str] = "International"
    trip_type: Optional[str] = "international"  # "international", "domestic", "schengen"
    departure_date: Optional[str] = None
    return_date: Optional[str] = None


class TravelCheckItem(BaseModel):
    name: str
    required: bool = True
    status: bool = False
    details: Optional[str] = None
    recommendation: Optional[str] = None


class TravelReadinessResponse(BaseModel):
    readiness_score: int
    destination: str
    trip_type: str
    departure_date: Optional[str] = None
    checks: List[TravelCheckItem]
    missing_count: int
    advisories: List[str]


class DocumentSearchResult(BaseModel):
    id: int
    name: str
    file_type: Optional[str] = None
    folder_id: Optional[int] = None
    folder_name: Optional[str] = None
    created_at: Optional[str] = None
    metadata: Dict[str, str] = {}
    matched_field: str
    snippet: Optional[str] = None


class DocumentSearchResponse(BaseModel):
    query: str
    total: int
    results: List[DocumentSearchResult]



