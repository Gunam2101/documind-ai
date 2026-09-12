from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.rag.loader import PDFPageContent
from app.config import settings

class ChunkData:
    def __init__(self, content: str, page_number: int, chunk_index: int, metadata: Dict[str, Any]):
        self.content = content
        self.page_number = page_number
        self.chunk_index = chunk_index
        self.metadata = metadata

def split_pdf_pages(
    pages: List[PDFPageContent],
    document_id: str,
    filename: str,
    chunk_size: int = settings.CHUNK_SIZE,
    chunk_overlap: int = settings.CHUNK_OVERLAP
) -> List[ChunkData]:
    """
    Splits PDF pages into chunks, maintaining document_id, page_number, filename, and chunk_index.
    Filters out empty or whitespace-only chunks.
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""]
    )

    chunks: List[ChunkData] = []
    global_chunk_idx = 0

    for page in pages:
        if not page.text or not page.text.strip():
            continue

        page_chunks = text_splitter.split_text(page.text)
        for sub_idx, chunk_text in enumerate(page_chunks):
            cleaned_chunk = chunk_text.strip().replace('\x00', '')
            if not cleaned_chunk:
                continue

            metadata = {
                "document_id": document_id,
                "filename": filename,
                "page": page.page_number,
                "chunk_index": global_chunk_idx,
                "sub_index": sub_idx
            }
            chunks.append(ChunkData(
                content=cleaned_chunk,
                page_number=page.page_number,
                chunk_index=global_chunk_idx,
                metadata=metadata
            ))
            global_chunk_idx += 1

    print(f"[Chunker] Created {len(chunks)} non-empty text chunks for document {filename}.")
    return chunks
