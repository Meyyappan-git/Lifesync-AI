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

def classify_folder_for_doc(doc_name: str, raw_text: str, metadata: Dict[str, Any]) -> str:
    """
    Classify a document into one of the 7 Life Folders:
    Vehicle, Travel, Health, Education, Employment, Finance, Property
    """
    text_lower = f"{doc_name} {raw_text}".lower()

    if any(k in text_lower for k in ['driving licence', 'dl', 'rc book', 'vehicle', 'puc', 'road tax', 'service record', 'car', 'bike', 'motor']):
        return "Vehicle"
    if any(k in text_lower for k in ['passport', 'visa', 'flight', 'ticket', 'hotel', 'boarding pass', 'travel insurance']):
        return "Travel"
    if any(k in text_lower for k in ['medical', 'prescription', 'health', 'surgery', 'hospital', 'blood report', 'doctor', 'vaccination']):
        return "Health"
    if any(k in text_lower for k in ['degree', 'mark sheet', 'transcript', 'certificate', 'school', 'university', 'bonafide', 'tuition', 'scholarship']):
        return "Education"
    if any(k in text_lower for k in ['offer letter', 'salary', 'payslip', 'experience', 'employment', 'contract', 'resignation', 'hr']):
        return "Employment"
    if any(k in text_lower for k in ['pan card', 'bank statement', 'tax return', 'itr', 'loan', 'investment', 'demat', 'mutual fund', 'credit card']):
        return "Finance"
    if any(k in text_lower for k in ['sale deed', 'property tax', 'electricity bill', 'water bill', 'land', 'lease', 'rent agreement']):
        return "Property"

    return "Finance"  # Fallback default folder
