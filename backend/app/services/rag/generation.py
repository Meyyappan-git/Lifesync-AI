import os
import logging
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from app.schemas.rag import RAGResponse

load_dotenv()

logger = logging.getLogger(__name__)

# Resolve prompt path relative to this file, not cwd
_PROMPT_PATH = Path(__file__).parent.parent.parent / "prompts" / "rag_system.md"

def _get_llm():
    groq_key = os.getenv("GROQ_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    if groq_key and groq_key.strip():
        from langchain_groq import ChatGroq
        model = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
        try:
            return ChatGroq(
                model=model,
                temperature=0.1,
                api_key=groq_key,
                max_tokens=500,
                max_retries=1,
            )
        except Exception as e:
            logger.warning(f"ChatGroq init failed in generation: {e}")


    if openai_key and openai_key.strip():
        from langchain_openai import ChatOpenAI
        try:
            return ChatOpenAI(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                temperature=0.1,
                api_key=openai_key,
                max_tokens=500,
                max_retries=1,
            )
        except Exception as e:
            logger.warning(f"ChatOpenAI init failed in generation: {e}")

    return None

def generate_answer(
    context: str, 
    last_3_turns: str, 
    question: str, 
    user_name: str
) -> RAGResponse | None:
    
    llm = _get_llm()
    if not llm:
        logger.info("No valid LLM client available for generation.")
        return None

    try:
        with open(_PROMPT_PATH, "r") as f:
            system_prompt = f.read()
    except Exception as e:
        logger.error(f"Failed to read system prompt file: {e}")
        system_prompt = f"You are LifeSync Assistant answering for {user_name}. Account holder: {user_name}. Today: {datetime.now().strftime('%Y-%m-%d')}."

    system_prompt = system_prompt.replace("{account_holder}", user_name)
    system_prompt = system_prompt.replace("{today}", datetime.now().strftime("%Y-%m-%d"))
    
    from langchain_core.prompts import ChatPromptTemplate
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "CONTEXT:\n{context}\n\nHISTORY:\n{last_3_turns}\n\nQUESTION: {question}")
    ])
    
    start_time = datetime.now()
    try:
        chain = prompt | llm.with_structured_output(RAGResponse)
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
        logger.warning(f"Structured generation failed after {latency}s ({e}), falling back to direct prompt generation")
        try:
            raw_chain = prompt | llm
            raw_res = raw_chain.invoke({
                "context": context,
                "last_3_turns": last_3_turns,
                "question": question
            })
            text = raw_res.content if hasattr(raw_res, 'content') else str(raw_res)
            text = text.strip()
            
            import json
            if text.startswith("{") and "answer" in text:
                try:
                    data = json.loads(text)
                    if isinstance(data, dict) and "answer" in data:
                        return RAGResponse(
                            answer=data["answer"],
                            used_sources=data.get("used_sources", []),
                            found=data.get("found", True),
                            confidence=data.get("confidence", "medium")
                        )
                except Exception:
                    pass

            return RAGResponse(
                answer=text,
                used_sources=[],
                found=True if text and "not found" not in text.lower() and "don't have" not in text.lower() else False,
                confidence="medium"
            )

        except Exception as raw_e:
            logger.error(f"Raw generation failed: {raw_e}")
            return None

