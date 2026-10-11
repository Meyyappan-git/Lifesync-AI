import re
from datetime import datetime, timedelta
from typing import Dict, Any, List

def parse_metadata_from_text(raw_text: str) -> Dict[str, Any]:
    """
    Extract structured life management key metadata from OCR extracted text.
    """
    metadata = {}
    
    # 1. Dates (Expiry, Issue, General)
    date_patterns = [
        (r'(?i)(?:expir|valid until|due date)[:\s]*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4}|[0-9]{4}[/-][0-9]{2}[/-][0-9]{2})', 'expiry_date'),
        (r'(?i)(?:issue date|issued)[:\s]*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4}|[0-9]{4}[/-][0-9]{2}[/-][0-9]{2})', 'issue_date'),
        (r'(?i)(?:date of birth|dob)[:\s]*([0-9]{2}[/-][0-9]{2}[/-][0-9]{4}|[0-9]{4}[/-][0-9]{2}[/-][0-9]{2})', 'dob'),
    ]
    for pattern, key in date_patterns:
        match = re.search(pattern, raw_text)
        if match:
            metadata[key] = match.group(1)
            
    # 2. Document Identifiers
    # Passport Number
    passport_match = re.search(r'\b[A-Z][0-9]{7}\b', raw_text)
    if passport_match:
        metadata['passport_number'] = passport_match.group(0)
        
    # PAN Number
    pan_match = re.search(r'\b[A-Z]{5}[0-9]{4}[A-Z]\b', raw_text)
    if pan_match:
        metadata['pan_number'] = pan_match.group(0)
        
    # Aadhaar Number
    aadhaar_match = re.search(r'\b[0-9]{4}\s[0-9]{4}\s[0-9]{4}\b', raw_text)
    if aadhaar_match:
        metadata['aadhaar_number'] = aadhaar_match.group(0)
        
    # Vehicle Registration Number
    vehicle_match = re.search(r'\b[A-Z]{2}[-\s]?[0-9]{2}[-\s]?[A-Z]{1,2}[-\s]?[0-9]{4}\b', raw_text)
    if vehicle_match:
        metadata['vehicle_number'] = vehicle_match.group(0)

    # Policy / Insurance Number
    policy_match = re.search(r'(?i)(?:policy|insurance)\s*(?:no|number)?[:\s]*([A-Z0-9/-]{6,20})', raw_text)
    if policy_match:
        metadata['policy_number'] = policy_match.group(1)

    return metadata

def classify_folder_for_doc(doc_name: str, raw_text: str, metadata: Dict[str, Any], available_folders: Optional[List[str]] = None) -> str:
    """
    Classify a document into the most suitable Life Folder using multi-tier AI & scoring.
    """
    from app.services.ocr_service import classify_document_folder
    return classify_document_folder(doc_name, raw_text, metadata, available_folders)

