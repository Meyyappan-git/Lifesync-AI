from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3002",
        "http://localhost:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.api import api_router
from app.db.database import engine
from app.db.base_class import Base
from app.models import user, health_report, core_models

# Create tables automatically (for MVP/development)
if settings.SQLALCHEMY_DATABASE_URI.startswith("sqlite"):
    Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

# Seed default folders
from app.db.database import SessionLocal
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
