import pytest
import pymupdf

from app.models.models import Document, DocumentStatus
from app.rag.loader import extract_pdf_pages
from app.rag.splitter import split_pdf_pages
from app.rag.vector_store import vector_store

def test_document_intelligence_endpoint(client, auth_headers, test_user, db, tmp_path):
    # 1. Create test PDF document
    pdf_path = str(tmp_path / "test_intelligence.pdf")
    doc_pdf = pymupdf.open()
    p1 = doc_pdf.new_page()
    p1.insert_text((50, 50), "INTELLIGENCE DOCUMENT TITLE\n\nSection 1: Intelligent Agents\nAn intelligent agent is an autonomous entity that perceives its environment through sensors and acts through actuators to maximize its chance of successfully achieving its goals.")
    doc_pdf.save(pdf_path)
    doc_pdf.close()

    # 2. Add document record to DB
    doc_rec = Document(
        user_id=test_user.id,
        filename="test_intelligence.pdf",
        original_filename="test_intelligence.pdf",
        file_size=1024,
        page_count=1,
        storage_path=pdf_path,
        status=DocumentStatus.READY.value
    )
    db.add(doc_rec)
    db.commit()
    db.refresh(doc_rec)

    # 3. Add chunks to vector store
    pages = extract_pdf_pages(pdf_path)
    chunks = split_pdf_pages(pages, doc_rec.id, "test_intelligence.pdf")
    vector_store.add_chunks(test_user.id, doc_rec.id, chunks)

    # 4. Test Intelligence modes via API
    modes = ["summary", "key_points", "important_questions", "exam_questions", "study_notes", "quiz", "insights"]
    for mode in modes:
        response = client.post(
            "/api/chat/intelligence",
            json={
                "document_id": doc_rec.id,
                "mode": mode
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["document_id"] == doc_rec.id
        assert data["mode"] == mode
        assert len(data["title"]) > 0
        assert "content" in data
