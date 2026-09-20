import uuid
from typing import Generator, Callable
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import decode_access_token
from app.repositories.user_repository import UserRepository
from app.models.user import User
from app.core.errors import AppException


def get_current_user(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise AppException(
            status_code=401,
            code="missing_token",
            message="Authorization token is required",
        )

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise AppException(status_code=401, code="invalid_token", message="Invalid token claims")

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise AppException(status_code=401, code="invalid_token", message="Invalid user ID format in token")

    user_repo = UserRepository(db)
    user = user_repo.get_by_id(user_uuid)
    if not user or not user.is_active:
        raise AppException(status_code=401, code="user_inactive", message="User account is inactive or deleted")

    return user


def require_role(required_role: str) -> Callable:
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role != required_role:
            raise AppException(
                status_code=403,
                code="forbidden",
                message=f"Access denied. Requires '{required_role}' role.",
            )
        return current_user

    return role_checker
