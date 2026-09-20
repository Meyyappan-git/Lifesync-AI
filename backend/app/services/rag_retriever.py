import re
import math
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.core_models import Document, DocumentMetadata, Folder, RiskAlert, EmergencyProfile
from app.services.cross_domain_risk_engine import evaluate_cross_domain_risks, calculate_life_health_score


class TextChunk:
    def __init__(self, chunk_id: str, text: str, source_doc: str, folder_name: str, doc_id: int | None = None, metadata: Dict[str, str] | None = None):
        self.chunk_id = chunk_id
        self.text = text
        self.source_doc = source_doc
        self.folder_name = folder_name
        self.doc_id = doc_id
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


def build_user_rag_chunks(db: Session, user_id: int) -> List[TextChunk]:
    """
    Extracts and chunks all document content, metadata entries, emergency vault profile,
    and active risk alerts for a user into structured RAG chunks.
    """
    chunks: List[TextChunk] = []

    # 1. Document Chunks & Metadata
    user_docs = db.query(Document).filter(Document.user_id == user_id).all()
    for doc in user_docs:
        folder_name = doc.folder.name if doc.folder else "General"
        meta_dict = {m.meta_key: m.meta_value for m in doc.metadata_entries}

        # Main Document Content Chunk
        doc_text = f"Document Title: {doc.name}. Category: {folder_name} Folder. Format: {doc.file_type or 'pdf'}."
        if doc.raw_content:
            doc_text += f"\nExtracted Content:\n{doc.raw_content}"
        
        if meta_dict:
            meta_str = ", ".join(f"{k}: {v}" for k, v in meta_dict.items())
            doc_text += f"\nExtracted Attributes: {meta_str}"

        chunks.append(TextChunk(
            chunk_id=f"doc_{doc.id}_main",
            text=doc_text,
            source_doc=doc.name,
            folder_name=folder_name,
            doc_id=doc.id,
            metadata=meta_dict
        ))

    # 2. Emergency Vault Profile Chunk
    ep = db.query(EmergencyProfile).filter(EmergencyProfile.user_id == user_id).first()
    if ep:
        ep_text = "Emergency Vault Profile:\n"
        if ep.blood_group:
            ep_text += f"• Blood Group: {ep.blood_group}\n"
        if ep.medical_conditions:
            ep_text += f"• Medical Conditions & Allergies: {ep.medical_conditions}\n"
        if ep.emergency_contact_name:
            ep_text += f"• Emergency Contact: {ep.emergency_contact_name} ({ep.emergency_contact_phone or 'No phone'})\n"

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
    health_data = calculate_life_health_score(db, user_id)
    risks = health_data.get("risks", [])
    if risks:
        risk_lines = []
        for r in risks:
            risk_lines.append(f"• [{r['risk_level']}] {r['title']} - Reason: {r['reason']}. Action: {r['recommended_action']}")
        risk_text = f"Active Cross-Domain Risk Alerts (Health Score: {health_data['life_health_score']}/100):\n" + "\n".join(risk_lines)

        chunks.append(TextChunk(
            chunk_id="active_risks",
            text=risk_text,
            source_doc="Cross-Domain Risk Engine",
            folder_name="Risk Alerts",
            metadata={"health_score": str(health_data['life_health_score'])}
        ))

    return chunks


def retrieve_relevant_chunks(db: Session, user_id: int, query: str, top_k: int = 4) -> List[Tuple[TextChunk, float]]:
    """
    RAG Retriever: Uses hybrid vector similarity + keyword matching to find the top-K
    most relevant text chunks for a given query.
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

        # Keyword boost heuristic for direct hits (e.g. "passport", "visa", "blood", "expiry")
        keyword_boost = 0.0
        for token in query_tokens:
            if len(token) > 3 and token in chunk.text.lower():
                keyword_boost += 0.15

        final_score = min(1.0, sim + keyword_boost)
        if final_score > 0.05:
            scored_chunks.append((chunk, round(final_score * 100, 1)))

    # Sort descending by relevance score
    scored_chunks.sort(key=lambda x: x[1], reverse=True)
    return scored_chunks[:top_k]
