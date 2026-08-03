from fastapi import APIRouter
from app.api.endpoints import auth, health, lifesync

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(lifesync.router, prefix="/lifesync", tags=["lifesync"])
