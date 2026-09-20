import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "user"
    is_active: bool = True
    email_verified_at: Optional[datetime] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None


class UserResponse(UserBase):
    id: uuid.UUID
    email_verified: bool = False
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Backward compatibility alias
User = UserResponse


class SessionResponse(BaseModel):
    id: uuid.UUID
    user_agent: Optional[str] = None
    ip: Optional[str] = None
    created_at: datetime
    last_used_at: datetime
    expires_at: datetime
    is_current: bool = False

    model_config = ConfigDict(from_attributes=True)


class ActivityLogResponse(BaseModel):
    id: uuid.UUID
    event: str
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        if hasattr(obj, "metadata_json"):
            return cls(
                id=obj.id,
                event=obj.event,
                ip=obj.ip,
                user_agent=obj.user_agent,
                metadata=obj.metadata_json,
                created_at=obj.created_at,
            )
        return super().model_validate(obj, *args, **kwargs)
