from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api import deps
from app.core.lifesync_engine import generate_lifesync_signals
from app.models.core_models import Folder, Document, DocumentMetadata, RiskAlert, Reminder, EmergencyProfile, ActivityLog
from app.models.user import User
from app.schemas.user import User as UserSchema
from app.db.database import get_db

router = APIRouter()


class DocumentCreateRequest(BaseModel):
    name: str
    folder_id: int | None = None
    file_type: str = "pdf"


class EmergencyProfileRequest(BaseModel):
    blood_group: str | None = None
    medical_conditions: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    trusted_contacts_json: dict | None = None


class ReminderCreateRequest(BaseModel):
    title: str
    message: str | None = None
    trigger_time: str


@router.get("/dashboard")
def get_dashboard(current_user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    folders = db.query(Folder).all()
    documents = db.query(Document).filter(Document.user_id == current_user.id).all()
    alerts = db.query(RiskAlert).filter(RiskAlert.user_id == current_user.id).all()
    reminders = db.query(Reminder).filter(Reminder.user_id == current_user.id).all()
    activity = db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id).order_by(ActivityLog.created_at.desc()).limit(6).all()

    return {
        "user": UserSchema.model_validate(current_user).model_dump(),
        "folders": [
            {
                "id": folder.id,
                "name": folder.name,
                "description": folder.description,
                "document_count": sum(1 for doc in documents if doc.folder_id == folder.id),
            }
            for folder in folders
        ],
        "documents": [
            {
                "id": doc.id,
                "name": doc.name,
                "file_type": doc.file_type,
                "folder_id": doc.folder_id,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
            }
            for doc in documents
        ],
        "alerts": [
            {
                "id": alert.id,
                "title": alert.title,
                "risk_level": alert.risk_level,
                "reason": alert.reason,
                "recommended_action": alert.recommended_action,
                "deadline": alert.deadline.isoformat() if alert.deadline else None,
            }
            for alert in alerts
        ],
        "reminders": [
            {
                "id": reminder.id,
                "title": reminder.title,
                "message": reminder.message,
                "trigger_time": reminder.trigger_time.isoformat() if reminder.trigger_time else None,
            }
            for reminder in reminders
        ],
        "activity": [
            {
                "id": log.id,
                "action": log.action,
                "details": log.details,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in activity
        ],
    }


@router.post("/documents", status_code=status.HTTP_201_CREATED)
def create_document(
    payload: DocumentCreateRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    document = Document(
        user_id=current_user.id,
        folder_id=payload.folder_id,
        name=payload.name,
        file_path="local-storage",
        file_type=payload.file_type,
        raw_content="Uploaded by the LifeSync AI workspace",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    ActivityLog(user_id=current_user.id, action="UPLOAD_DOC", details=f"Uploaded {payload.name}").save if hasattr(ActivityLog, "save") else None
    db.add(ActivityLog(user_id=current_user.id, action="UPLOAD_DOC", details=f"Uploaded {payload.name}"))
    db.commit()

    return {"id": document.id, "name": document.name, "message": "Document recorded"}


@router.post("/alerts")
def create_alert(
    title: str,
    risk_level: str,
    reason: str,
    recommended_action: str,
    deadline: str | None = None,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    alert = RiskAlert(
        user_id=current_user.id,
        title=title,
        risk_level=risk_level,
        reason=reason,
        recommended_action=recommended_action,
        deadline=deadline and __import__("datetime").datetime.fromisoformat(deadline),
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return {"id": alert.id, "message": "Alert created"}


@router.post("/reminders")
def create_reminder(payload: ReminderCreateRequest, current_user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    reminder = Reminder(
        user_id=current_user.id,
        title=payload.title,
        message=payload.message,
        trigger_time=__import__("datetime").datetime.fromisoformat(payload.trigger_time),
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return {"id": reminder.id, "message": "Reminder created"}


@router.get("/emergency-profile")
def get_emergency_profile(current_user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    profile = db.query(EmergencyProfile).filter(EmergencyProfile.user_id == current_user.id).first()
    if not profile:
        return {"profile": None}
    return {
        "profile": {
            "id": profile.id,
            "blood_group": profile.blood_group,
            "medical_conditions": profile.medical_conditions,
            "emergency_contact_name": profile.emergency_contact_name,
            "emergency_contact_phone": profile.emergency_contact_phone,
            "trusted_contacts_json": profile.trusted_contacts_json,
        }
    }


@router.put("/emergency-profile")
def upsert_emergency_profile(payload: EmergencyProfileRequest, current_user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    profile = db.query(EmergencyProfile).filter(EmergencyProfile.user_id == current_user.id).first()
    if profile:
        profile.blood_group = payload.blood_group
        profile.medical_conditions = payload.medical_conditions
        profile.emergency_contact_name = payload.emergency_contact_name
        profile.emergency_contact_phone = payload.emergency_contact_phone
        profile.trusted_contacts_json = payload.trusted_contacts_json
    else:
        profile = EmergencyProfile(
            user_id=current_user.id,
            blood_group=payload.blood_group,
            medical_conditions=payload.medical_conditions,
            emergency_contact_name=payload.emergency_contact_name,
            emergency_contact_phone=payload.emergency_contact_phone,
            trusted_contacts_json=payload.trusted_contacts_json,
        )
        db.add(profile)
    db.commit()
    return {"message": "Emergency profile saved"}


@router.get("/insights")
def get_insights(current_user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    documents = db.query(Document).filter(Document.user_id == current_user.id).all()
    alerts, reminders = generate_lifesync_signals([
        {"name": document.name, "file_type": document.file_type}
        for document in documents
    ], None)

    return {
        "alerts": alerts,
        "reminders": reminders,
        "document_count": len(documents),
    }


@router.get("/folders/{folder_id}")
def get_folder(folder_id: int, current_user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    documents = db.query(Document).filter(Document.user_id == current_user.id, Document.folder_id == folder_id).all()
    return {
        "folder": {"id": folder.id, "name": folder.name, "description": folder.description},
        "documents": [
            {"id": doc.id, "name": doc.name, "file_type": doc.file_type, "created_at": doc.created_at.isoformat() if doc.created_at else None}
            for doc in documents
        ],
    }
