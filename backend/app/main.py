import os
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.errors import AppException, app_exception_handler, validation_exception_handler
from app.api.v1.routes.auth import limiter

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Exception Handlers & Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3001",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.api import api_router
from app.db.database import engine, SessionLocal
from app.db.base_class import Base
from app.models import user, session, one_time_token, activity_log, core_models

# Auto-create tables for local development
Base.metadata.create_all(bind=engine)

# Seed default folders
from app.models.core_models import Folder

def seed_folders():
    db = SessionLocal()
    try:
        default_folders = [
            "Vehicle",
            "Travel",
            "Health",
            "Finance",
            "Education",
            "Employment",
            "Property"
        ]
        for folder_name in default_folders:
            exists = db.query(Folder).filter(Folder.name == folder_name).first()
            if not exists:
                folder = Folder(name=folder_name, description=f"Smart folder for {folder_name} records")
                db.add(folder)
        db.commit()
    except Exception as e:
        print("Folder seeding failed:", e)
    finally:
        db.close()

seed_folders()

@app.get("/")
def root():
    return {"message": "Welcome to LifeSync AI API"}

app.include_router(api_router, prefix=settings.API_V1_STR)
