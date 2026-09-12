from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.models import User, Document, Collection
from app.schemas.schemas import SearchRequest, SearchResponse, SearchItem
from app.dependencies import get_current_user
from app.rag.retriever import retrieve_relevant_chunks
from app.config import settings

router = APIRouter(prefix="/api/search", tags=["Search"])

@router.post("", response_model=SearchResponse)
def search_documents(
    req: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_doc_ids: List[str] = req.document_ids or []
    if req.collection_id:
        coll = db.query(Collection).filter(
            Collection.id == req.collection_id,
            Collection.user_id == current_user.id
        ).first()
        if coll:
            target_doc_ids = [d.id for d in coll.documents]

    # Execute vector similarity search
    results = retrieve_relevant_chunks(
        user_id=current_user.id,
        query=req.query,
        document_ids=target_doc_ids or None,
        top_k=req.top_k or settings.RAG_TOP_K
    )

    items = [
        SearchItem(
            document_id=res.document_id,
            filename=res.filename,
            page=res.page,
            content=res.content,
            score=max(0.0, min(1.0, float(res.score)))
        )
        for res in results
    ]

    return SearchResponse(
        query=req.query,
        results=items
    )
