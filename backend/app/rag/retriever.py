from typing import List, Optional
from app.rag.vector_store import vector_store, SearchResult
from app.config import settings

def retrieve_relevant_chunks(
    user_id: str,
    query: str,
    document_ids: Optional[List[str]] = None,
    top_k: int = settings.RAG_TOP_K
) -> List[SearchResult]:
    """
    Retrieves the top_k most relevant document chunks for a given query and user.
    """
    if not query or not query.strip():
        return []

    return vector_store.similarity_search(
        user_id=user_id,
        query=query.strip(),
        document_ids=document_ids,
        top_k=top_k
    )
