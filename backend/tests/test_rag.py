import pytest
from app.rag.loader import PDFPageContent, clean_text
from app.rag.splitter import split_pdf_pages
from app.rag.embeddings import embedding_service
from app.rag.vector_store import FAISSVectorStore, SearchResult
from app.rag.prompt import format_rag_prompt

def test_clean_text():
    raw = "  Hello   World \n\n  New Paragraph \t "
    cleaned = clean_text(raw)
    assert cleaned == "Hello World New Paragraph"

def test_split_pdf_pages():
    pages = [
        PDFPageContent(page_number=1, text="Page 1 sample content text for chunking test."),
        PDFPageContent(page_number=2, text="Page 2 sample content text for chunking test.")
    ]
    chunks = split_pdf_pages(pages, document_id="doc123", filename="test.pdf", chunk_size=100, chunk_overlap=10)
    assert len(chunks) >= 2
    assert chunks[0].metadata["document_id"] == "doc123"
    assert chunks[0].metadata["page"] == 1

def test_embedding_service():
    texts = ["Transformer models operate on attention mechanisms.", "FAISS vector database."]
    vecs = embedding_service.embed_texts(texts)
    assert len(vecs) == 2
    assert len(vecs[0]) == 384

def test_prompt_formatting():
    results = [
        SearchResult(document_id="doc1", filename="paper.pdf", page=5, content="Model achieves 95% accuracy.", score=0.95, chunk_index=0)
    ]
    prompt = format_rag_prompt("What is the accuracy?", results)
    assert "paper.pdf" in prompt
    assert "PAGE: 5" in prompt
    assert "Model achieves 95% accuracy." in prompt
