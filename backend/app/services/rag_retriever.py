import re
import math
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.core_models import Document, DocumentMetadata, Folder, RiskAlert, EmergencyProfile
from app.services.cross_domain_risk_engine import calculate_life_health_score


class TextChunk:
    def __init__(
        self,
        chunk_id: str,
        text: str,
        source_doc: str,
        folder_name: str,
        doc_id: int | None = None,
        chunk_index: int = 0,
        metadata: Dict[str, str] | None = None,
    ):
        self.chunk_id = chunk_id
        self.text = text
        self.source_doc = source_doc
        self.folder_name = folder_name
        self.doc_id = doc_id
        self.chunk_index = chunk_index
        self.metadata = metadata or {}


def tokenize(text: str) -> List[str]:
    """Tokenize and normalize text into lowercase terms."""
    return re.findall(r"\w+", text.lower())


def compute_tf(tokens: List[str]) -> Dict[str, float]:
    """Compute term frequency vector for tokens."""
    tf = {}
    total = len(tokens)
    if total == 0:
        return tf
    for token in tokens:
        tf[token] = tf.get(token, 0) + 1.0
    for token in tf:
        tf[token] /= total
    return tf


def cosine_similarity(vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
    """Compute cosine similarity between two term-frequency dict vectors."""
    intersection = set(vec1.keys()) & set(vec2.keys())
    if not intersection:
        return 0.0

    dot_product = sum(vec1[token] * vec2[token] for token in intersection)
    mag1 = math.sqrt(sum(val ** 2 for val in vec1.values()))
    mag2 = math.sqrt(sum(val ** 2 for val in vec2.values()))

    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot_product / (mag1 * mag2)


def chunk_text(text: str, chunk_size_words: int = 250, overlap_words: int = 50) -> List[str]:
    """
    Sliding window text chunker with token/word overlap.
    Ensures long documents are split into readable semantic chunks.
    """
    words = text.split()
    if not words:
        return []
    if len(words) <= chunk_size_words:
        return [" ".join(words)]

    chunks = []
    step = chunk_size_words - overlap_words
    if step <= 0:
        step = chunk_size_words

    for i in range(0, len(words), step):
        chunk = words[i: i + chunk_size_words]
        chunks.append(" ".join(chunk))
        if i + chunk_size_words >= len(words):
            break
    return chunks


def build_user_rag_chunks(db: Session, user_id: int) -> List[TextChunk]:
    """
    Extracts and chunks all document content, metadata entries, emergency vault profile,
    and active risk alerts for a user into structured RAG chunks.
    """
    chunks: List[TextChunk] = []

    # 1. Document Content & Metadata Chunks
    user_docs = db.query(Document).filter(Document.user_id == user_id).all()
    for doc in user_docs:
        folder_name = doc.folder.name if doc.folder else "General"
        meta_dict = {m.meta_key: m.meta_value for m in doc.metadata_entries}

        full_raw = doc.raw_content or ""
        meta_str = ", ".join(f"{k}: {v}" for k, v in meta_dict.items()) if meta_dict else "None"
        
        # Add a high-level summary chunk first for fast metadata retrieval
        summary_text = (
            f"📄 [Document Header] Title: {doc.name}\n"
            f"Folder: {folder_name} | File Format: {doc.file_type or 'pdf'}\n"
            f"Extracted Attributes: {meta_str}"
        )
        chunks.append(TextChunk(
            chunk_id=f"doc_{doc.id}_meta",
            text=summary_text,
            source_doc=doc.name,
            folder_name=folder_name,
            doc_id=doc.id,
            chunk_index=0,
            metadata=meta_dict
        ))

        # Sliding window semantic chunking for raw OCR content
        if full_raw.strip():
            raw_subchunks = chunk_text(full_raw, chunk_size_words=250, overlap_words=40)
            for idx, sub_text in enumerate(raw_subchunks, start=1):
                chunk_header = f"📄 [Document: {doc.name} | Section {idx}/{len(raw_subchunks)}]\n{sub_text}"
                chunks.append(TextChunk(
                    chunk_id=f"doc_{doc.id}_chunk_{idx}",
                    text=chunk_header,
                    source_doc=doc.name,
                    folder_name=folder_name,
                    doc_id=doc.id,
                    chunk_index=idx,
                    metadata=meta_dict
                ))

    # 2. Emergency Vault Profile Chunk
    ep = db.query(EmergencyProfile).filter(EmergencyProfile.user_id == user_id).first()
    if ep:
        ep_text = "🚨 Emergency Vault Profile:\n"
        if ep.blood_group:
            ep_text += f"• Blood Group: {ep.blood_group}\n"
        if ep.medical_conditions:
            ep_text += f"• Medical Conditions & Allergies: {ep.medical_conditions}\n"
        if ep.emergency_contact_name:
            ep_text += f"• Primary Emergency Contact: {ep.emergency_contact_name} (Phone: {ep.emergency_contact_phone or 'N/A'})\n"

        chunks.append(TextChunk(
            chunk_id="emergency_vault",
            text=ep_text,
            source_doc="Emergency Vault",
            folder_name="Emergency",
            metadata={
                "blood_group": ep.blood_group or "",
                "contact": ep.emergency_contact_name or ""
            }
        ))

    # 3. Active Cross-Domain Risks Chunk
    try:
        health_data = calculate_life_health_score(db, user_id)
        risks = health_data.get("risks", [])
        if risks:
            risk_lines = []
            for r in risks:
                risk_lines.append(f"• [{r['risk_level']} Risk] {r['title']} - Reason: {r['reason']}. Action: {r['recommended_action']}")
            risk_text = f"⚠️ Active Cross-Domain Risk Alerts (Life Health Score: {health_data['life_health_score']}/100):\n" + "\n".join(risk_lines)

            chunks.append(TextChunk(
                chunk_id="active_risks",
                text=risk_text,
                source_doc="Cross-Domain Risk Engine",
                folder_name="Risk Alerts",
                metadata={"health_score": str(health_data['life_health_score'])}
            ))
    except Exception:
        pass

    return chunks


def retrieve_relevant_chunks(db: Session, user_id: int, query: str, top_k: int = 5) -> List[Tuple[TextChunk, float]]:
    """
    Hybrid RAG Retriever: Combines TF-IDF term similarity with exact phrase matching,
    keyword metadata boosting, and multi-chunk re-ranking.
    Returns list of (TextChunk, relevance_score_percentage).
    """
    chunks = build_user_rag_chunks(db, user_id)
    if not chunks:
        return []

    query_tokens = tokenize(query)
    if not query_tokens:
        return []

    query_tf = compute_tf(query_tokens)
    scored_chunks: List[Tuple[TextChunk, float]] = []

    for chunk in chunks:
        chunk_tokens = tokenize(chunk.text)
        chunk_tf = compute_tf(chunk_tokens)
        sim = cosine_similarity(query_tf, chunk_tf)

        # Keyword boost heuristic for direct hits (e.g. "passport", "visa", "blood", "expiry", "puc", "insurance")
        keyword_boost = 0.0
        chunk_text_lower = chunk.text.lower()
        for token in query_tokens:
            if len(token) > 3 and token in chunk_text_lower:
                keyword_boost += 0.15
            # Metadata key/value direct match boost
            for meta_k, meta_v in chunk.metadata.items():
                if token in meta_k.lower() or token in str(meta_v).lower():
                    keyword_boost += 0.20

        final_score = min(1.0, sim + keyword_boost)
        if final_score > 0.05:
            scored_chunks.append((chunk, round(final_score * 100, 1)))

    # Sort descending by relevance score
    scored_chunks.sort(key=lambda x: x[1], reverse=True)
    
    # Deduplicate consecutive chunks from the same doc if top_k is reached
    seen_ids = set()
    filtered_chunks = []
    for chunk, score in scored_chunks:
        if chunk.chunk_id not in seen_ids:
            seen_ids.add(chunk.chunk_id)
            filtered_chunks.append((chunk, score))
            if len(filtered_chunks) >= top_k:
                break

    return filtered_chunks
