from typing import List, Dict, Any
import numpy as np
from app.config import settings


class EmbeddingService:
    def __init__(self):
        self.model_name = "sentence-transformers/all-MiniLM-L6-v2"
        self._model = None
        self._init_model()

    def _init_model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name)
                print(f"[EmbeddingService] Local semantic model initialized: {self.model_name}")
            except Exception as e:
                print(f"[EmbeddingService] Failed to initialize semantic model: {e}")
                self._model = None

    def get_model(self):
        if self._model is None:
            self._init_model()
        return self._model

    def embed_texts(
        self,
        texts: List[str],
        batch_size: int = 32
    ) -> List[List[float]]:

        if not texts:
            return []

        clean_texts = [
            t.replace("\x00", "").strip()
            for t in texts
        ]

        model = self.get_model()
        if model is not None:
            try:
                embeddings = model.encode(
                    clean_texts,
                    batch_size=batch_size,
                    normalize_embeddings=True,
                    show_progress_bar=False
                )

                return embeddings.tolist()

            except Exception as e:
                print(
                    f"[EmbeddingService] Semantic embedding failed: {e}"
                )

        # Do NOT use random deterministic embeddings.
        raise RuntimeError(
            "Semantic embedding model is unavailable. "
            "Cannot safely perform semantic retrieval."
        )

    def embed_query(self, query: str) -> List[float]:
        result = self.embed_texts([query])
        return result[0]

    def test_connection(self) -> Dict[str, Any]:

        try:
            test_embedding = self.embed_texts(
                ["DocuMind AI embedding connection test"]
            )

            return {
                "status": "ok",
                "mode": "local",
                "model": self.model_name,
                "vector_dimension": len(test_embedding[0])
            }

        except Exception as e:

            return {
                "status": "error",
                "mode": "unavailable",
                "message": str(e)
            }


embedding_service = EmbeddingService()