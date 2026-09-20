import uuid
from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.activity_repository import ActivityRepository
from app.schemas.user import UserResponse, UserUpdate, SessionResponse, ActivityLogResponse
from app.schemas.common import MessageResponse, PaginatedResponse
from app.core.errors import AppException

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    user_resp = UserResponse.model_validate(current_user)
    user_resp.email_verified = current_user.email_verified_at is not None
    return user_resp


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_repo = UserRepository(db)
    if payload.full_name is not None and payload.full_name.strip():
        current_user = user_repo.update(current_user, full_name=payload.full_name.strip())

    user_resp = UserResponse.model_validate(current_user)
    user_resp.email_verified = current_user.email_verified_at is not None
    return user_resp


@router.get("/me/sessions", response_model=List[SessionResponse])
def get_my_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session_repo = SessionRepository(db)
    sessions = session_repo.get_user_active_sessions(current_user.id)
    return [SessionResponse.model_validate(s) for s in sessions]


@router.delete("/me/sessions/{session_id}", response_model=MessageResponse)
def revoke_my_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session_repo = SessionRepository(db)
    session = session_repo.get_by_id(session_id)
    if not session or session.user_id != current_user.id:
        raise AppException(status_code=404, code="session_not_found", message="Session not found")

    session_repo.revoke_session(session)
    return {"message": "Session revoked successfully"}


@router.get("/me/activity", response_model=PaginatedResponse[ActivityLogResponse])
def get_my_activity(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    activity_repo = ActivityRepository(db)
    skip = (page - 1) * size
    logs, total = activity_repo.get_by_user(user_id=current_user.id, skip=skip, limit=size)

    pages = (total + size - 1) // size if total > 0 else 1
    items = [ActivityLogResponse.model_validate(log) for log in logs]

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }
