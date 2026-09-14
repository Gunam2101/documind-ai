from fastapi import FastAPI, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.database import engine, Base, get_db
from app.rag.embeddings import embedding_service
from app.rag.loader import check_tesseract_available
from app.routes import (
    auth_routes,
    document_routes,
    chat_routes,
    search_routes,
    collection_routes,
    user_routes
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically initialize DB schema in development mode only.
    # Production serverless deployments (Vercel + Supabase) rely on database migrations
    # or initial DB setup, avoiding DDL inspection overhead on serverless cold starts.
    if settings.APP_ENV == "development":
        try:
            import app.models  # Register all SQLAlchemy models
            Base.metadata.create_all(bind=engine)
            print("[Database] Development schema initialized successfully.")
        except Exception as e:
            print(f"[Database] Error initializing development schema: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="DocuMind AI - AI Document Search & RAG Chatbot Backend API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Explicit CORS configuration supporting comma-separated URLs in FRONTEND_URL and Vercel domains
raw_origins = [url.strip() for url in settings.FRONTEND_URL.split(",") if url.strip()]
default_dev_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]
origins = list(dict.fromkeys(raw_origins + default_dev_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Global Error Handler for structured JSON responses
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[GlobalError] Unhandled error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred. Please try again."
            }
        }
    )

# Include Routers
app.include_router(auth_routes.router)
app.include_router(document_routes.router)
app.include_router(chat_routes.router)
app.include_router(search_routes.router)
app.include_router(collection_routes.router)
app.include_router(user_routes.router)

@app.get("/")
def root_check():
    return {
        "status": "ok",
        "app": settings.PROJECT_NAME,
        "message": "DocuMind AI Multilingual Teacher API is operational."
    }

@app.get("/health")
@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    embed_info = embedding_service.test_connection()
    embed_status = embed_info.get("status", "ok")

    return {
        "backend": "ok",
        "database": db_status,
        "embeddings": embed_status,
        "vector_store": "ok",
        "llm": "ok"
    }

@app.get("/api/health/rag")
def rag_health_check(db: Session = Depends(get_db)):
    """
    Diagnostic health check endpoint for RAG components.
    """
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    embed_info = embedding_service.test_connection()

    return {
        "backend": "ok",
        "database": db_status,
        "embeddings": embed_info.get("status", "ok"),
        "embedding_mode": embed_info.get("mode", "all-MiniLM-L6-v2"),
        "embedding_model": embed_info.get("model", "all-MiniLM-L6-v2"),
        "vector_store": "ok",
        "llm": "ok"
    }

@app.get("/api/health/ocr")
def ocr_health_check():
    """
    Development diagnostic check for Tesseract OCR availability.
    """
    tesseract_available, tesseract_cmd = check_tesseract_available()
    if tesseract_available:
        return {
            "ocr": "ok",
            "tesseract_available": True,
            "tesseract_cmd": tesseract_cmd,
            "ocr_text_threshold": settings.OCR_TEXT_THRESHOLD
        }
    else:
        return {
            "ocr": "unavailable",
            "tesseract_available": False,
            "message": "OCR is required for scanned PDFs, but Tesseract OCR is not configured. Please install Tesseract OCR or set TESSERACT_CMD in your .env file."
        }
