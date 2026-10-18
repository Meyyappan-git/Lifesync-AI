from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.api import deps
from app.models.core_models import (
    Folder,
    Document,
    DocumentMetadata,
    RiskAlert,
    Reminder,
    EmergencyProfile,
    DocumentRelationship,
    ChatMessage,
)
from app.models.activity_log import ActivityLog
from app.models.user import User
from app.schemas.user import User as UserSchema
from app.schemas.lifesync import (
    ReminderCreate,
    ReminderUpdate,
    ReminderResponse,
    DocumentUpdateRequest,
    DocumentRelationshipCreate,
    DocumentRelationshipResponse,
    RiskResolveRequest,
    ChatMessageResponse,
    TravelCheckRequest,
    TravelReadinessResponse,
    DocumentSearchResult,
    DocumentSearchResponse,
)
from app.db.database import get_db
from app.services.folder_classifier import parse_metadata_from_text, classify_folder_for_doc
from app.services.ocr_service import extract_text_from_file, parse_structured_metadata, classify_document_folder
from app.services.cross_domain_risk_engine import calculate_life_health_score, evaluate_cross_domain_risks
from app.services.ai_assistant import answer_ai_assistant_query
from app.services.email_service import EmailService
from app.core.config import settings
from datetime import date, datetime, timezone
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
    today = date.today()
    upcoming_expiries = []
    for doc in documents:
        for meta in doc.metadata_entries:
            if meta.meta_key == "expiry_date":
                try:
                    exp_dt = datetime.strptime(meta.meta_value, "%Y-%m-%d").date()
                    days_left = (exp_dt - today).days
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

@router.delete("/folders/{folder_id}", status_code=status.HTTP_200_OK)
def delete_folder(
    folder_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")

    folder_name = folder.name

    # Set documents in this folder for current_user to folder_id = None
    db.query(Document).filter(
        Document.folder_id == folder_id,
        Document.user_id == current_user.id
    ).update({"folder_id": None}, synchronize_session=False)

    try:
        db.delete(folder)
        db.commit()
    except Exception:
        db.rollback()
        # Fallback if DB foreign key constraints prevent full deletion of a shared system folder
        db.query(Document).filter(
            Document.folder_id == folder_id,
            Document.user_id == current_user.id
        ).update({"folder_id": None}, synchronize_session=False)
        db.commit()

    db.add(ActivityLog(
        user_id=current_user.id,
        event="DELETE_FOLDER",
        metadata_json={"details": f"Deleted folder '{folder_name}'"}
    ))
    db.commit()

    return {"message": f"Folder '{folder_name}' deleted successfully"}


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
            folder_obj = Folder(name=fname, description=f"Custom folder for {fname}", user_id=current_user.id)
            db.add(folder_obj)
            db.commit()
            db.refresh(folder_obj)
        target_folder_id = folder_obj.id

    if not target_folder_id:
        user_folders = [f.name for f in db.query(Folder).filter((Folder.user_id == None) | (Folder.user_id == current_user.id)).all()]
        classified_name = classify_document_folder(payload.name, text_content, extracted_meta, user_folders)
        folder_obj = db.query(Folder).filter(
            func.lower(Folder.name) == classified_name.lower(),
            (Folder.user_id == None) | (Folder.user_id == current_user.id)
        ).first()
        if not folder_obj:
            folder_obj = Folder(name=classified_name, description=f"{classified_name} documents folder", user_id=current_user.id)
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

    folder_name_resolved = document.folder.name if document.folder else "General"
    db.add(ActivityLog(user_id=current_user.id, event="UPLOAD_DOC", metadata_json={"details": f"Created document '{payload.name}' in '{folder_name_resolved}'"}))
    db.commit()

    return {
        "id": document.id,
        "name": document.name,
        "folder_id": target_folder_id,
        "folder_name": folder_name_resolved,
        "metadata": extracted_meta,
        "message": f"Document saved and organized into folder: '{folder_name_resolved}'"
    }


@router.post("/documents/upload", status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
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
    doc_title = (name or "").strip() or file.filename

    # Multimodal Text & OCR Extraction
    text_content = extract_text_from_file(content, file_type, file.filename)
    extracted_meta = parse_structured_metadata(text_content, doc_title)

    if expiry_date:
        extracted_meta['expiry_date'] = expiry_date

    # User selected folder or automatic smart folder classification
    target_folder_id = folder_id
    if not target_folder_id and folder_name and folder_name.strip() and folder_name.strip().lower() != "auto":
        fname = folder_name.strip()
        folder_obj = db.query(Folder).filter(
            func.lower(Folder.name) == fname.lower(),
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
        user_folders = [f.name for f in db.query(Folder).filter((Folder.user_id == None) | (Folder.user_id == current_user.id)).all()]
        classified_name = classify_document_folder(doc_title, text_content, extracted_meta, user_folders)
        folder_obj = db.query(Folder).filter(
            func.lower(Folder.name) == classified_name.lower(),
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
        name=doc_title,
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

    folder_name_resolved = document.folder.name if document.folder else "General"
    db.add(ActivityLog(user_id=current_user.id, event="UPLOAD_DOC", metadata_json={"details": f"Uploaded file '{doc_title}' into '{folder_name_resolved}'"}))
    db.commit()

    return {
        "id": document.id,
        "name": document.name,
        "folder_id": target_folder_id,
        "folder_name": folder_name_resolved,
        "metadata": extracted_meta,
        "word_count": extracted_meta.get("ocr_word_count", "0"),
        "message": f"Document analyzed and filed into '{folder_name_resolved}' folder"
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


@router.get("/documents/search", response_model=DocumentSearchResponse)
def search_documents(
    q: Optional[str] = "",
    folder_id: Optional[int] = None,
    file_type: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db),
):
    query_str = (q or "").strip()
    query_lower = query_str.lower()

    docs_query = db.query(Document).filter(Document.user_id == current_user.id)
    if folder_id:
        docs_query = docs_query.filter(Document.folder_id == folder_id)
    if file_type:
        docs_query = docs_query.filter(Document.file_type == file_type.lower())

    all_user_docs = docs_query.all()

    results = []
    for doc in all_user_docs:
        name = doc.name or ""
        raw_content = doc.raw_content or ""
        folder_name = doc.folder.name if doc.folder else "General"
        metadata_dict = {m.meta_key: m.meta_value for m in (doc.metadata_entries or [])}

        if not query_str:
            results.append(DocumentSearchResult(
                id=doc.id,
                name=name,
                file_type=doc.file_type,
                folder_id=doc.folder_id,
                folder_name=folder_name,
                created_at=doc.created_at.isoformat() if doc.created_at else None,
                metadata=metadata_dict,
                matched_field="all",
                snippet=f"Document in {folder_name}"
            ))
            continue

        matched_field = None
        snippet = None

        if query_lower in name.lower():
            matched_field = "name"
            snippet = f"Match in filename: {name}"
        elif query_lower in folder_name.lower():
            matched_field = "folder"
            snippet = f"Located in folder: {folder_name}"
        else:
            for k, v in metadata_dict.items():
                if query_lower in (k or "").lower() or query_lower in (v or "").lower():
                    matched_field = "metadata"
                    snippet = f"Match in property '{k}': {v}"
                    break

        if not matched_field and raw_content and query_lower in raw_content.lower():
            matched_field = "content"
            idx = raw_content.lower().find(query_lower)
            start_idx = max(0, idx - 40)
            end_idx = min(len(raw_content), idx + len(query_lower) + 40)
            prefix = "..." if start_idx > 0 else ""
            suffix = "..." if end_idx < len(raw_content) else ""
            snippet = f"{prefix}{raw_content[start_idx:end_idx].strip()}{suffix}"

        if matched_field:
            results.append(DocumentSearchResult(
                id=doc.id,
                name=name,
                file_type=doc.file_type,
                folder_id=doc.folder_id,
                folder_name=folder_name,
                created_at=doc.created_at.isoformat() if doc.created_at else None,
                metadata=metadata_dict,
                matched_field=matched_field,
                snippet=snippet
            ))

    return DocumentSearchResponse(
        query=query_str,
        total=len(results),
        results=results
    )


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

def _evaluate_travel_readiness(
    user_docs: List[Document],
    destination: str = "International",
    trip_type: str = "international",
    departure_date_str: Optional[str] = None
) -> dict:
    doc_infos = []
    for d in user_docs:
        name_lower = (d.name or "").lower()
        folder_lower = (d.folder.name or "").lower() if d.folder else ""
        metadata_map = {}
        for m in (d.metadata_entries or []):
            if m.meta_key:
                metadata_map[m.meta_key.lower()] = (m.meta_value or "").lower()
        doc_infos.append({
            "name": name_lower,
            "folder": folder_lower,
            "metadata": metadata_map
        })

    has_passport = False
    passport_expiry_issue = False
    passport_notes = ""

    dep_date = None
    if departure_date_str:
        try:
            dep_date = datetime.strptime(departure_date_str[:10], "%Y-%m-%d")
        except Exception:
            dep_date = None

    for d in doc_infos:
        if "passport" in d["name"] or "passport_number" in d["metadata"] or d["folder"] == "passport":
            has_passport = True
            expiry_val = d["metadata"].get("expiry_date") or d["metadata"].get("passport_expiry")
            if expiry_val and dep_date:
                for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
                    try:
                        exp_dt = datetime.strptime(expiry_val[:10], fmt)
                        diff_days = (exp_dt - dep_date).days
                        threshold_days = 90 if trip_type.lower() == "schengen" else 180
                        if diff_days < threshold_days:
                            passport_expiry_issue = True
                            passport_notes = f"Passport expires in {max(0, diff_days)} days from departure (less than {threshold_days // 30} months required)."
                        else:
                            passport_notes = f"Passport valid for {diff_days} days beyond departure date."
                        break
                    except Exception:
                        continue

    has_visa = any(
        "visa" in d["name"] or "esta" in d["name"] or "eta" in d["name"] or "permit" in d["name"]
        for d in doc_infos
    )
    has_flight = any(
        "flight" in d["name"] or "ticket" in d["name"] or "boarding" in d["name"] or "airline" in d["name"] or "itinerary" in d["name"]
        for d in doc_infos
    )
    has_hotel = any(
        "hotel" in d["name"] or "booking" in d["name"] or "airbnb" in d["name"] or "reservation" in d["name"] or "lodging" in d["name"]
        for d in doc_infos
    )
    has_insurance = any(
        "insurance" in d["name"] or "policy" in d["name"] or "travel_insurance" in d["name"] or "medical" in d["name"]
        for d in doc_infos
    )
    has_vaccine = any(
        "vaccin" in d["name"] or "immunization" in d["name"] or "yellow_fever" in d["name"] or "covid" in d["name"]
        for d in doc_infos
    )
    has_id_card = any(
        "license" in d["name"] or "licence" in d["name"] or "id" in d["name"] or "aadhaar" in d["name"] or "pan" in d["name"] or "driver" in d["name"]
        for d in doc_infos
    )

    t_type = (trip_type or "international").lower()

    if t_type == "domestic":
        checks = [
            {
                "name": "Government Photo ID (Driver's License / ID)",
                "required": True,
                "status": has_id_card or has_passport,
                "details": "Verified Photo ID" if (has_id_card or has_passport) else "Upload Driver's License or National ID",
                "recommendation": "Carry physical card or official digital ID."
            },
            {
                "name": "Flight / Transit Ticket",
                "required": True,
                "status": has_flight,
                "details": "Transit booking confirmed" if has_flight else "Missing flight / train tickets",
                "recommendation": "Keep offline copy on smartphone."
            },
            {
                "name": "Hotel / Lodging Booking",
                "required": True,
                "status": has_hotel,
                "details": "Accommodation confirmed" if has_hotel else "Missing lodging reservation",
                "recommendation": "Check check-in time and cancellation policy."
            },
            {
                "name": "Health / Emergency Insurance",
                "required": False,
                "status": has_insurance,
                "details": "Active policy detected" if has_insurance else "Optional domestic coverage recommended",
                "recommendation": "Check if primary health insurance covers out-of-state visits."
            }
        ]
        advisories = [
            "Domestic travel requires a valid government-issued photo ID.",
            "Save digital copies of boarding passes and hotel check-in confirmations offline.",
            "Verify weather forecasts and local transportation options at destination."
        ]
    elif t_type == "schengen":
        passport_ok = has_passport and not passport_expiry_issue
        checks = [
            {
                "name": "Passport Validity (3+ Months Beyond Return)",
                "required": True,
                "status": passport_ok,
                "details": passport_notes or ("Passport detected" if has_passport else "Missing passport upload"),
                "recommendation": "Schengen requires passport issued within last 10 years and valid 3+ months past departure."
            },
            {
                "name": "Schengen Visa / ETIAS Authorization",
                "required": True,
                "status": has_visa,
                "details": "Visa document detected" if has_visa else "Missing Schengen visa / entry authorization",
                "recommendation": "Ensure multiple-entry visa if crossing non-Schengen borders."
            },
            {
                "name": "Schengen Travel Medical Insurance (€30,000+)",
                "required": True,
                "status": has_insurance,
                "details": "Insurance policy found" if has_insurance else "Mandatory medical coverage missing",
                "recommendation": "Coverage must be minimum €30,000 covering emergency repatriation."
            },
            {
                "name": "Round-trip Flight Reservation",
                "required": True,
                "status": has_flight,
                "details": "Flight booking found" if has_flight else "Missing return flight confirmation",
                "recommendation": "Immigration may request proof of onward or return travel."
            },
            {
                "name": "Hotel Booking / Accommodation Proof",
                "required": True,
                "status": has_hotel,
                "details": "Lodging confirmed" if has_hotel else "Missing hotel reservation",
                "recommendation": "Have all hotel voucher copies printed or saved offline."
            }
        ]
        advisories = [
            "Schengen border authorities strictly enforce mandatory €30,000 emergency medical insurance.",
            "Ensure passport was issued within the last 10 years with at least 2 blank pages.",
            "Keep proof of financial funds and itinerary readily accessible at immigration."
        ]
    else:  # international default
        passport_ok = has_passport and not passport_expiry_issue
        checks = [
            {
                "name": "Passport Validity (>6 Months)",
                "required": True,
                "status": passport_ok,
                "details": passport_notes or ("Passport detected" if has_passport else "Missing passport upload"),
                "recommendation": "Ensure passport has at least 6 months remaining validity from departure date."
            },
            {
                "name": "Entry Visa / Travel Authorization (ETA)",
                "required": True,
                "status": has_visa,
                "details": "Visa found" if has_visa else f"Missing visa or electronic travel permit for {destination}",
                "recommendation": f"Check visa rules for {destination} before departure."
            },
            {
                "name": "Flight Tickets & Itinerary",
                "required": True,
                "status": has_flight,
                "details": "Tickets found" if has_flight else "Missing flight booking",
                "recommendation": "Confirm departure terminal and baggage allowances."
            },
            {
                "name": "Hotel & Accommodation Confirmation",
                "required": True,
                "status": has_hotel,
                "details": "Lodging reservation verified" if has_hotel else "Missing hotel / stay confirmation",
                "recommendation": "Confirm check-in policy and airport transfer."
            },
            {
                "name": "International Travel Insurance",
                "required": True,
                "status": has_insurance,
                "details": "Insurance policy on file" if has_insurance else "Missing international insurance",
                "recommendation": "Ensure policy covers medical emergencies, trip delays, and baggage loss."
            },
            {
                "name": "Vaccination & Health Certificates",
                "required": False,
                "status": has_vaccine,
                "details": "Vaccination proof found" if has_vaccine else "No vaccination records attached",
                "recommendation": f"Review mandatory vaccines (e.g. Yellow Fever, Routine) for {destination}."
            }
        ]
        advisories = [
            f"Most countries mandate passport validity of at least 6 months for entry into {destination}.",
            "Verify any transit visa requirements for airport layovers.",
            "Register your trip details with your national smart traveler or embassy notification service."
        ]

    req_checks = [c for c in checks if c["required"]]
    passed_req = sum(1 for c in req_checks if c["status"])
    total_req = len(req_checks) if req_checks else 1
    readiness_score = int((passed_req / total_req) * 100)
    missing_count = sum(1 for c in req_checks if not c["status"])

    return {
        "readiness_score": readiness_score,
        "destination": destination,
        "trip_type": t_type,
        "departure_date": departure_date_str,
        "checks": checks,
        "missing_count": missing_count,
        "advisories": advisories
    }


@router.get("/travel-readiness")
def get_travel_readiness(
    destination: Optional[str] = "International",
    trip_type: Optional[str] = "international",
    departure_date: Optional[str] = None,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    user_docs = db.query(Document).filter(Document.user_id == current_user.id).all()
    return _evaluate_travel_readiness(user_docs, destination, trip_type, departure_date)


@router.post("/travel-readiness/check")
def check_travel_readiness(
    payload: TravelCheckRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    user_docs = db.query(Document).filter(Document.user_id == current_user.id).all()
    return _evaluate_travel_readiness(
        user_docs,
        payload.destination or "International",
        payload.trip_type or "international",
        payload.departure_date
    )


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
    reminders = db.query(Reminder).filter(Reminder.user_id == current_user.id).order_by(Reminder.trigger_time.asc()).all()
    doc_count = db.query(Document).filter(Document.user_id == current_user.id).count()

    return {
        "alerts": health_data["risks"],
        "reminders": [
            {
                "id": r.id,
                "title": r.title,
                "message": r.message,
                "trigger_time": r.trigger_time.isoformat() if r.trigger_time else None,
                "is_sent": r.is_sent
            }
            for r in reminders
        ],
        "document_count": doc_count
    }


# =========================================================================
# Reminders Management & Due Alerts
# =========================================================================

@router.get("/reminders")
def get_reminders(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    reminders = db.query(Reminder).filter(Reminder.user_id == current_user.id).order_by(Reminder.trigger_time.asc()).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "message": r.message,
            "trigger_time": r.trigger_time.isoformat() if r.trigger_time else None,
            "is_sent": r.is_sent,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in reminders
    ]


@router.post("/reminders", status_code=status.HTTP_201_CREATED)
def create_reminder(
    payload: ReminderCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    # Ensure timezone-naive comparison/storage if needed
    trigger_dt = payload.trigger_time
    if trigger_dt.tzinfo is not None:
        trigger_dt = trigger_dt.astimezone(timezone.utc).replace(tzinfo=None)

    reminder = Reminder(
        user_id=current_user.id,
        title=payload.title.strip(),
        message=payload.message.strip() if payload.message else None,
        trigger_time=trigger_dt,
        is_sent=False
    )
    db.add(reminder)
    db.add(ActivityLog(user_id=current_user.id, event="CREATE_REMINDER", metadata_json={"details": f"Created reminder '{payload.title}'"}))
    db.commit()
    db.refresh(reminder)
    return {
        "id": reminder.id,
        "title": reminder.title,
        "message": reminder.message,
        "trigger_time": reminder.trigger_time.isoformat() if reminder.trigger_time else None,
        "is_sent": reminder.is_sent,
        "created_at": reminder.created_at.isoformat() if reminder.created_at else None
    }


@router.patch("/reminders/{reminder_id}")
def update_reminder(
    reminder_id: int,
    payload: ReminderUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    if payload.title is not None and payload.title.strip():
        reminder.title = payload.title.strip()
    if payload.message is not None:
        reminder.message = payload.message.strip() if payload.message else None
    if payload.trigger_time is not None:
        trigger_dt = payload.trigger_time
        if trigger_dt.tzinfo is not None:
            trigger_dt = trigger_dt.astimezone(timezone.utc).replace(tzinfo=None)
        reminder.trigger_time = trigger_dt
    if payload.is_sent is not None:
        reminder.is_sent = payload.is_sent

    db.commit()
    db.refresh(reminder)
    return {
        "id": reminder.id,
        "title": reminder.title,
        "message": reminder.message,
        "trigger_time": reminder.trigger_time.isoformat() if reminder.trigger_time else None,
        "is_sent": reminder.is_sent
    }


@router.delete("/reminders/{reminder_id}")
def delete_reminder(
    reminder_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    db.delete(reminder)
    db.add(ActivityLog(user_id=current_user.id, event="DELETE_REMINDER", metadata_json={"details": f"Deleted reminder '{reminder.title}'"}))
    db.commit()
    return {"message": "Reminder deleted successfully"}


@router.post("/reminders/{reminder_id}/send-now")
def send_reminder_now(
    reminder_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    trigger_str = reminder.trigger_time.strftime("%Y-%m-%d %H:%M UTC") if reminder.trigger_time else ""
    EmailService.send_reminder_email(current_user.email, reminder.title, reminder.message or "", trigger_str)
    reminder.is_sent = True
    db.commit()
    return {"message": f"Reminder email successfully dispatched to {current_user.email}", "is_sent": True}


@router.post("/reminders/check-due")
def check_due_reminders(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    now_dt = datetime.now()
    due_reminders = db.query(Reminder).filter(
        Reminder.user_id == current_user.id,
        Reminder.trigger_time <= now_dt,
        Reminder.is_sent == False
    ).all()

    sent_count = 0
    for r in due_reminders:
        trigger_str = r.trigger_time.strftime("%Y-%m-%d %H:%M UTC") if r.trigger_time else ""
        EmailService.send_reminder_email(current_user.email, r.title, r.message or "", trigger_str)
        r.is_sent = True
        sent_count += 1

    if sent_count > 0:
        db.commit()

    return {"message": f"Checked due reminders. Dispatched {sent_count} alerts.", "dispatched_count": sent_count}


# =========================================================================
# AI Assistant Chat History & Clear
# =========================================================================

@router.get("/assistant/history")
def get_chat_history(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    messages = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).order_by(ChatMessage.created_at.asc()).all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat() if m.created_at else None
        }
        for m in messages
    ]


@router.delete("/assistant/history")
def clear_chat_history(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    deleted_count = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Chat history cleared successfully", "deleted_count": deleted_count}


# =========================================================================
# Document Metadata & Details Editing (PATCH)
# =========================================================================

@router.patch("/documents/{document_id}")
def update_document(
    document_id: int,
    payload: DocumentUpdateRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if payload.name is not None and payload.name.strip():
        doc.name = payload.name.strip()

    if payload.folder_id is not None:
        folder = db.query(Folder).filter(Folder.id == payload.folder_id).first()
        if folder:
            doc.folder_id = folder.id

    if payload.metadata is not None:
        for k, v in payload.metadata.items():
            clean_key = k.strip().lower().replace(" ", "_")
            existing_meta = db.query(DocumentMetadata).filter(
                DocumentMetadata.document_id == doc.id,
                DocumentMetadata.meta_key == clean_key
            ).first()
            if existing_meta:
                existing_meta.meta_value = str(v).strip()
            else:
                db.add(DocumentMetadata(document_id=doc.id, meta_key=clean_key, meta_value=str(v).strip()))

    db.add(ActivityLog(user_id=current_user.id, event="UPDATE_DOC", metadata_json={"details": f"Updated document '{doc.name}'"}))
    db.commit()
    db.refresh(doc)

    metadata = {m.meta_key: m.meta_value for m in doc.metadata_entries}
    return {
        "id": doc.id,
        "name": doc.name,
        "folder_id": doc.folder_id,
        "folder_name": doc.folder.name if doc.folder else "General",
        "metadata": metadata,
        "message": "Document updated successfully"
    }


# =========================================================================
# Document Relationships (depends_on, related_to, supersedes)
# =========================================================================

@router.get("/documents/{document_id}/relationships")
def get_document_relationships(
    document_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    relationships = db.query(DocumentRelationship).filter(
        DocumentRelationship.user_id == current_user.id,
        (DocumentRelationship.source_document_id == document_id) | (DocumentRelationship.target_document_id == document_id)
    ).all()

    results = []
    for r in relationships:
        other_doc_id = r.target_document_id if r.source_document_id == document_id else r.source_document_id
        other_doc = db.query(Document).filter(Document.id == other_doc_id).first()
        is_source = (r.source_document_id == document_id)
        results.append({
            "id": r.id,
            "source_document_id": r.source_document_id,
            "target_document_id": r.target_document_id,
            "is_source": is_source,
            "relationship_type": r.relationship_type,
            "notes": r.notes,
            "linked_doc_id": other_doc_id,
            "linked_doc_name": other_doc.name if other_doc else "Unknown",
            "linked_doc_folder": other_doc.folder.name if (other_doc and other_doc.folder) else "General",
            "linked_doc_type": other_doc.file_type if other_doc else "file",
            "created_at": r.created_at.isoformat() if r.created_at else None
        })

    return results


@router.post("/documents/{document_id}/relationships", status_code=status.HTTP_201_CREATED)
def create_document_relationship(
    document_id: int,
    payload: DocumentRelationshipCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    source_doc = db.query(Document).filter(Document.id == document_id, Document.user_id == current_user.id).first()
    if not source_doc:
        raise HTTPException(status_code=404, detail="Source document not found")

    target_doc = db.query(Document).filter(Document.id == payload.target_document_id, Document.user_id == current_user.id).first()
    if not target_doc:
        raise HTTPException(status_code=404, detail="Target document not found")

    if source_doc.id == target_doc.id:
        raise HTTPException(status_code=400, detail="Cannot link a document to itself")

    existing = db.query(DocumentRelationship).filter(
        DocumentRelationship.user_id == current_user.id,
        (
            (DocumentRelationship.source_document_id == source_doc.id) & (DocumentRelationship.target_document_id == target_doc.id)
        ) | (
            (DocumentRelationship.source_document_id == target_doc.id) & (DocumentRelationship.target_document_id == source_doc.id)
        )
    ).first()
    if existing:
        return {"id": existing.id, "message": "Relationship already exists"}

    rel = DocumentRelationship(
        user_id=current_user.id,
        source_document_id=source_doc.id,
        target_document_id=target_doc.id,
        relationship_type=payload.relationship_type,
        notes=payload.notes
    )
    db.add(rel)
    db.commit()
    db.refresh(rel)

    return {
        "id": rel.id,
        "source_document_id": rel.source_document_id,
        "target_document_id": rel.target_document_id,
        "relationship_type": rel.relationship_type,
        "notes": rel.notes,
        "message": f"Successfully linked '{source_doc.name}' with '{target_doc.name}'"
    }


@router.delete("/documents/relationships/{relationship_id}")
def delete_document_relationship(
    relationship_id: int,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    rel = db.query(DocumentRelationship).filter(
        DocumentRelationship.id == relationship_id,
        DocumentRelationship.user_id == current_user.id
    ).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")

    db.delete(rel)
    db.commit()
    return {"message": "Relationship unlinked successfully"}


# =========================================================================
# Risk Alert Resolution Persistence
# =========================================================================

@router.post("/risks/resolve")
def resolve_risk_alert(
    payload: RiskResolveRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    alert = db.query(RiskAlert).filter(
        RiskAlert.user_id == current_user.id,
        RiskAlert.title == payload.risk_title
    ).first()

    if not alert:
        alert = RiskAlert(
            user_id=current_user.id,
            title=payload.risk_title,
            risk_level="Medium",
            reason="User action resolved",
            recommended_action="None",
            is_resolved=payload.is_resolved
        )
        db.add(alert)
    else:
        alert.is_resolved = payload.is_resolved

    db.add(ActivityLog(
        user_id=current_user.id,
        event="RESOLVE_RISK",
        metadata_json={"details": f"{'Resolved' if payload.is_resolved else 'Unresolved'} risk '{payload.risk_title}'"}
    ))
    db.commit()
    return {"message": f"Risk alert status updated", "is_resolved": alert.is_resolved}


@router.get("/risks/resolved")
def get_resolved_risks(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    resolved = db.query(RiskAlert).filter(
        RiskAlert.user_id == current_user.id,
        RiskAlert.is_resolved == True
    ).all()
    return [r.title for r in resolved]

