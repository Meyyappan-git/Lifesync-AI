from fastapi import APIRouter
from app.api.endpoints import auth
from app.api.endpoints import health

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
