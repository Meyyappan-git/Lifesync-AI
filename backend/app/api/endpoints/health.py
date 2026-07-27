import os
import shutil
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.api import deps
from app.models.user import User
from app.models.health_report import HealthReport
from app.schemas.health_report import HealthReportCreateManual, HealthReportResponse
from app.core.ai_service import AIService
from app.core.config import settings

router = APIRouter()

@router.post("/analyze-manual", response_model=HealthReportResponse, status_code=status.HTTP_201_CREATED)
def analyze_manual(
    data: HealthReportCreateManual,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    manual_dict = data.model_dump()
    cautions, remedies = AIService.analyze_health_data(
        report_type="manual",
        manual_data=manual_dict
    )
    
    report = HealthReport(
        user_id=current_user.id,
        report_type="manual",
        manual_data=manual_dict,
        cautions=cautions,
        remedies=remedies
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

@router.post("/analyze-file", response_model=HealthReportResponse, status_code=status.HTTP_201_CREATED)
def analyze_file(
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    # Ensure storage directory exists
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
    
    # Save file
    file_ext = os.path.splitext(file.filename)[1]
    safe_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(settings.STORAGE_DIR, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Extract text from file using OCR
        raw_text = AIService.extract_text_from_image(file_path)
    finally:
        # We can clean up or keep files for future usage. Let's delete to prevent storage waste
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
    
    # Analyze text
    cautions, remedies = AIService.analyze_health_data(
        report_type="file",
        raw_text=raw_text
    )
    
    report = HealthReport(
        user_id=current_user.id,
        report_type="file",
        raw_content=raw_text,
        cautions=cautions,
        remedies=remedies
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report

@router.get("/history", response_model=List[HealthReportResponse])
def get_history(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    reports = db.query(HealthReport).filter(HealthReport.user_id == current_user.id).order_by(HealthReport.created_at.desc()).all()
    return reports

@router.get("/report/{id}", response_model=HealthReportResponse)
def get_report(
    id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    report = db.query(HealthReport).filter(HealthReport.id == id, HealthReport.user_id == current_user.id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Health report not found")
    return report
