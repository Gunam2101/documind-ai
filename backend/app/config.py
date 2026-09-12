from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "development"
    PROJECT_NAME: str = "DocuMind AI"

    # Database
    DATABASE_URL: str = "sqlite:///./documind.db"

    # JWT
    JWT_SECRET: str = "super_secret_jwt_key_documind_change_in_production_32bytes"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI & Embeddings
    OPENAI_API_KEY: str = ""
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Groq Chat
    GROQ_API_KEY: str = ""
    GROQ_CHAT_MODEL: str = "llama-3.3-70b-versatile"

    # Vector Database
    VECTOR_STORE: str = "faiss"
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX_NAME: str = "documind-index"

    # OCR
    TESSERACT_CMD: str = ""  # Empty string defaults to system PATH lookup (e.g. /usr/bin/tesseract or Windows PATH)
    OCR_TEXT_THRESHOLD: int = 50

    # Storage Architecture (local | s3 | vercel_blob)
    STORAGE_BACKEND: str = "local"
    STORAGE_DIR: str = "../storage"
    MAX_UPLOAD_SIZE_MB: int = 25

    # Vercel Blob Token
    BLOB_READ_WRITE_TOKEN: str = ""

    # Cloud Object Storage (S3 / R2 / MinIO) settings
    S3_BUCKET_NAME: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_ENDPOINT_URL: str = ""

    # RAG
    RAG_TOP_K: int = 5
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    # CORS (supports comma-separated URLs for multi-domain deployments)
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

# Validate Production Environment Secrets
if settings.APP_ENV == "production":
    if settings.JWT_SECRET == "super_secret_jwt_key_documind_change_in_production_32bytes":
        raise ValueError("[SECURITY_ERROR] In production mode (APP_ENV=production), JWT_SECRET must be set via environment variables and cannot use default development key.")

# Resolve absolute storage path
BASE_DIR = Path(__file__).resolve().parent.parent

STORAGE_PATH = Path(settings.STORAGE_DIR)

if not STORAGE_PATH.is_absolute():
    STORAGE_PATH = (BASE_DIR / STORAGE_PATH).resolve()

DOCUMENTS_STORAGE_DIR = STORAGE_PATH / "documents"
VECTORSTORES_STORAGE_DIR = STORAGE_PATH / "vectorstores"

DOCUMENTS_STORAGE_DIR.mkdir(
    parents=True,
    exist_ok=True
)

VECTORSTORES_STORAGE_DIR.mkdir(
    parents=True,
    exist_ok=True
)