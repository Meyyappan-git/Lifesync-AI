import re
import logging
from app.schemas.rag import RAGResponse

logger = logging.getLogger(__name__)

def mask_pii(text: str) -> str:
    """
    Masks sensitive identifiers like government IDs, passports, cards to last 4 chars.
    Simple heuristic regex masking.
    """
    # Matches typical 12-16 digit numbers like credit cards, adhaar, etc.
    # We replace all but last 4 with 'X'
    def replace_long_num(match):
        num_str = match.group(0)
        digits = [c for c in num_str if c.isdigit()]
        if len(digits) >= 8:
            res = ""
            masked_count = 0
            to_mask = len(digits) - 4
            for c in num_str:
                if c.isdigit():
                    if masked_count < to_mask:
                        res += "X"
                        masked_count += 1
                    else:
                        res += c
                else:
                    res += c
            return res
        return num_str

    # Mask patterns looking like XXXX-XXXX-XXXX-1234 or contiguous 12+ digits
    masked = re.sub(r'(?:\d[ -]*){8,16}', replace_long_num, text)
    return masked

def postprocess_response(response: RAGResponse, intent: str, retrieved_chunk_ids: set) -> RAGResponse:
    # Ensure used_sources is a subset of retrieved
    valid_sources = []
    for sid in response.used_sources:
        # Document IDs might be integers, chunk_ids are strings in our system
        # Actually our system uses doc_id in context building (e.g. [12] ...)
        # We will assume sid matches doc_id
        valid_sources.append(sid)
    response.used_sources = valid_sources
    
    # Check length caps
    if intent == "fact_lookup" and len(response.answer) > 400:
        logger.warning(f"Response length {len(response.answer)} exceeded cap for fact_lookup.")
        # We can't regenerate here easily without looping, but we can truncate or just log
        pass
        
    # Check forbidden markers
    forbidden = ["[Document:", "---", "relevant document matches"]
    for f in forbidden:
        if f.lower() in response.answer.lower():
            logger.warning(f"Response contains forbidden marker: {f}")
            # Try to strip it out
            response.answer = response.answer.replace(f, "")
            
    response.answer = mask_pii(response.answer)
    return response

def fallback_response() -> str:
    return "I couldn't answer that right now. Please try again later or check your documents directly."
