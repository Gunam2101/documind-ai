import pytest
import io

def test_reject_non_pdf_upload(client, auth_headers):
    file_data = io.BytesIO(b"Hello world text content")
    response = client.post(
        "/api/documents/upload",
        headers=auth_headers,
        files={"file": ("sample.txt", file_data, "text/plain")}
    )
    assert response.status_code == 400
    assert "Only PDF" in response.json()["detail"]

def test_upload_valid_pdf(client, auth_headers):
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "Sample research paper text content for valid test upload.")
    pdf_bytes = doc.tobytes()
    doc.close()
    file_data = io.BytesIO(pdf_bytes)
    response = client.post(
        "/api/documents/upload",
        headers=auth_headers,
        files={"file": ("sample_research.pdf", file_data, "application/pdf")}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["original_filename"] == "sample_research.pdf"
    assert data["status"] in ["UPLOADING", "PROCESSING", "READY"]

def test_list_documents(client, auth_headers):
    response = client.get("/api/documents", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "documents" in data
    assert "total" in data
