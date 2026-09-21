import logging
import uuid
import re
from typing import List, Dict, Any
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
    Fallback RAG synthesizer that directly reads retrieved document chunks & metadata
    from local storage to provide an accurate answer without relying on external LLM services.
    """
    if not chunks:
        return RAGResponse(
            answer=f"Hello **{user_name}**, I searched your LifeSync documents and vault, but I couldn't find any documents matching your request.",
            used_sources=[],
            found=False,
            confidence="low"
        )

    used_doc_ids = []
    lines = [f"Here is what I found in your **LifeSync Vault & Documents**:\n"]

    seen_docs = set()
    for c in chunks:
        if c.doc_id is not None and c.doc_id not in used_doc_ids:
            used_doc_ids.append(c.doc_id)

        doc_key = (c.source_doc, c.folder_name)
        if doc_key not in seen_docs:
            seen_docs.add(doc_key)
            lines.append(f"### 📄 {c.source_doc} (`{c.folder_name}` folder)")

            if c.metadata:
                meta_items = [f"**{k.replace('_', ' ').title()}**: `{v}`" for k, v in c.metadata.items() if v and not k.startswith("ocr_")]
                if meta_items:
                    lines.append("  - " + "\n  - ".join(meta_items))

            # Include clean excerpt preview if present
            clean_text = c.text
            clean_text = re.sub(r'📄 \[Document:.*?\]', '', clean_text).strip()
            clean_text = re.sub(r'📄 \[Document Header\].*?\n', '', clean_text).strip()
            if len(clean_text) > 200:
                clean_text = clean_text[:200] + "..."
            if clean_text:
                lines.append(f"  > *\"{clean_text}\"*\n")

    answer_md = "\n".join(lines)
    return RAGResponse(
        answer=answer_md,
        used_sources=used_doc_ids,
        found=True,
        confidence="high"
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
            if (not rag_response.used_sources or c.doc_id in rag_response.used_sources or len(sources) < 3) and (doc_id_val, c.source_doc) not in seen_source_ids:
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

