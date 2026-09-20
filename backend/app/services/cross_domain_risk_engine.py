from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.core_models import Document, DocumentMetadata, Folder, RiskAlert, Reminder

REQUIRED_FOLDER_DOCS = {
    "Vehicle": ["Driving Licence", "RC Book", "Vehicle Insurance", "PUC Certificate", "Road Tax"],
    "Travel": ["Passport", "Visa", "Flight Ticket", "Hotel Booking", "Travel Insurance"],
    "Health": ["Health Insurance", "Medical Reports", "Prescriptions", "Vaccination Records"],
    "Education": ["Degree Certificate", "Mark Sheets", "Transfer Certificate"],
    "Employment": ["Offer Letter", "Salary Slips", "Experience Certificate"],
    "Finance": ["PAN Card", "Bank Statements", "Tax Returns"],
    "Property": ["Sale Deed", "Property Tax", "Electricity Bills"]
}

def compute_folder_stats(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """Return folder statistics (doc count, completion pct, missing docs) for the given user."""
    user_docs = db.query(Document).filter(Document.user_id == user_id).all()
    folder_stats: List[Dict[str, Any]] = []
    total_completion = 0
    folders = db.query(Folder).all()
    for f in folders:
        f_docs = [d for d in user_docs if d.folder_id == f.id]
        f_doc_names = [d.name.lower() for d in f_docs]
        req_types = REQUIRED_FOLDER_DOCS.get(f.name, [])
        found_count = 0
        missing = []
        for req in req_types:
            if any(req.lower() in d_name for d_name in f_doc_names):
                found_count += 1
            else:
                missing.append(req)
        completion_pct = int((found_count / len(req_types)) * 100) if req_types else 100
        folder_stats.append({
            "folder_id": f.id,
            "folder_name": f.name,
            "completion_pct": completion_pct,
            "doc_count": len(f_docs),
            "missing_docs": missing,
        })
        total_completion += completion_pct
    # Note: avg_completion is calculated elsewhere; this function only returns stats.
    return folder_stats

def get_doc_by_keyword(doc_map: Dict[str, Any], keywords: List[str]) -> str:
    """Helper to find the first key in doc_map matching any keyword."""
    for key in doc_map.keys():
        if any(kw.lower() in key for kw in keywords):
            return key
    return None

def evaluate_cross_domain_risks(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """
    Core Innovation Engine: Cross-Domain Risk Correlation Engine
    Correlates documents across multiple life folders to detect hidden risks.
    """
    user_docs = db.query(Document).filter(Document.user_id == user_id).all()
    
    doc_map = {}
    expiry_map = {}
    
    for doc in user_docs:
        doc_name_lower = doc.name.lower()
        folder_name = doc.folder.name if doc.folder else ""
        doc_map[doc_name_lower] = {
            "id": doc.id,
            "name": doc.name,
            "folder": folder_name,
            "raw": doc.raw_content or ""
        }
        
        # Check metadata entries
        for meta in doc.metadata_entries:
            if meta.meta_key == "expiry_date":
                try:
                    # attempt parsing
                    dt = datetime.strptime(meta.meta_value, "%Y-%m-%d")
                    expiry_map[doc_name_lower] = dt
                except Exception:
                    pass

    detected_risks = []
    now = datetime.now()

    # Rule 1: Flight Ticket + Passport Expiry (< 6 months)
    has_flight = any('flight' in d or 'ticket' in d for d in doc_map)
    passport_doc = get_doc_by_keyword(doc_map, ['passport'])
    if has_flight and passport_doc:
        p_expiry = expiry_map.get(passport_doc)
        if p_expiry and (p_expiry - now).days < 180:
            detected_risks.append({
                "title": "Critical Travel Risk: Passport Expiring Before International Flight",
                "risk_level": "Critical",
                "reason": "Flight ticket found, but Passport expires within 6 months. Many countries reject entry.",
                "recommended_action": "Renew Passport immediately via Passport Seva / Embassy before travel date.",
                "deadline": p_expiry.strftime("%Y-%m-%d")
            })

    # Rule 2: Hotel Booking + Visa Missing
    has_hotel = any('hotel' in d or 'booking' in d for d in doc_map)
    has_visa = any('visa' in d for d in doc_map)
    if has_hotel and not has_visa:
        detected_risks.append({
            "title": "Critical Alert: Hotel Booked but Visa Missing",
            "risk_level": "Critical",
            "reason": "Hotel booking found in Travel Folder, but no valid Visa document is uploaded.",
            "recommended_action": "Apply for Visa or upload existing E-Visa immediately.",
            "deadline": (now + timedelta(days=7)).strftime("%Y-%m-%d")
        })

    # Rule 3: Health Insurance Expired + Surgery/Medical Record
    has_medical = any('medical' in d or 'prescription' in d or 'surgery' in d for d in doc_map)
    health_ins_doc = get_doc_by_keyword(doc_map, ['health insurance', 'medical insurance'])
    if has_medical and health_ins_doc:
        ins_expiry = expiry_map.get(health_ins_doc)
        if ins_expiry and ins_expiry < now:
            detected_risks.append({
                "title": "Critical Medical Risk: Health Insurance Expired with Active Medical Records",
                "risk_level": "Critical",
                "reason": "Recent medical records found, but Health Insurance policy expired on " + ins_expiry.strftime("%Y-%m-%d"),
                "recommended_action": "Renew health insurance policy immediately to ensure hospitalization coverage.",
                "deadline": now.strftime("%Y-%m-%d")
            })

    # Rule 4: Driving Licence Expired + Active Vehicle
    has_vehicle = any('rc' in d or 'car' in d or 'vehicle' in d for d in doc_map)
    dl_doc = get_doc_by_keyword(doc_map, ['driving', 'dl'])
    if has_vehicle and dl_doc:
        dl_expiry = expiry_map.get(dl_doc)
        if dl_expiry and dl_expiry < now:
            detected_risks.append({
                "title": "High Risk: Driving Licence Expired while owning Active Vehicle",
                "risk_level": "High",
                "reason": "Driving a vehicle with an expired Driving Licence is illegal and invalidates vehicle insurance.",
                "recommended_action": "Apply for DL Renewal at RTO immediately.",
                "deadline": dl_expiry.strftime("%Y-%m-%d")
            })

    # Rule 5: Default low/medium fallback check for any document expiring in < 30 days
    for doc_k, exp_dt in expiry_map.items():
        days_left = (exp_dt - now).days
        if 0 <= days_left <= 30:
            doc_info = doc_map[doc_k]
            detected_risks.append({
                "title": f"Upcoming Expiry: {doc_info['name']}",
                "risk_level": "Medium" if days_left > 7 else "High",
                "reason": f"Document {doc_info['name']} in folder {doc_info['folder']} expires in {days_left} days.",
                "recommended_action": f"Initiate renewal process for {doc_info['name']}.",
                "deadline": exp_dt.strftime("%Y-%m-%d")
            })

    return detected_risks

def calculate_life_health_score(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Calculates overall Life Health Score (0-100), folder completion rates, and risk summary.
    """
    # Compute per‑user folder statistics
    folder_stats = compute_folder_stats(db, user_id)
    # Calculate average completion percentage across all folders
    total_completion = sum(f["completion_pct"] for f in folder_stats)
    avg_completion = total_completion // len(folder_stats) if folder_stats else 0
    
    # Calculate risks
    active_risks = evaluate_cross_domain_risks(db, user_id)
    critical_count = sum(1 for r in active_risks if r['risk_level'] == 'Critical')
    high_count = sum(1 for r in active_risks if r['risk_level'] == 'High')
    
    # Penalty calculation
    penalty = (critical_count * 20) + (high_count * 10)
    health_score = max(10, min(100, avg_completion - penalty))

    return {
        "life_health_score": health_score,
        "folder_completion_avg": avg_completion,
        "folder_stats": folder_stats,
        "active_risks_count": len(active_risks),
        "critical_risks": critical_count,
        "high_risks": high_count,
        "risks": active_risks
    }
