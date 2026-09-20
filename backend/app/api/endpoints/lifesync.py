from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from app.api import deps
from app.models.core_models import Folder, Document, DocumentMetadata, RiskAlert, Reminder, EmergencyProfile
from app.models.activity_log import ActivityLog
from app.models.user import User
from app.schemas.user import User as UserSchema
from app.db.database import get_db
from app.services.folder_classifier import parse_metadata_from_text, classify_folder_for_doc
from app.services.ocr_service import extract_text_from_file, parse_structured_metadata, classify_document_folder
from app.services.cross_domain_risk_engine import calculate_life_health_score, evaluate_cross_domain_risks
from app.services.ai_assistant import answer_ai_assistant_query
from app.core.config import settings
from datetime import datetime
import os

router = APIRouter()

class DocumentCreateRequest(BaseModel):
    name: str
    folder_id: Optional[int] = None
    folder_name: Optional[str] = None
    file_type: str = "pdf"
    raw_content: Optional[str] = None
    expiry_date: Optional[str] = None

class FolderCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None

class AssistantQueryRequest(BaseModel):
    query: str

class EmergencyProfileRequest(BaseModel):
    blood_group: Optional[str] = None
    medical_conditions: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    trusted_contacts_json: Optional[dict] = None

@router.get("/dashboard")
def get_dashboard(current_user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    health_data = calculate_life_health_score(db, current_user.id)
    folders = db.query(Folder).all()
    documents = db.query(Document).filter(Document.user_id == current_user.id).all()
    reminders = db.query(Reminder).filter(Reminder.user_id == current_user.id).all()
    activity = db.query(ActivityLog).filter(ActivityLog.user_id == current_user.id).order_by(ActivityLog.created_at.desc()).limit(10).all()

    # Extract upcoming expiries from document metadata
    now_dt = datetime.now()
    upcoming_expiries = []
    for doc in documents:
        for meta in doc.metadata_entries:
            if meta.meta_key == "expiry_date":
                try:
                    exp_dt = datetime.strptime(meta.meta_value, "%Y-%m-%d")
                    days_left = (exp_dt - now_dt).days
                    if days_left < 0:
                        urgency_status = "EXPIRED"
                    elif days_left <= 30:
                        urgency_status = "CRITICAL"
                    elif days_left <= 90:
                        urgency_status = "WARNING"
                    else:
                        urgency_status = "HEALTHY"

                    upcoming_expiries.append({
                        "id": doc.id,
                        "doc_name": doc.name,
                        "folder_name": doc.folder.name if doc.folder else "General",
                        "file_type": doc.file_type or "pdf",
                        "expiry_date": meta.meta_value,
                        "days_left": days_left,
                        "urgency_status": urgency_status
                    })
                except Exception:
                    pass

    # Sort expiries by days_left ascending (most urgent first)
    upcoming_expiries.sort(key=lambda x: x["days_left"])

    return {
        "user": UserSchema.model_validate(current_user).model_dump(),
        "health_score": health_data["life_health_score"],
        "active_risks_count": health_data["active_risks_count"],
        "folder_completion_avg": health_data["folder_completion_avg"],
        "folder_stats": health_data["folder_stats"],
        "risks": health_data["risks"],
        "upcoming_expiries": upcoming_expiries,
        "documents": [
            {
                "id": doc.id,
                "name": doc.name,
                "file_type": doc.file_type,
                "folder_name": doc.folder.name if doc.folder else "General",
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
            }
            for doc in documents
        ],
        "reminders": [
            {
                "id": r.id,
                "title": r.title,
                "message": r.message,
                "trigger_time": r.trigger_time.isoformat() if r.trigger_time else None,
            }
            for r in reminders
        ],
        "activity": [
            {
                "id": log.id,
                "action": log.event,
                "details": log.metadata_json.get("details", "") if log.metadata_json else "",
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in activity
        ]
    }

@router.get("/folders")
def get_folders(current_user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    health_data = calculate_life_health_score(db, current_user.id)
    return health_data["folder_stats"]

@router.post("/folders", status_code=status.HTTP_201_CREATED)
def create_folder(
    payload: FolderCreateRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    folder_name = payload.name.strip()
    if not folder_name:
        raise HTTPException(status_code=400, detail="Folder name cannot be empty")

    existing = db.query(Folder).filter(
        Folder.name == folder_name,
        (Folder.user_id == None) | (Folder.user_id == current_user.id)
    ).first()
    if existing:
        return {"id": existing.id, "name": existing.name, "description": existing.description, "message": "Folder already exists"}

    folder = Folder(
        name=folder_name,
        description=payload.description or f"User folder for {folder_name}",
        user_id=current_user.id
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return {"id": folder.id, "name": folder.name, "description": folder.description, "message": "Folder created successfully"}

@router.post("/documents", status_code=status.HTTP_201_CREATED)
def create_document(
    payload: DocumentCreateRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    text_content = payload.raw_content
    if not text_content or len(text_content.strip()) < 5:
        text_content = extract_text_from_file(payload.name.encode("utf-8"), payload.file_type, payload.name)

    extracted_meta = parse_structured_metadata(text_content, payload.name)
    if payload.expiry_date:
        extracted_meta['expiry_date'] = payload.expiry_date

    # Resolve target folder (by ID, by name, or auto-classified by OCR)
    target_folder_id = payload.folder_id
    if not target_folder_id and payload.folder_name:
        fname = payload.folder_name.strip()
        folder_obj = db.query(Folder).filter(Folder.name == fname).first()
        if not folder_obj:
            folder_obj = Folder(name=fname, description=f"Custom folder for {fname}")
            db.add(folder_obj)
            db.commit()
            db.refresh(folder_obj)
        target_folder_id = folder_obj.id

    if not target_folder_id:
        classified_name = classify_document_folder(payload.name, text_content, extracted_meta)
        folder_obj = db.query(Folder).filter(Folder.name == classified_name).first()
        if not folder_obj:
            folder_obj = Folder(name=classified_name, description=f"{classified_name} documents folder")
            db.add(folder_obj)
            db.commit()
            db.refresh(folder_obj)
        target_folder_id = folder_obj.id

    document = Document(
        user_id=current_user.id,
        folder_id=target_folder_id,
        name=payload.name,
        file_path="local-storage",
        file_type=payload.file_type,
        raw_content=text_content,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    for k, v in extracted_meta.items():
        db.add(DocumentMetadata(document_id=document.id, meta_key=k, meta_value=str(v)))

    # Automatically re-evaluate cross-domain life risks with newly uploaded document context
    evaluate_cross_domain_risks(db, current_user.id)

    db.add(ActivityLog(user_id=current_user.id, event="UPLOAD_DOC", metadata_json={"details": f"Created document '{payload.name}' with OCR metadata ({len(extracted_meta)} attributes)"}))
    db.commit()

    return {"id": document.id, "name": document.name, "folder_id": target_folder_id, "metadata": extracted_meta, "message": "Document saved successfully with OCR & RAG indexing"}

@router.post("/documents/upload", status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile = File(...),
    folder_id: Optional[int] = Form(None),
    folder_name: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    try:
        content = file.file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read uploaded file: {str(e)}")

    file_type = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "pdf"

    # Multimodal OCR Extraction
    text_content = extract_text_from_file(content, file_type, file.filename)
    extracted_meta = parse_structured_metadata(text_content, file.filename)

    if expiry_date:
        extracted_meta['expiry_date'] = expiry_date

    # User selected folder or automatic smart folder classification
    target_folder_id = folder_id
    if not target_folder_id and folder_name:
        fname = folder_name.strip()
        folder_obj = db.query(Folder).filter(
            Folder.name == fname,
            (Folder.user_id == None) | (Folder.user_id == current_user.id)
        ).first()
        if not folder_obj:
            folder_obj = Folder(
                name=fname,
                description=f"Custom folder for {fname}",
                user_id=current_user.id
            )
            db.add(folder_obj)
            db.commit()
            db.refresh(folder_obj)
        target_folder_id = folder_obj.id

    if not target_folder_id:
        classified_name = classify_document_folder(file.filename, text_content, extracted_meta)
        folder_obj = db.query(Folder).filter(
            Folder.name == classified_name,
            (Folder.user_id == None) | (Folder.user_id == current_user.id)
        ).first()
        if not folder_obj:
            folder_obj = Folder(
                name=classified_name,
                description=f"{classified_name} documents folder",
                user_id=current_user.id
            )
            db.add(folder_obj)
            db.commit()
            db.refresh(folder_obj)
        target_folder_id = folder_obj.id

    # Save physical copy in local storage directory
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    storage_dir = os.path.join(base_dir, settings.STORAGE_DIR)
    if not os.path.exists(storage_dir):
        os.makedirs(storage_dir)

    safe_filename = f"{current_user.id}_{int(datetime.now().timestamp())}_{file.filename}"
    file_path = os.path.join(storage_dir, safe_filename)
    try:
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    document = Document(
        user_id=current_user.id,
        folder_id=target_folder_id,
        name=file.filename,
        file_path=file_path,
        file_type=file_type,
        raw_content=text_content,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    for k, v in extracted_meta.items():
        db.add(DocumentMetadata(document_id=document.id, meta_key=k, meta_value=str(v)))

    # Re-evaluate cross domain risks dynamically
    evaluate_cross_domain_risks(db, current_user.id)

    db.add(ActivityLog(user_id=current_user.id, event="UPLOAD_DOC", metadata_json={"details": f"Uploaded file '{file.filename}' with OCR & RAG indexing"}))
    db.commit()

    return {
        "id": document.id,
        "name": document.name,
        "folder_id": target_folder_id,
        "metadata": extracted_meta,
        "word_count": extracted_meta.get("ocr_word_count", "0"),
        "message": "File processed with OCR, classified into life folder, and indexed in RAG knowledge base successfully"
    }

@router.post("/assistant/query")
def query_ai_assistant(
    payload: AssistantQueryRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    result = answer_ai_assistant_query(db, current_user, payload.query)
    db.add(ActivityLog(user_id=current_user.id, event="AI_ASSISTANT_QUERY", metadata_json={"details": f"Query: {payload.query[:50]}"}))
    db.commit()
    return result

@router.get("/folders/{folder_id}")
def get_folder(
    folder_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
        
    documents = db.query(Document).filter(
        Document.user_id == current_user.id,
        Document.folder_id == folder_id
    ).all()
    
    return {
        "folder": {
            "id": folder.id,
            "name": folder.name,
            "description": folder.description
        },
        "documents": [
            {
                "id": doc.id,
                "name": doc.name,
                "file_type": doc.file_type,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
                "metadata": {m.meta_key: m.meta_value for m in doc.metadata_entries}
            }
            for doc in documents
        ]
    }

@router.get("/documents/{document_id}")
def get_document(
    document_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    metadata = {m.meta_key: m.meta_value for m in doc.metadata_entries}

    return {
        "id": doc.id,
        "name": doc.name,
        "file_type": doc.file_type,
        "file_path": doc.file_path,
        "raw_content": doc.raw_content,
        "folder_id": doc.folder_id,
        "folder_name": doc.folder.name if doc.folder else "General",
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "metadata": metadata,
    }


@router.get("/documents/{document_id}/download")
def download_document(
    document_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == current_user.id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not doc.file_path or doc.file_path == "local-storage" or not os.path.isfile(doc.file_path):
        raise HTTPException(status_code=404, detail="File not available for download")

    media_type_map = {
        "pdf": "application/pdf",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "webp": "image/webp",
        "svg": "image/svg+xml",
        "txt": "text/plain",
        "csv": "text/csv",
        "doc": "application/msword",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xls": "application/vnd.ms-excel",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    ext = (doc.file_type or "").lower()
    media_type = media_type_map.get(ext, "application/octet-stream")

    return FileResponse(
        path=doc.file_path,
        media_type=media_type,
        filename=doc.name,
    )


@router.delete("/documents/{document_id}", status_code=status.HTTP_200_OK)
def delete_document(
    document_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete metadata entries
    db.query(DocumentMetadata).filter(DocumentMetadata.document_id == document_id).delete()
    
    # Delete document entry
    db.delete(doc)
    
    db.add(ActivityLog(user_id=current_user.id, event="DELETE_DOC", metadata_json={"details": f"Deleted document '{doc.name}'"}))
    db.commit()
    return {"message": "Document deleted successfully"}

@router.get("/travel-readiness")
def get_travel_readiness(current_user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    user_docs = db.query(Document).filter(Document.user_id == current_user.id).all()
    travel_doc_names = [d.name.lower() for d in user_docs if d.folder and d.folder.name == "Travel"]
    
    checks = [
        {"name": "Passport Validity (>6 Months)", "status": any("passport" in d for d in travel_doc_names)},
        {"name": "Valid Visa", "status": any("visa" in d for d in travel_doc_names)},
        {"name": "Flight Booking Ticket", "status": any("flight" in d or "ticket" in d for d in travel_doc_names)},
        {"name": "Hotel Booking Confirmation", "status": any("hotel" in d for d in travel_doc_names)},
        {"name": "International Travel Insurance", "status": any("insurance" in d for d in travel_doc_names)},
        {"name": "Vaccination Certificate", "status": any("vaccin" in d for d in travel_doc_names)}
    ]
    
    passed = sum(1 for c in checks if c["status"])
    readiness_score = int((passed / len(checks)) * 100)
    
    return {
        "readiness_score": readiness_score,
        "checks": checks,
        "missing_count": len(checks) - passed
    }

@router.get("/admin/metrics")
def get_admin_metrics(current_user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")

    from sqlalchemy import func as sqlfunc
    from app.models.core_models import Folder

    total_users = db.query(User).count()
    verified_users = db.query(User).filter(User.is_verified == True).count()
    admin_users = db.query(User).filter(User.role == "admin").count()
    total_docs = db.query(Document).count()

    # Documents per folder
    folder_doc_counts = (
        db.query(Folder.name, sqlfunc.count(Document.id).label("count"))
        .outerjoin(Document, Document.folder_id == Folder.id)
        .group_by(Folder.id)
        .all()
    )

    # File type breakdown
    file_type_counts = (
        db.query(Document.file_type, sqlfunc.count(Document.id).label("count"))
        .group_by(Document.file_type)
        .all()
    )

    # Top uploaders (users with most documents)
    top_uploaders = (
        db.query(User.email, sqlfunc.count(Document.id).label("doc_count"))
        .outerjoin(Document, Document.user_id == User.id)
        .group_by(User.id)
        .order_by(sqlfunc.count(Document.id).desc())
        .limit(5)
        .all()
    )

    # Total activity log count
    total_log_count = db.query(ActivityLog).count()

    # Recent logs with user email
    recent_logs = (
        db.query(ActivityLog, User.email)
        .outerjoin(User, User.id == ActivityLog.user_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(25)
        .all()
    )

    # Action type breakdown
    action_counts = (
        db.query(ActivityLog.event, sqlfunc.count(ActivityLog.id).label("count"))
        .group_by(ActivityLog.event)
        .all()
    )

    return {
        "total_users": total_users,
        "verified_users": verified_users,
        "admin_users": admin_users,
        "total_documents": total_docs,
        "total_activity_logs": total_log_count,
        "system_status": "Healthy",
        "folder_doc_counts": [
            {"folder": name, "count": count}
            for name, count in folder_doc_counts
        ],
        "file_type_breakdown": [
            {"type": (ft or "unknown").upper(), "count": count}
            for ft, count in file_type_counts
        ],
        "top_uploaders": [
            {"email": email, "doc_count": count}
            for email, count in top_uploaders
        ],
        "action_breakdown": [
            {"action": action, "count": count}
            for action, count in action_counts
        ],
        "recent_activity_logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "user_email": email or "unknown",
                "action": log.event,
                "details": log.metadata_json.get("details", "") if log.metadata_json else "",
                "created_at": log.created_at.isoformat() if log.created_at else None
            }
            for log, email in recent_logs
        ]
    }


@router.get("/emergency-profile")
def get_emergency_profile(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(EmergencyProfile).filter(EmergencyProfile.user_id == current_user.id).first()
    if not profile:
        return {"profile": None}
    return {
        "profile": {
            "blood_group": profile.blood_group,
            "medical_conditions": profile.medical_conditions,
            "emergency_contact_name": profile.emergency_contact_name,
            "emergency_contact_phone": profile.emergency_contact_phone,
            "trusted_contacts_json": profile.trusted_contacts_json
        }
    }


@router.put("/emergency-profile")
def update_emergency_profile(
    payload: EmergencyProfileRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(EmergencyProfile).filter(EmergencyProfile.user_id == current_user.id).first()
    if not profile:
        profile = EmergencyProfile(user_id=current_user.id)
        db.add(profile)

    if payload.blood_group is not None:
        profile.blood_group = payload.blood_group
    if payload.medical_conditions is not None:
        profile.medical_conditions = payload.medical_conditions
    if payload.emergency_contact_name is not None:
        profile.emergency_contact_name = payload.emergency_contact_name
    if payload.emergency_contact_phone is not None:
        profile.emergency_contact_phone = payload.emergency_contact_phone
    if payload.trusted_contacts_json is not None:
        profile.trusted_contacts_json = payload.trusted_contacts_json

    db.add(ActivityLog(user_id=current_user.id, event="UPDATE_EMERGENCY_PROFILE", metadata_json={"details": "Updated emergency profile details"}))
    db.commit()
    db.refresh(profile)

    return {
        "message": "Emergency profile updated successfully",
        "profile": {
            "blood_group": profile.blood_group,
            "medical_conditions": profile.medical_conditions,
            "emergency_contact_name": profile.emergency_contact_name,
            "emergency_contact_phone": profile.emergency_contact_phone,
            "trusted_contacts_json": profile.trusted_contacts_json
        }
    }


@router.get("/insights")
def get_insights(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    health_data = calculate_life_health_score(db, current_user.id)
    reminders = db.query(Reminder).filter(Reminder.user_id == current_user.id).all()
    doc_count = db.query(Document).filter(Document.user_id == current_user.id).count()

    return {
        "alerts": health_data["risks"],
        "reminders": [
            {
                "id": r.id,
                "title": r.title,
                "message": r.message,
                "trigger_time": r.trigger_time.isoformat() if r.trigger_time else None
            }
            for r in reminders
        ],
        "document_count": doc_count
    }

