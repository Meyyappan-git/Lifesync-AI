import logging
import uuid
import re
from typing import Any, Dict, List, Set
from sqlalchemy.orm import Session
from app.models.core_models import ChatMessage
from app.models.user import User
from app.schemas.rag import RAGAPIResponse, SourceChunk, RAGResponse
from app.services.rag_retriever import TextChunk, build_user_rag_chunks

from app.services.rag.query_understanding import understand_query
from app.services.rag.retrieval import retrieve
from app.services.rag.context_builder import build_context
from app.services.rag.generation import generate_answer
from app.services.rag.postprocess import postprocess_response, fallback_response

logger = logging.getLogger(__name__)

def _smart_local_synthesis(query: str, chunks: List[TextChunk], user_name: str) -> RAGResponse:
    """
    Question-aware extractive fallback for deployments without an LLM provider.
    Return only relevant fields or passages; never substitute a document dump for an answer.
    """
    if re.search(r"\b(hi|hello|hey|thanks|thank you)\b", query, re.IGNORECASE):
        return RAGResponse(
            answer=f"Hello {user_name}! What would you like to know about your LifeSync documents?",
            used_sources=[],
            found=True,
            confidence="high",
        )

    if not chunks:
        return RAGResponse(
            answer="I couldn't find information that answers that in your LifeSync records. Add the relevant document or vault detail and try again.",
            used_sources=[],
            found=False,
            confidence="low"
        )

    stopwords = {
        "a", "an", "and", "are", "be", "can", "could", "do", "does", "for", "from",
        "how", "i", "in", "is", "it", "me", "my", "of", "on", "or", "please", "show",
        "tell", "the", "their", "this", "to", "what", "when", "where", "which", "who",
        "why", "with", "would", "you", "your", "about", "find", "give", "much", "many",
    }

    def terms(text: str) -> Set[str]:
        return {
            token for token in re.findall(r"[a-z0-9]+", text.lower())
            if len(token) > 1 and token not in stopwords
        }

    query_terms = terms(query)
    field_synonyms = {
        "expiry": {"expiry", "expires", "expire", "expiration", "valid", "validity", "deadline", "renewal", "renew"},
        "academic_score": {"cgpa", "gpa", "grade", "grades", "marks", "score", "percentage", "percent"},
        "identifier": {"number", "id", "identifier", "policy"},
        "blood_group": {"blood", "group", "type"},
        "contact": {"contact", "phone", "telephone", "emergency"},
    }
    expanded_terms = set(query_terms)
    for synonyms in field_synonyms.values():
        if query_terms.intersection(synonyms):
            expanded_terms.update(synonyms)
    requested_field_terms = set().union(*field_synonyms.values()) | {
        "date", "name", "amount", "address", "status", "value", "issued", "issue",
        "start", "end", "year", "email", "institution", "provider",
    }

    # Structured OCR fields are the most reliable source for direct fact questions.
    metadata_candidates = []
    for chunk in chunks:
        for key, value in (chunk.metadata or {}).items():
            if not value or key.startswith("ocr_"):
                continue
            key_terms = terms(key.replace("_", " "))
            direct_overlap = key_terms.intersection(query_terms)
            overlap = key_terms.intersection(expanded_terms)
            requested_field_match = bool(key_terms.intersection(query_terms & requested_field_terms))
            synonym_field_match = any(
                query_terms.intersection(synonyms) and key_terms.intersection(synonyms)
                for synonyms in field_synonyms.values()
            )
            if overlap and (requested_field_match or synonym_field_match):
                # Prefer the requested field (for example, expiry) over a different
                # field from the same document (for example, passport number).
                field_bonus = sum(
                    3 for group, synonyms in field_synonyms.items()
                    if query_terms.intersection(synonyms) and key_terms.intersection(synonyms)
                )
                score = field_bonus + len(direct_overlap) * 2 + len(overlap)
                metadata_candidates.append((score, chunk, key, str(value)))

    if metadata_candidates:
        _, chunk, key, value = max(metadata_candidates, key=lambda item: item[0])
        field_name = key.replace("_", " ")
        answer = f"Your {field_name} is {value} (from {chunk.source_doc})."
        return RAGResponse(
            answer=answer,
            used_sources=[chunk.doc_id] if chunk.doc_id is not None else [],
            found=True,
            confidence="medium",
        )

    # Otherwise select the most relevant OCR sentence instead of returning the whole file.
    passages = []
    for chunk in chunks:
        clean_text = re.sub(r"📄 \[Document:.*?\]\s*", "", chunk.text)
        clean_text = re.sub(r"📄 \[Document Header\].*?(?:\n|$)", "", clean_text)
        for sentence in re.split(r"(?<=[.!?])\s+|\n+", clean_text):
            sentence = sentence.strip(" \t-*•")
            sentence_terms = terms(sentence)
            overlap = sentence_terms.intersection(expanded_terms)
            if sentence and overlap:
                passages.append((len(overlap) / max(len(query_terms), 1), len(overlap), chunk, sentence))

    if passages:
        _, _, chunk, passage = max(passages, key=lambda item: (item[0], item[1]))
        if len(passage) > 500:
            passage = passage[:497].rsplit(" ", 1)[0] + "..."
        answer = f"{passage} (from {chunk.source_doc})."
        return RAGResponse(
            answer=answer,
            used_sources=[chunk.doc_id] if chunk.doc_id is not None else [],
            found=True,
            confidence="low" if len(terms(passage).intersection(query_terms)) < 2 else "medium",
        )

    closest_doc = chunks[0].source_doc
    answer = (
        f"I couldn't find a detail in {closest_doc} that answers that question. "
        "Try asking about a specific value in the document, or upload a copy that includes it."
    )
    return RAGResponse(
        answer=answer,
        used_sources=[],
        found=False,
        confidence="low",
    )

def answer_ai_assistant_query(db: Session, user: User, query: str) -> Dict[str, Any]:
    request_id = str(uuid.uuid4())
    logger.info(f"[{request_id}] Processing AI Assistant Query for user {user.id}")
    
    # Get history
    history_records = db.query(ChatMessage).filter(ChatMessage.user_id == user.id).order_by(ChatMessage.created_at.desc()).limit(6).all()
    history_records.reverse()
    history = [{"role": m.role, "content": m.content} for m in history_records]
    
    # Save user query
    user_msg = ChatMessage(user_id=user.id, role="user", content=query)
    db.add(user_msg)
    db.commit()

    chunks: List[TextChunk] = []
    
    try:
        # 1. Query Understanding
        understanding = understand_query(query, history)
        
        # 2. Retrieval
        chunks = retrieve(db, user.id, understanding)
        if not chunks:
            # Fallback to general user chunk retrieval if understanding yielded no chunks
            chunks = [c for c in build_user_rag_chunks(db, user.id) if any(term in c.text.lower() for term in query.lower().split() if len(term) > 2)]
        
        # 3. Context Builder
        context = build_context(chunks)
        history_str = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history[-3:]])
        
        # 4. Generation via LLM (Groq / OpenAI)
        rag_response = generate_answer(context, history_str, query, user.full_name)
        
        # If LLM generation failed or returned empty result, perform smart local synthesis
        if not rag_response or not rag_response.answer:
            logger.info(f"[{request_id}] LLM generation empty/failed; using smart local synthesis fallback.")
            rag_response = _smart_local_synthesis(query, chunks, user.full_name)

        # 5. Postprocess
        rag_response = postprocess_response(rag_response, understanding.intent, {c.chunk_id for c in chunks})
        
        # Build API Response Sources
        sources = []
        seen_source_ids = set()
        for c in chunks:
            doc_id_val = c.doc_id if c.doc_id is not None else 0
            source_is_relevant = (
                c.doc_id in rag_response.used_sources
                if rag_response.used_sources
                else len(sources) < 3
            )
            if source_is_relevant and (doc_id_val, c.source_doc) not in seen_source_ids:
                seen_source_ids.add((doc_id_val, c.source_doc))
                sources.append(SourceChunk(
                    id=doc_id_val,
                    document_id=doc_id_val,
                    name=c.source_doc,
                    folder=c.folder_name,
                    page=str(c.chunk_index) if c.chunk_index else "1"
                ))
                
        # Save assistant msg
        assistant_msg = ChatMessage(user_id=user.id, role="assistant", content=rag_response.answer)
        db.add(assistant_msg)
        db.commit()
        
        return RAGAPIResponse(
            answer=rag_response.answer,
            sources=sources,
            found=rag_response.found,
            confidence=rag_response.confidence,
            request_id=request_id
        ).model_dump()
        
    except Exception as e:
        import traceback
        logger.error(f"[{request_id}] Pipeline exception: {str(e)}\n{traceback.format_exc()}")
        
        # High quality local fallback when an unexpected exception occurs
        fallback_rag = _smart_local_synthesis(query, chunks, user.full_name)
        
        sources = []
        seen_source_ids = set()
        for c in chunks:
            doc_id_val = c.doc_id if c.doc_id is not None else 0
            if (doc_id_val, c.source_doc) not in seen_source_ids:
                seen_source_ids.add((doc_id_val, c.source_doc))
                sources.append(SourceChunk(
                    id=doc_id_val,
                    document_id=doc_id_val,
                    name=c.source_doc,
                    folder=c.folder_name,
                    page="1"
                ))

        try:
            fallback_msg = ChatMessage(user_id=user.id, role="assistant", content=fallback_rag.answer)
            db.add(fallback_msg)
            db.commit()
        except Exception as db_err:
            logger.error(f"[{request_id}] Failed to save fallback message to DB: {db_err}")

        return RAGAPIResponse(
            answer=fallback_rag.answer,
            sources=sources,
            found=fallback_rag.found,
            confidence=fallback_rag.confidence,
            request_id=request_id
        ).model_dump()

