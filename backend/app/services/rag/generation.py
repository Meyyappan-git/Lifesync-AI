import os
import logging
from typing import List, Dict, Any
from datetime import datetime
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from app.schemas.rag import RAGResponse
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=10))
def generate_answer(
    context: str, 
    last_3_turns: str, 
    question: str, 
    user_name: str
) -> RAGResponse:
    
    llm = ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        temperature=0.1,
        request_timeout=30,
        max_retries=1
    )
    
    with open("app/prompts/rag_system.md", "r") as f:
        system_prompt = f.read()
        
    system_prompt = system_prompt.replace("{account_holder}", user_name)
    system_prompt = system_prompt.replace("{today}", datetime.now().strftime("%Y-%m-%d"))
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "CONTEXT:\n{context}\n\nHISTORY:\n{last_3_turns}\n\nQUESTION: {question}")
    ])
    
    chain = prompt | llm.with_structured_output(RAGResponse)
    
    # Track latency
    start_time = datetime.now()
    try:
        result = chain.invoke({
            "context": context,
            "last_3_turns": last_3_turns,
            "question": question
        })
        latency = (datetime.now() - start_time).total_seconds()
        logger.info(f"Generation successful. Latency: {latency}s, Found: {result.found}")
        return result
    except Exception as e:
        latency = (datetime.now() - start_time).total_seconds()
        logger.error(f"Generation failed after {latency}s: {str(e)}")
        raise
