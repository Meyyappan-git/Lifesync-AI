from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.core_models import Document
from app.services.cross_domain_risk_engine import calculate_life_health_score
from app.services.rag_retriever import retrieve_relevant_chunks, build_user_rag_chunks


def answer_ai_assistant_query(db: Session, user_id: int, query: str) -> Dict[str, Any]:
    """
    RAG & Natural Language Life Assistant query engine.
    Retrieves vector-matched context chunks and synthesizes an augmented response with sources.
    """
    q_lower = query.lower()
    health_data = calculate_life_health_score(db, user_id)
    user_docs = db.query(Document).filter(Document.user_id == user_id).all()

    # Perform Hybrid Vector Retrieval over user's indexed chunks
    retrieved_pairs = retrieve_relevant_chunks(db, user_id, query, top_k=4)

    retrieved_chunks = []
    sources = set()

    for chunk, score in retrieved_pairs:
        sources.add(chunk.source_doc)
        retrieved_chunks.append({
            "chunk_id": chunk.chunk_id,
            "source_doc": chunk.source_doc,
            "folder_name": chunk.folder_name,
            "relevance_score": score,
            "snippet": chunk.text[:300] + ("..." if len(chunk.text) > 300 else "")
        })

    # Synthesize Answer based on intent & retrieved RAG context
    if retrieved_pairs:
        top_chunk, top_score = retrieved_pairs[0]
        chunk_snippets = "\n\n".join([f"📄 **{c.source_doc}** ({c.folder_name} Folder):\n{c.text}" for c, _ in retrieved_pairs])

        if "expire" in q_lower or "expiry" in q_lower or "renew" in q_lower:
            answer = f"Based on your indexed documents, here are the relevant expiries & deadlines:\n\n{chunk_snippets}"
        elif "risk" in q_lower or "alert" in q_lower or "critical" in q_lower:
            answer = f"Here is the risk & compliance analysis matching your query:\n\n{chunk_snippets}"
        elif "emergency" in q_lower or "blood" in q_lower or "allergy" in q_lower or "contact" in q_lower:
            answer = f"Retrieved from your Emergency Vault & Document Index:\n\n{chunk_snippets}"
        else:
            answer = f"I found **{len(retrieved_pairs)} relevant document matches** for your query:\n\n{chunk_snippets}"
    else:
        # Fallback if no specific doc match was found in vector search
        if "missing" in q_lower or "incomplete" in q_lower or "folder" in q_lower:
            missing_summary = []
            for f in health_data.get("folder_stats", []):
                if f["missing_docs"]:
                    missing_summary.append(f"📁 **{f['folder_name']} Folder** ({f['completion_pct']}% Complete)\n  Missing: {', '.join(f['missing_docs'])}")
            if missing_summary:
                answer = "Here is your folder completeness report and missing documents:\n\n" + "\n\n".join(missing_summary)
            else:
                answer = "All your life folders are 100% complete! Excellent organization."
        else:
            answer = (
                f"I checked your {len(user_docs)} indexed documents across 7 life folders, but didn't find a direct keyword match for '{query}'.\n\n"
                f"• Current Life Health Score: **{health_data['life_health_score']}/100**\n"
                f"• Active Risk Alerts: **{health_data['active_risks_count']}**\n\n"
                f"Try asking about specific folders (e.g., 'Vehicle', 'Travel', 'Health'), 'What expires next month?', or 'Show active risks'."
            )

    return {
        "query": query,
        "answer": answer,
        "health_score": health_data["life_health_score"],
        "sources": list(sources),
        "retrieved_chunks": retrieved_chunks
    }
