import os
import traceback
import pymupdf
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.models import Document, DocumentChunk, DocumentStatus
from app.rag.loader import extract_pdf_pages
from app.rag.splitter import split_pdf_pages
from app.rag.vector_store import vector_store

from app.storage.provider import resolve_document_file

def process_document_background(document_id: str, db: Session = None):
    """
    Background worker task function to process PDF document:
    Extract text (Normal or OCR Fallback) -> Chunk -> Embed -> FAISS Indexing -> Update DB Status = READY
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            print(f"[DocumentProcessor][ERROR] Document ID {document_id} not found in database.")
            return

        print(f"[DOC] Upload received & processing started for document ID {document_id} ({doc.original_filename})")
        doc.status = DocumentStatus.PROCESSING.value
        doc.processing_error = None
        db.commit()

        file_path = resolve_document_file(doc)
        if not file_path or not file_path.exists():
            raise FileNotFoundError(f"PDF file missing from server storage for document: {doc.original_filename}")

        str_path = str(file_path)

        # Determine total physical PDF page count using pymupdf
        try:
            pdf_doc = pymupdf.open(str_path)
            total_pdf_pages = len(pdf_doc)
            pdf_doc.close()
            doc.page_count = total_pdf_pages
            db.commit()
            print(f"[DOC] File saved. Physical PDF page count: {total_pdf_pages}")
        except Exception as e:
            print(f"[DOC] Warning getting page count: {e}")

        # 1. Extract PDF pages text (Normal Text or OCR Fallback)
        print(f"[PDF] Opening document and extracting text from {str_path}")
        pages = extract_pdf_pages(str_path)
        print(f"[PDF] Pages extracted with readable text: {len(pages)}")

        if not pages:
            doc.status = DocumentStatus.FAILED.value
            doc.processing_error = "No readable text content found in PDF after normal and OCR extraction."
            db.commit()
            print(f"[ERROR][PDF] {doc.processing_error}")
            return

        # 2. Split pages into chunks
        print(f"[CHUNK] Splitting page text into chunks (chunk_size={1000}, overlap={200})")
        chunks = split_pdf_pages(
            pages=pages,
            document_id=doc.id,
            filename=doc.original_filename
        )

        if not chunks:
            doc.status = DocumentStatus.FAILED.value
            doc.processing_error = "PDF text splitting resulted in 0 valid chunks."
            db.commit()
            print(f"[ERROR][CHUNK] {doc.processing_error}")
            return

        print(f"[CHUNK] Total valid chunks created: {len(chunks)}")

        # Clear any existing chunks in DB for retry clean slate
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
        db.commit()

        # 3. Generate 384-dim Embeddings & Store in DB Chunk Metadata
        print(f"[EMBED] Generating 384-dim vector embeddings for {len(chunks)} chunks...")
        try:
            texts = [c.content for c in chunks]
            embeddings = vector_store.add_chunks(
                user_id=doc.user_id,
                document_id=doc.id,
                chunks=chunks
            )
        except Exception as embed_err:
            print(f"[EMBED][WARNING] Error in FAISS vector store add_chunks: {embed_err}")
            embeddings = None

        # Store chunks in DB with embedded metadata for serverless durability
        for c in chunks:
            chunk_meta = dict(c.metadata) if c.metadata else {}
            chunk_record = DocumentChunk(
                document_id=doc.id,
                chunk_index=c.chunk_index,
                content=c.content,
                page_number=c.page_number,
                chunk_metadata=chunk_meta
            )
            db.add(chunk_record)

        db.commit()
        print(f"[DB] Stored {len(chunks)} chunk records in database.")

        # 4. Mark READY
        doc.status = DocumentStatus.READY.value
        doc.processing_error = None
        db.commit()
        print(f"[DB] Document status updated: READY for document {doc.id} ({doc.original_filename})")

    except Exception as e:
        full_err = f"{str(e)}"
        safe_err = f"{str(e)}"
        print(f"[ERROR][PROCESS] Failed processing document {document_id}: {full_err}\n{traceback.format_exc()}")
        try:
            doc = db.query(Document).filter(Document.id == document_id).first()
            if doc:
                doc.status = DocumentStatus.FAILED.value
                doc.processing_error = safe_err
                db.commit()
        except Exception as db_err:
            print(f"[ERROR][DB] Could not update failed status: {db_err}")
    finally:
        if should_close:
            db.close()
