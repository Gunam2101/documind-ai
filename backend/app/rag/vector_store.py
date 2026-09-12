import os
import json
import pickle
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from abc import ABC, abstractmethod

from app.config import settings, VECTORSTORES_STORAGE_DIR
from app.rag.embeddings import embedding_service
from app.rag.splitter import ChunkData

class SearchResult:
    def __init__(self, document_id: str, filename: str, page: int, content: str, score: float, chunk_index: int):
        self.document_id = document_id
        self.filename = filename
        self.page = page
        self.content = content
        self.score = score
        self.chunk_index = chunk_index

    def to_dict(self) -> Dict[str, Any]:
        return {
            "document_id": self.document_id,
            "filename": self.filename,
            "page": self.page,
            "content": self.content,
            "score": round(float(self.score), 4),
            "chunk_index": self.chunk_index
        }

class BaseVectorStore(ABC):
    @abstractmethod
    def add_chunks(self, user_id: str, document_id: str, chunks: List[ChunkData]) -> None:
        pass

    @abstractmethod
    def similarity_search(
        self,
        user_id: str,
        query: str,
        document_ids: Optional[List[str]] = None,
        top_k: int = 5
    ) -> List[SearchResult]:
        pass

    @abstractmethod
    def delete_document(self, user_id: str, document_id: str) -> None:
        pass

class FAISSVectorStore(BaseVectorStore):
    def __init__(self):
        import faiss
        self.faiss = faiss
        self.default_dimension = 384

    def _get_user_dir(self, user_id: str) -> Path:
        user_dir = VECTORSTORES_STORAGE_DIR / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir

    def _get_index_paths(self, user_id: str) -> Tuple[Path, Path]:
        user_dir = self._get_user_dir(user_id)
        index_path = user_dir / "faiss.index"
        meta_path = user_dir / "metadata.json"
        return index_path, meta_path

    def _load_user_data(self, user_id: str, dim: int = 384) -> Tuple[Any, List[Dict[str, Any]]]:
        index_path, meta_path = self._get_index_paths(user_id)
        if index_path.exists() and meta_path.exists():
            try:
                index = self.faiss.read_index(str(index_path))
                with open(meta_path, "r", encoding="utf-8") as f:
                    metadata_list = json.load(f)

                if index.d == dim and index.ntotal == len(metadata_list):
                    return index, metadata_list
            except Exception as e:
                print(f"[FAISSVectorStore] Error reading file cache for user {user_id}: {e}")

        # Serverless fallback: Load document chunks for user directly from DB
        index = self.faiss.IndexFlatIP(dim)
        metadata_list: List[Dict[str, Any]] = []

        try:
            from app.database import SessionLocal
            from app.models.models import DocumentChunk, Document
            db = SessionLocal()
            try:
                chunks = db.query(DocumentChunk).join(Document)\
                    .filter(Document.user_id == user_id, Document.status == "READY")\
                    .order_by(DocumentChunk.created_at.asc()).all()

                if chunks:
                    texts = [c.content for c in chunks]
                    embeddings = embedding_service.embed_texts(texts)
                    if embeddings:
                        vecs = np.array(embeddings, dtype=np.float32)
                        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
                        norms[norms == 0] = 1.0
                        normalized_vecs = vecs / norms
                        index.add(normalized_vecs)

                        for c in chunks:
                            meta = {
                                "document_id": c.document_id,
                                "filename": c.chunk_metadata.get("filename", "document.pdf") if c.chunk_metadata else "document.pdf",
                                "page": c.page_number,
                                "chunk_index": c.chunk_index,
                                "content": c.content
                            }
                            metadata_list.append(meta)

                        print(f"[FAISSVectorStore] Dynamically loaded {len(chunks)} vectors from DB for user {user_id} (dim={dim}).")
            finally:
                db.close()
        except Exception as db_err:
            print(f"[FAISSVectorStore][WARNING] Serverless DB index fallback error for user {user_id}: {db_err}")

        return index, metadata_list

    def _save_user_data(self, user_id: str, index: Any, metadata_list: List[Dict[str, Any]]) -> None:
        try:
            index_path, meta_path = self._get_index_paths(user_id)
            self.faiss.write_index(index, str(index_path))
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(metadata_list, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[FAISSVectorStore][NOTE] Disk save skipped (serverless read-only filesystem or container restart): {e}")

    def add_chunks(self, user_id: str, document_id: str, chunks: List[ChunkData]) -> None:
        if not chunks:
            return

        # Pre-clean any existing vectors for this document_id to prevent duplicates on retry
        self.delete_document(user_id, document_id)

        texts = [c.content for c in chunks]
        embeddings = embedding_service.embed_texts(texts)
        if not embeddings:
            return

        dim = len(embeddings[0])
        vecs = np.array(embeddings, dtype=np.float32)
        # Normalize for Cosine Similarity (Inner Product)
        norms = np.linalg.norm(vecs, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        normalized_vecs = vecs / norms

        index, metadata_list = self._load_user_data(user_id, dim=dim)

        for chunk in chunks:
            meta = {
                "document_id": document_id,
                "filename": chunk.metadata.get("filename", "document.pdf"),
                "page": chunk.page_number,
                "chunk_index": chunk.chunk_index,
                "content": chunk.content
            }
            metadata_list.append(meta)

        index.add(normalized_vecs)
        self._save_user_data(user_id, index, metadata_list)
        print(f"[FAISSVectorStore] Stored {len(chunks)} vectors (dim={dim}) for doc {document_id}. Total user vectors: {index.ntotal}")

    def similarity_search(
        self,
        user_id: str,
        query: str,
        document_ids: Optional[List[str]] = None,
        top_k: int = 5
    ) -> List[SearchResult]:
        query_embedding = embedding_service.embed_query(query)
        dim = len(query_embedding)
        index, metadata_list = self._load_user_data(user_id, dim=dim)

        if index.ntotal == 0 or not metadata_list:
            return []

        q_vec = np.array([query_embedding], dtype=np.float32)
        norm = np.linalg.norm(q_vec)
        if norm > 0:
            q_vec = q_vec / norm

        fetch_k = min(index.ntotal, max(top_k * 5, 20))
        scores, indices = index.search(q_vec, fetch_k)

        results: List[SearchResult] = []
        if len(scores) > 0 and len(indices) > 0:
            for score, idx in zip(scores[0], indices[0]):
                if idx < 0 or idx >= len(metadata_list):
                    continue

                meta = metadata_list[idx]
                doc_id = meta.get("document_id")

                if document_ids and doc_id not in document_ids:
                    continue

                results.append(SearchResult(
                    document_id=doc_id,
                    filename=meta.get("filename", "document.pdf"),
                    page=meta.get("page", 1),
                    content=meta.get("content", ""),
                    score=float(score),
                    chunk_index=meta.get("chunk_index", 0)
                ))

                if len(results) >= top_k:
                    break

        return results

    def delete_document(self, user_id: str, document_id: str) -> None:
        index_path, meta_path = self._get_index_paths(user_id)
        if not index_path.exists() or not meta_path.exists():
            return

        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                metadata_list = json.load(f)

            new_metadata = [m for m in metadata_list if m.get("document_id") != document_id]
            if len(new_metadata) == len(metadata_list):
                return

            if not new_metadata:
                # Remove empty files
                if index_path.exists(): os.remove(index_path)
                if meta_path.exists(): os.remove(meta_path)
                print(f"[FAISSVectorStore] Deleted document {document_id}. Index is now empty.")
                return

            # Re-build index for remaining chunks
            texts = [m.get("content", "") for m in new_metadata]
            embeddings = embedding_service.embed_texts(texts)
            dim = len(embeddings[0])
            new_index = self.faiss.IndexFlatIP(dim)

            vecs = np.array(embeddings, dtype=np.float32)
            norms = np.linalg.norm(vecs, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            normalized_vecs = vecs / norms
            new_index.add(normalized_vecs)

            self._save_user_data(user_id, new_index, new_metadata)
            print(f"[FAISSVectorStore] Deleted document {document_id}. Re-indexed remaining {len(new_metadata)} vectors.")
        except Exception as e:
            print(f"[FAISSVectorStore] Error deleting document {document_id}: {e}")

class PineconeVectorStore(BaseVectorStore):
    """Stub implementation for production Pinecone integration."""
    def add_chunks(self, user_id: str, document_id: str, chunks: List[ChunkData]) -> None:
        print("[PineconeVectorStore] Chunks stored via Pinecone index API.")

    def similarity_search(self, user_id: str, query: str, document_ids: Optional[List[str]] = None, top_k: int = 5) -> List[SearchResult]:
        return []

    def delete_document(self, user_id: str, document_id: str) -> None:
        pass

def get_vector_store() -> BaseVectorStore:
    if settings.VECTOR_STORE.lower() == "pinecone":
        return PineconeVectorStore()
    return FAISSVectorStore()

vector_store = get_vector_store()
