import logging
from typing import List, Tuple
from rapidfuzz import process, fuzz
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.services.rag_retriever import build_user_rag_chunks, TextChunk
from app.services.rag.query_understanding import QueryUnderstandingResult

logger = logging.getLogger(__name__)

def keyword_search(db: Session, user_id: int, query: str, chunks: List[TextChunk], top_k: int = 15) -> List[Tuple[TextChunk, float]]:
    # Simple SQLite LIKE + RapidFuzz
    scored = []
    # Rapidfuzz process.extract
    texts = {c.chunk_id: c.text for c in chunks}
    if not texts: return []
    results = process.extract(query, texts, scorer=fuzz.partial_ratio, limit=top_k)
    for res in results:
        match_text, score, chunk_id = res
        chunk = next((c for c in chunks if c.chunk_id == chunk_id), None)
        if chunk:
            scored.append((chunk, score))
    return scored

def vector_search(query: str, chunks: List[TextChunk], top_k: int = 15) -> List[Tuple[TextChunk, float]]:
    # Fallback Python implementation for vector search (using existing compute_tf)
    from app.services.rag_retriever import compute_tf, tokenize, cosine_similarity
    
    query_tf = compute_tf(tokenize(query))
    scored = []
    for chunk in chunks:
        chunk_tf = compute_tf(tokenize(chunk.text))
        sim = cosine_similarity(query_tf, chunk_tf)
        scored.append((chunk, sim * 100))
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:top_k]

def reciprocal_rank_fusion(
    search_results: List[List[Tuple[TextChunk, float]]], k=60
) -> List[Tuple[TextChunk, float]]:
    fused_scores = {}
    chunk_map = {}
    
    for results in search_results:
        for rank, (chunk, score) in enumerate(results):
            if chunk.chunk_id not in chunk_map:
                chunk_map[chunk.chunk_id] = chunk
            if chunk.chunk_id not in fused_scores:
                fused_scores[chunk.chunk_id] = 0.0
            fused_scores[chunk.chunk_id] += 1 / (rank + k)
            
    fused_list = [(chunk_map[cid], score) for cid, score in fused_scores.items()]
    fused_list.sort(key=lambda x: x[1], reverse=True)
    return fused_list

def retrieve(db: Session, user_id: int, query_understanding: QueryUnderstandingResult) -> List[TextChunk]:
    chunks = build_user_rag_chunks(db, user_id)
    query = query_understanding.rewritten_query
    
    if query_understanding.intent == "smalltalk":
        return []
        
    kw_results = keyword_search(db, user_id, query, chunks)
    vec_results = vector_search(query, chunks)
    
    fused = reciprocal_rank_fusion([kw_results, vec_results])
    
    # Filter by threshold and deduplicate
    final_chunks = []
    seen = set()
    
    top_n = 10 if query_understanding.intent in ["list", "summary"] else 5
    
    for chunk, score in fused:
        if chunk.chunk_id not in seen:
            seen.add(chunk.chunk_id)
            final_chunks.append(chunk)
        if len(final_chunks) >= top_n:
            break
            
    logger.info(f"Retrieved {len(final_chunks)} chunks using RRF.")
    return final_chunks
