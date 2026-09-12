import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path

from app.database import get_db
from app.models.models import User, Document, DocumentStatus, DocumentChunk
from app.schemas.schemas import DocumentResponse, DocumentListResponse, DocumentUpdate
from app.dependencies import get_current_user
from app.config import settings, DOCUMENTS_STORAGE_DIR, STORAGE_PATH, BASE_DIR
from app.storage.provider import storage_provider, doc_storage_service, resolve_document_file
from app.document_processing.processor import process_document_background

router = APIRouter(prefix="/api/documents", tags=["Documents"])

def get_user_doc_dir(user_id: str) -> Path:
    d = DOCUMENTS_STORAGE_DIR / user_id
    d.mkdir(parents=True, exist_ok=True)
    return d

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate extension
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported."
        )

    # Read content length / validate size
    contents = await file.read()
    file_size = len(contents)
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    # Generate document ID first to build clean storage key
    doc_id = str(uuid.uuid4())
    safe_filename = f"{doc_id}_{Path(file.filename).name}"
    
    try:
        saved_key = doc_storage_service.upload(
            file_bytes=contents,
            user_id=current_user.id,
            document_id=doc_id,
            filename=file.filename
        )
    except Exception as e:
        print(f"[UploadDocument][ERROR] Storage upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store uploaded document file in production storage."
        )

    doc = Document(
        id=doc_id,
        user_id=current_user.id,
        filename=safe_filename,
        original_filename=Path(file.filename).name,
        file_size=file_size,
        page_count=0,
        storage_path=saved_key,
        status=DocumentStatus.UPLOADING.value
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Schedule background processing
    background_tasks.add_task(process_document_background, doc.id)

    return DocumentResponse.model_validate(doc)

@router.get("", response_model=DocumentListResponse)
def list_documents(
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Document).filter(Document.user_id == current_user.id)
    if search:
        query = query.filter(Document.original_filename.ilike(f"%{search}%"))

    docs = query.order_by(Document.created_at.desc()).all()
    return DocumentListResponse(
        documents=[DocumentResponse.model_validate(d) for d in docs],
        total=len(docs)
    )

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    if doc.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this document.")
    return DocumentResponse.model_validate(doc)

@router.get("/{document_id}/view")
@router.get("/{document_id}/file")
def view_document_pdf(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print(f"[PDF_VIEW] Request received for document_id={document_id}, user_id={current_user.id}")

    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        print(f"[PDF_VIEW][ERROR] Document {document_id} not found in DB")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )

    if doc.user_id != current_user.id:
        print(f"[PDF_VIEW][ERROR] User {current_user.id} unauthorized to access document {document_id} owned by {doc.user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this document."
        )

    file_path = resolve_document_file(doc)
    print(f"[PDF_VIEW] Resolved storage path: {file_path}")

    if not file_path or not file_path.exists():
        print(f"[PDF_VIEW][ERROR] Physical file missing for document {document_id} on disk")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file is missing from server storage."
        )

    safe_filename = Path(doc.original_filename).name or "document.pdf"
    print(f"[PDF_VIEW] Returning PDF inline for viewing: {safe_filename}")

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{safe_filename}"'
        }
    )

@router.get("/{document_id}/download")
def download_document_pdf(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print(f"[PDF_DOWNLOAD] Request received for document_id={document_id}, user_id={current_user.id}")

    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        print(f"[PDF_DOWNLOAD][ERROR] Document {document_id} not found in DB")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found."
        )

    if doc.user_id != current_user.id:
        print(f"[PDF_DOWNLOAD][ERROR] User {current_user.id} unauthorized to access document {document_id} owned by {doc.user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this document."
        )

    file_path = resolve_document_file(doc)
    print(f"[PDF_DOWNLOAD] Resolved storage path: {file_path}")

    if not file_path or not file_path.exists():
        print(f"[PDF_DOWNLOAD][ERROR] Physical file missing for document {document_id} on disk")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file is missing from server storage."
        )

    safe_filename = Path(doc.original_filename).name or "document.pdf"
    print(f"[PDF_DOWNLOAD] Download started for: {safe_filename}")

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=safe_filename,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"'
        }
    )


@router.patch("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: str,
    update_data: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    if update_data.filename:
        doc.original_filename = update_data.filename.strip()

    db.commit()
    db.refresh(doc)
    return DocumentResponse.model_validate(doc)

@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    # 1. Delete physical storage file
    try:
        if doc.storage_path:
            storage_provider.delete_file(doc.storage_path)
    except Exception as e:
        print(f"[DeleteDocument] Warning removing file: {e}")

    # 2. Delete FAISS vector indices
    try:
        vector_store.delete_document(user_id=current_user.id, document_id=doc.id)
    except Exception as e:
        print(f"[DeleteDocument] Warning deleting vector indices: {e}")

    # 3. Delete database record & cascade chunks/associations
    db.delete(doc)
    db.commit()

    return {"message": "Document deleted successfully."}

@router.post("/{document_id}/retry", response_model=DocumentResponse)
def retry_document_processing(
    document_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id, Document.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    doc.status = DocumentStatus.PROCESSING.value
    doc.processing_error = None
    db.commit()
    db.refresh(doc)

    background_tasks.add_task(process_document_background, doc.id)

    return DocumentResponse.model_validate(doc)
