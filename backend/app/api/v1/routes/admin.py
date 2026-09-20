from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.deps import require_role
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserResponse
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users", response_model=PaginatedResponse[UserResponse])
def get_all_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_admin: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    user_repo = UserRepository(db)
    skip = (page - 1) * size
    users, total = user_repo.get_all(skip=skip, limit=size)

    pages = (total + size - 1) // size if total > 0 else 1
    items = []
    for u in users:
        ur = UserResponse.model_validate(u)
        ur.email_verified = u.email_verified_at is not None
        items.append(ur)

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }
