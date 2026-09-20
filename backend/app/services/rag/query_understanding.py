import logging
from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
import os

logger = logging.getLogger(__name__)

class QueryUnderstandingResult(BaseModel):
    intent: Literal["fact_lookup", "list", "summary", "comparison", "deadline", "risk", "vault", "smalltalk", "out_of_scope"] = Field(description="The classified intent of the query.")
    rewritten_query: str = Field(description="The standalone rewritten query that resolves any pronouns or follow-ups based on chat history.")
    target_entity: Optional[str] = Field(description="The main entity or field being asked about, if any.")

def understand_query(query: str, history: List[dict] = []) -> QueryUnderstandingResult:
    """
    Normalizes the question, uses the last 3 turns to resolve follow-ups,
    classifies intent, and extracts target entity.
    """
    llm = ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), 
        temperature=0
    )
    
    system_prompt = """
    You are a query understanding module for LifeSync AI. 
    Analyze the user's latest query, potentially referring to the provided conversation history to resolve pronouns or follow-ups.
    Return a structured JSON with:
    - intent: fact_lookup | list | summary | comparison | deadline | risk | vault | smalltalk | out_of_scope
    - rewritten_query: a standalone, clear search query that resolves pronouns (e.g. "What is its expiry date?" -> "What is the expiry date of my passport?")
    - target_entity: the core entity or field (e.g. "passport", "vehicle insurance", "blood type")
    """
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "History: {history}\n\nLatest Query: {query}")
    ])
    
    history_str = "\\n".join([f"{msg['role']}: {msg['content']}" for msg in history[-3:]])
    
    chain = prompt | llm.with_structured_output(QueryUnderstandingResult)
    result = chain.invoke({"query": query, "history": history_str})
    
    logger.info(f"Query Understanding - Intent: {result.intent}, Entity: {result.target_entity}, Rewritten: {result.rewritten_query}")
    
    return result
