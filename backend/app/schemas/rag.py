from pydantic import BaseModel, Field
from typing import List, Optional

class SourceChunk(BaseModel):
    id: int
    document_id: int
    name: str
    folder: Optional[str] = None
    page: Optional[str] = None

class RAGResponse(BaseModel):
    answer: str = Field(description="The final answer written in Markdown format.")
    used_sources: List[int] = Field(description="The IDs of the document excerpts used to answer the question.")
    found: bool = Field(description="True if the answer was found in the sources, False otherwise.")
    confidence: str = Field(description="Confidence level of the answer: 'high', 'medium', or 'low'.")

class AssistantQueryRequest(BaseModel):
    query: str

class RAGAPIResponse(BaseModel):
    answer: str
    sources: List[SourceChunk]
    found: bool
    confidence: str
    request_id: str
