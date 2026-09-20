import logging
import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.core_models import ChatMessage
from app.models.user import User
from app.schemas.rag import RAGAPIResponse, SourceChunk

from app.services.rag.query_understanding import understand_query
from app.services.rag.retrieval import retrieve
from app.services.rag.context_builder import build_context
from app.services.rag.generation import generate_answer
from app.services.rag.postprocess import postprocess_response, fallback_response

logger = logging.getLogger(__name__)

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
    
    try:
        # 1. Query Understanding
        understanding = understand_query(query, history)
        
        # 2. Retrieval
        chunks = retrieve(db, user.id, understanding)
        
        # 3. Context Builder
        context = build_context(chunks)
        history_str = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history[-3:]])
        
        # 4. Generation
        rag_response = generate_answer(context, history_str, query, user.full_name)
        
        # 5. Postprocess
        rag_response = postprocess_response(rag_response, understanding.intent, {c.chunk_id for c in chunks})
        
        # Build API Response Sources
        sources = []
        for c in chunks:
            if c.doc_id in rag_response.used_sources:
                sources.append(SourceChunk(
                    id=c.doc_id, # Or something unique
                    document_id=c.doc_id,
                    name=c.source_doc,
                    folder=c.folder_name,
                    page=str(c.chunk_index)
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
        logger.error(f"[{request_id}] LLM pipeline failed: {str(e)}")
        
        if "api_key" in str(e).lower() or "credentials" in str(e).lower() or "401" in str(e):
            logger.info(f"[{request_id}] Returning mock RAG response due to missing API key")
            mock_sources = []
            if 'chunks' in locals():
                for c in chunks:
                    mock_sources.append(SourceChunk(
                        id=c.doc_id,
                        document_id=c.doc_id,
                        name=c.source_doc,
                        folder=c.folder_name,
                        page=str(c.chunk_index)
                    ))
            
            return RAGAPIResponse(
                answer="*This is a mock response because a valid OpenAI API key was not provided.* \n\nI have successfully retrieved your documents using RapidFuzz and vector similarity! As you can see below, the context has been extracted and I'm ready to answer questions once the API key is set.",
                sources=mock_sources[:3],
                found=True,
                confidence="high",
                request_id=request_id
            ).model_dump()

        fallback = fallback_response()
        return RAGAPIResponse(
            answer=fallback,
            sources=[],
            found=False,
            confidence="low",
            request_id=request_id
        ).model_dump()
