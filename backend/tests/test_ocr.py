import os
import pytest
import pymupdf
from PIL import Image, ImageDraw, ImageFont
import io

from app.rag.loader import extract_pdf_pages, check_tesseract_available, PDFPageContent
from app.config import settings

def test_ocr_health_endpoint(client):
    response = client.get("/api/health/ocr")
    assert response.status_code == 200
    data = response.json()
    assert "ocr" in data
    assert "tesseract_available" in data

def test_normal_text_pdf_does_not_trigger_ocr(tmp_path):
    # Create normal text PDF
    pdf_path = str(tmp_path / "normal_text.pdf")
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 50), "This is a normal text PDF with plenty of text characters that exceed the OCR threshold.")
    doc.save(pdf_path)
    doc.close()

    pages = extract_pdf_pages(pdf_path)
    assert len(pages) == 1
    assert "normal text PDF" in pages[0].text
    assert pages[0].page_number == 1

def test_scanned_image_pdf_triggers_ocr_or_fails_gracefully(tmp_path):
    # Create a scanned PDF containing ONLY an image of text (no selectable vector text)
    pdf_path = str(tmp_path / "scanned_image.pdf")
    img = Image.new("RGB", (600, 200), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((20, 50), "SCANNED PDF TEST CONTENT FOR OCR", fill=(0, 0, 0))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="PNG")

    doc = pymupdf.open()
    page = doc.new_page(width=600, height=200)
    page.insert_image(page.rect, stream=img_byte_arr.getvalue())
    doc.save(pdf_path)
    doc.close()

    tesseract_available, _ = check_tesseract_available()
    if tesseract_available:
        pages = extract_pdf_pages(pdf_path)
        assert len(pages) == 1
        assert pages[0].page_number == 1
    else:
        # If Tesseract binary is not installed on system, should raise graceful RuntimeError
        with pytest.raises(RuntimeError) as exc_info:
            extract_pdf_pages(pdf_path)
        assert "OCR is required for this scanned PDF" in str(exc_info.value)
