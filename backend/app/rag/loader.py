import os
import shutil
import io
import pymupdf  # PyMuPDF
from typing import List, Dict, Any, Tuple
from pathlib import Path
import re
from PIL import Image
import pytesseract

from app.config import settings

class PDFPageContent:
    def __init__(self, page_number: int, text: str):
        self.page_number = page_number
        self.text = text

def clean_text(text: str) -> str:
    if not text:
        return ""
    # Strip NUL bytes (0x00) that break database string insertions
    text = text.replace('\x00', '')
    # Replace multiple whitespace characters while keeping structure
    text = re.sub(r'[\r\n\t]+', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def clean_ocr_text(text: str) -> str:
    if not text:
        return ""
    # Strip NUL bytes and clean typical OCR artifacts without losing numbers/punctuation
    text = text.replace('\x00', '')
    text = re.sub(r'[\r\n\t]+', '\n', text)
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    cleaned = ' '.join(lines)
    return clean_text(cleaned)

def check_tesseract_available() -> Tuple[bool, str]:
    """
    Checks if Tesseract OCR executable is available on Windows/Linux system.
    """
    cmd = settings.TESSERACT_CMD
    if cmd and os.path.exists(cmd):
        pytesseract.pytesseract.tesseract_cmd = cmd
        return True, cmd

    system_tesseract = shutil.which("tesseract")
    if system_tesseract:
        pytesseract.pytesseract.tesseract_cmd = system_tesseract
        return True, system_tesseract

    return False, ""

def extract_pdf_pages_ocr(doc: pymupdf.Document, filename: str) -> List[PDFPageContent]:
    """
    Renders PDF pages at 200 DPI into images and performs OCR using pytesseract.
    Preserves page numbers (1-indexed).
    """
    available, tesseract_path = check_tesseract_available()
    if not available:
        raise RuntimeError(
            "OCR is required for this scanned PDF, but Tesseract OCR is not configured. "
            "Please install Tesseract OCR or set TESSERACT_CMD in your .env file."
        )

    print(f"[OCR] Starting Tesseract OCR processing for scanned PDF: {filename} using executable '{tesseract_path}'")
    ocr_pages: List[PDFPageContent] = []
    total_pages = len(doc)

    for page_idx in range(total_pages):
        page_num = page_idx + 1
        try:
            print(f"[OCR] Rendering page {page_num}/{total_pages} at 200 DPI...")
            page = doc[page_idx]
            pix = page.get_pixmap(dpi=200)
            img = Image.open(io.BytesIO(pix.tobytes("png")))

            print(f"[OCR] Running pytesseract.image_to_string on page {page_num}...")
            raw_ocr_text = pytesseract.image_to_string(img)
            cleaned_ocr = clean_ocr_text(raw_ocr_text)

            if cleaned_ocr:
                ocr_pages.append(PDFPageContent(page_number=page_num, text=cleaned_ocr))
                print(f"[OCR] Page {page_num} OCR successful ({len(cleaned_ocr)} chars extracted).")
            else:
                print(f"[OCR] Page {page_num} OCR produced no text.")
        except Exception as page_err:
            print(f"[OCR][ERROR] Failed OCR on page {page_num} of {filename}: {page_err}")
            continue

    print(f"[OCR] Completed OCR for {filename}. Extracted text from {len(ocr_pages)}/{total_pages} pages.")
    return ocr_pages

def extract_pdf_pages(file_path: str) -> List[PDFPageContent]:
    """
    Main PDF extraction function:
    1. Attempts normal PyMuPDF text extraction.
    2. Calculates meaningful text characters.
    3. If total characters >= OCR_TEXT_THRESHOLD, returns normal text pages.
    4. Otherwise, automatically triggers OCR fallback for scanned/image PDFs.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF file not found at: {file_path}")

    doc = pymupdf.open(file_path)
    normal_pages: List[PDFPageContent] = []

    try:
        total_pages = len(doc)
        print(f"[PDFParser] Opening PDF {path.name} with {total_pages} total pages.")

        for page_idx in range(total_pages):
            try:
                page = doc[page_idx]
                raw_text = page.get_text("text") or ""
                cleaned = clean_text(raw_text)
                if cleaned:
                    normal_pages.append(PDFPageContent(page_number=page_idx + 1, text=cleaned))
            except Exception as page_err:
                print(f"[PDFParser] Warning reading text on page {page_idx + 1}: {page_err}")
                continue

        total_meaningful_chars = sum(len(p.text) for p in normal_pages)
        print(f"[PDFParser] Normal text extraction yielded {total_meaningful_chars} total characters.")

        if total_meaningful_chars >= settings.OCR_TEXT_THRESHOLD:
            print(f"[PDFParser] Sufficient text found ({total_meaningful_chars} chars >= threshold {settings.OCR_TEXT_THRESHOLD}). Using normal PDF extraction.")
            return normal_pages

        print(f"[PDFParser] Scanned or image-based PDF detected ({total_meaningful_chars} chars < threshold {settings.OCR_TEXT_THRESHOLD}). Switching to OCR Fallback pipeline...")
        return extract_pdf_pages_ocr(doc, path.name)

    finally:
        doc.close()
