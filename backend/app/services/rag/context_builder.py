from typing import List
import tiktoken
from app.services.rag_retriever import TextChunk

def build_context(chunks: List[TextChunk], max_tokens: int = 2500) -> str:
    """
    Assemble the labelled sections DOCUMENT EXCERPTS, STRUCTURED FACTS, RISK ALERTS, VAULT
    under a token budget of about 2500 tokens.
    """
    enc = tiktoken.get_encoding("cl100k_base")
    
    sections = {
        "DOCUMENT EXCERPTS": [],
        "STRUCTURED FACTS": [],
        "RISK ALERTS": [],
        "VAULT": []
    }
    
    for i, chunk in enumerate(chunks, start=1):
        if chunk.chunk_id == "emergency_vault":
            sections["VAULT"].append(chunk.text)
        elif chunk.chunk_id == "active_risks":
            sections["RISK ALERTS"].append(chunk.text)
        elif chunk.chunk_id.endswith("_meta"):
            sections["STRUCTURED FACTS"].append(f"[{chunk.doc_id}] {chunk.text}")
        else:
            sections["DOCUMENT EXCERPTS"].append(f"[{chunk.doc_id}] {chunk.text}")
            
    context_parts = []
    total_tokens = 0
    
    for title, content_list in sections.items():
        if not content_list:
            continue
            
        part_str = f"--- {title} ---\n" + "\n\n".join(content_list) + "\n\n"
        tokens = len(enc.encode(part_str))
        
        if total_tokens + tokens > max_tokens:
            # We must truncate
            allowed_tokens = max_tokens - total_tokens
            if allowed_tokens <= 0:
                break
            
            # Simple truncation by character ratio (approx 4 chars per token)
            allowed_chars = allowed_tokens * 4
            part_str = part_str[:allowed_chars] + "...(truncated)\n"
            total_tokens = max_tokens
            context_parts.append(part_str)
            break
        else:
            context_parts.append(part_str)
            total_tokens += tokens
            
    return "".join(context_parts)
