from fastapi import APIRouter
from app.api.v1.routes import auth as auth_v1, users as users_v1, admin as admin_v1
from app.api.endpoints import health, lifesync

api_router = APIRouter()

# Auth & User Management API v1
api_router.include_router(auth_v1.router)
api_router.include_router(users_v1.router)
api_router.include_router(admin_v1.router)

# Core Domain APIs
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(lifesync.router, prefix="/lifesync", tags=["lifesync"])
