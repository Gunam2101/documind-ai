import os
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db, Base, engine
from app.models.models import User, Document
from app.auth.security import hash_password, create_access_token

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_pdf_test_data(tmp_path_factory):
    Base.metadata.create_all(bind=engine)
    db = Session(bind=engine)

    # Clean previous test users
    db.query(Document).filter(Document.original_filename.in_(["UserA_Doc.pdf", "UserB_Doc.pdf"])).delete()
    db.query(User).filter(User.email.in_(["usera@documind.ai", "userb@documind.ai"])).delete()
    db.commit()

    # Create User A
    user_a = User(name="User A", email="usera@documind.ai", password_hash=hash_password("PassA123!"), is_verified=True)
    user_b = User(name="User B", email="userb@documind.ai", password_hash=hash_password("PassB123!"), is_verified=True)
    db.add_all([user_a, user_b])
    db.commit()
    db.refresh(user_a)
    db.refresh(user_b)

    token_a = create_access_token({"sub": user_a.id})
    token_b = create_access_token({"sub": user_b.id})

    # Create dummy PDF files on disk
    tmp_dir = tmp_path_factory.mktemp("pdf_files")
    pdf_a_path = tmp_dir / "user_a_file.pdf"
    pdf_a_path.write_bytes(b"%PDF-1.4 Fake PDF Content for User A")

    doc_a = Document(
        user_id=user_a.id,
        filename="user_a_file.pdf",
        original_filename="UserA_Doc.pdf",
        file_size=35,
        page_count=1,
        storage_path=str(pdf_a_path),
        status="READY"
    )
    db.add(doc_a)
    db.commit()
    db.refresh(doc_a)

    yield {
        "user_a": user_a,
        "user_b": user_b,
        "token_a": token_a,
        "token_b": token_b,
        "doc_a": doc_a,
        "headers_a": {"Authorization": f"Bearer {token_a}"},
        "headers_b": {"Authorization": f"Bearer {token_b}"}
    }

    db.close()

def test_1_view_pdf_owner_success(setup_pdf_test_data):
    headers = setup_pdf_test_data["headers_a"]
    doc_a = setup_pdf_test_data["doc_a"]

    res = client.get(f"/api/documents/{doc_a.id}/view", headers=headers)
    assert res.status_code == 200, res.text
    assert res.headers["content-type"] == "application/pdf"
    assert "inline" in res.headers["content-disposition"]
    assert "UserA_Doc.pdf" in res.headers["content-disposition"]
    assert b"%PDF-1.4" in res.content

def test_2_download_pdf_owner_success(setup_pdf_test_data):
    headers = setup_pdf_test_data["headers_a"]
    doc_a = setup_pdf_test_data["doc_a"]

    res = client.get(f"/api/documents/{doc_a.id}/download", headers=headers)
    assert res.status_code == 200, res.text
    assert res.headers["content-type"] == "application/pdf"
    assert "attachment" in res.headers["content-disposition"]
    assert "UserA_Doc.pdf" in res.headers["content-disposition"]
    assert b"%PDF-1.4" in res.content

def test_3_view_pdf_unauthorized_user_forbidden(setup_pdf_test_data):
    headers_b = setup_pdf_test_data["headers_b"]
    doc_a = setup_pdf_test_data["doc_a"]

    # User B trying to view User A's document must fail with 403 Forbidden
    res = client.get(f"/api/documents/{doc_a.id}/view", headers=headers_b)
    assert res.status_code == 403, res.text
    assert "permission" in res.json()["detail"].lower()

def test_4_download_pdf_unauthorized_user_forbidden(setup_pdf_test_data):
    headers_b = setup_pdf_test_data["headers_b"]
    doc_a = setup_pdf_test_data["doc_a"]

    # User B trying to download User A's document must fail with 403 Forbidden
    res = client.get(f"/api/documents/{doc_a.id}/download", headers=headers_b)
    assert res.status_code == 403, res.text
    assert "permission" in res.json()["detail"].lower()

def test_5_missing_file_on_disk_returns_404(setup_pdf_test_data):
    headers_a = setup_pdf_test_data["headers_a"]
    doc_a = setup_pdf_test_data["doc_a"]

    db = Session(bind=engine)
    real_doc = db.query(Document).filter(Document.id == doc_a.id).first()
    real_path = real_doc.storage_path
    real_filename = real_doc.filename

    real_doc.storage_path = "C:/non_existent_path_xyz_123.pdf"
    real_doc.filename = "non_existent_file_xyz_123.pdf"
    db.commit()

    try:
        res = client.get(f"/api/documents/{doc_a.id}/view", headers=headers_a)
        assert res.status_code == 404
        assert "missing" in res.json()["detail"].lower()
    finally:
        real_doc.storage_path = real_path
        real_doc.filename = real_filename
        db.commit()
        db.close()

def test_6_msme_document_resolution(setup_pdf_test_data):
    db = Session(bind=engine)
    doc = db.query(Document).filter(Document.original_filename.ilike('%MSME%')).first()
    if doc:
        token = create_access_token({"sub": doc.user_id})
        res = client.get(f"/api/documents/{doc.id}/view", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200, res.text
        assert res.headers["content-type"] == "application/pdf"
    db.close()

