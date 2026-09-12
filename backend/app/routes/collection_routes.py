from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.models import User, Collection, Document
from app.schemas.schemas import (
    CollectionCreate, CollectionUpdate, CollectionResponse, DocumentResponse
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/collections", tags=["Collections"])

@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
def create_collection(
    req: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    coll = Collection(
        user_id=current_user.id,
        name=req.name.strip(),
        description=req.description.strip() if req.description else None
    )
    db.add(coll)
    db.commit()

    if req.document_ids:
        docs = db.query(Document).filter(
            Document.id.in_(req.document_ids),
            Document.user_id == current_user.id
        ).all()
        coll.documents.extend(docs)
        db.commit()

    db.refresh(coll)
    res = CollectionResponse.model_validate(coll)
    res.documents = [DocumentResponse.model_validate(d) for d in coll.documents]
    return res

@router.get("", response_model=List[CollectionResponse])
def list_collections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    colls = db.query(Collection).filter(Collection.user_id == current_user.id)\
        .order_by(Collection.updated_at.desc()).all()

    result = []
    for c in colls:
        c_res = CollectionResponse.model_validate(c)
        c_res.documents = [DocumentResponse.model_validate(d) for d in c.documents]
        result.append(c_res)
    return result

@router.get("/{collection_id}", response_model=CollectionResponse)
def get_collection(
    collection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    coll = db.query(Collection).filter(
        Collection.id == collection_id,
        Collection.user_id == current_user.id
    ).first()
    if not coll:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")

    res = CollectionResponse.model_validate(coll)
    res.documents = [DocumentResponse.model_validate(d) for d in coll.documents]
    return res

@router.patch("/{collection_id}", response_model=CollectionResponse)
def update_collection(
    collection_id: str,
    update_data: CollectionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    coll = db.query(Collection).filter(
        Collection.id == collection_id,
        Collection.user_id == current_user.id
    ).first()
    if not coll:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")

    if update_data.name is not None:
        coll.name = update_data.name.strip()
    if update_data.description is not None:
        coll.description = update_data.description.strip()

    db.commit()
    db.refresh(coll)

    res = CollectionResponse.model_validate(coll)
    res.documents = [DocumentResponse.model_validate(d) for d in coll.documents]
    return res

@router.delete("/{collection_id}")
def delete_collection(
    collection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    coll = db.query(Collection).filter(
        Collection.id == collection_id,
        Collection.user_id == current_user.id
    ).first()
    if not coll:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")

    db.delete(coll)
    db.commit()
    return {"message": "Collection deleted successfully."}

@router.post("/{collection_id}/documents", response_model=CollectionResponse)
def add_document_to_collection(
    collection_id: str,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc_id = payload.get("document_id")
    if not doc_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="document_id is required.")

    coll = db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == current_user.id).first()
    if not coll:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")

    doc = db.query(Document).filter(Document.id == doc_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    if doc not in coll.documents:
        coll.documents.append(doc)
        db.commit()

    res = CollectionResponse.model_validate(coll)
    res.documents = [DocumentResponse.model_validate(d) for d in coll.documents]
    return res

@router.delete("/{collection_id}/documents/{document_id}", response_model=CollectionResponse)
def remove_document_from_collection(
    collection_id: str,
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    coll = db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == current_user.id).first()
    if not coll:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found.")

    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == current_user.id).first()
    if doc and doc in coll.documents:
        coll.documents.remove(doc)
        db.commit()

    res = CollectionResponse.model_validate(coll)
    res.documents = [DocumentResponse.model_validate(d) for d in coll.documents]
    return res
