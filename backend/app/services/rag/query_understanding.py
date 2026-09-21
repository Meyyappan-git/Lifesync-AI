import logging
from typing import List, Literal, Optional
import os
from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv()

logger = logging.getLogger(__name__)

class QueryUnderstandingResult(BaseModel):
    intent: Literal["fact_lookup", "list", "summary", "comparison", "deadline", "risk", "vault", "smalltalk", "out_of_scope"] = Field(description="The classified intent of the query.")
    rewritten_query: str = Field(description="The standalone rewritten query that resolves any pronouns or follow-ups based on chat history.")
    target_entity: Optional[str] = Field(description="The main entity or field being asked about, if any.")

def _get_llm():
    groq_key = os.getenv("GROQ_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    
    if groq_key and groq_key.strip():
        from langchain_groq import ChatGroq
        model = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
        try:
            return ChatGroq(
                model=model,
                temperature=0,
                api_key=groq_key,
                max_tokens=150,
                max_retries=1,
            )
        except Exception as e:
            logger.warning(f"ChatGroq init failed: {e}")


    if openai_key and openai_key.strip():
        from langchain_openai import ChatOpenAI
        try:
            return ChatOpenAI(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                temperature=0,
                api_key=openai_key,
                max_tokens=150,
                max_retries=1,
            )
        except Exception as e:
            logger.warning(f"ChatOpenAI init failed: {e}")

    return None

def understand_query(query: str, history: List[dict] = []) -> QueryUnderstandingResult:
    """
    Normalizes the question, uses the last 3 turns to resolve follow-ups,
    classifies intent, and extracts target entity.
    """
    llm = _get_llm()
    if not llm:
        return QueryUnderstandingResult(
            intent="fact_lookup",
            rewritten_query=query,
            target_entity=None
        )
    
    system_prompt = """
    You are a query understanding module for LifeSync AI. 
    Analyze the user's latest query, potentially referring to the provided conversation history to resolve pronouns or follow-ups.
    Return a structured JSON with:
    - intent: fact_lookup | list | summary | comparison | deadline | risk | vault | smalltalk | out_of_scope
    - rewritten_query: a standalone, clear search query that resolves pronouns (e.g. "What is its expiry date?" -> "What is the expiry date of my passport?")
    - target_entity: the core entity or field (e.g. "passport", "vehicle insurance", "blood type")
    """
    
    from langchain_core.prompts import ChatPromptTemplate
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "History: {history}\n\nLatest Query: {query}")
    ])
    
    history_str = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history[-3:]])
    
    try:
        chain = prompt | llm.with_structured_output(QueryUnderstandingResult)
        result = chain.invoke({"query": query, "history": history_str})
    except Exception as e:
        logger.warning(f"Structured output failed in query_understanding ({e}), using default fallback")
        result = QueryUnderstandingResult(
            intent="fact_lookup",
            rewritten_query=query,
            target_entity=None
        )
    
    logger.info(f"Query Understanding - Intent: {result.intent}, Entity: {result.target_entity}, Rewritten: {result.rewritten_query}")
    
    return result

