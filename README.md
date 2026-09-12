# DocuMind AI — AI Document Search & RAG Chatbot

> *"Chat with your documents. Get answers instantly."*

**DocuMind AI** is a production-grade full-stack Web Application for uploading PDFs, extracting text, generating vector embeddings, performing semantic search, and conversing with documents using Retrieval-Augmented Generation (RAG) with page-level source citations.

---

## 🌟 Key Features

* **Dual Text & OCR PDF Ingestion**: Automatic detection of text-based vs scanned/image-based PDFs. Uses PyMuPDF for fast vector text extraction and falls back to **Tesseract OCR** (rendering pages at 200 DPI via Pillow + pytesseract) when scanned documents are detected.
* **Semantic Chunking & Embedding Pipeline**: Recursive character text splitting (`chunk_size=1000`, `chunk_overlap=200`) and 1536-dimensional vector embedding generation (`text-embedding-3-small`).
* **Vector Store Abstraction**: Local persistent **FAISS** vector store per user/document with index reloading, plus Pinecone adapter structure for multi-tenant production scaling.
* **Grounded RAG Pipeline**: Strict system prompt enforcing facts retrieved from uploaded context, preventing hallucinations (*"I couldn't find this information in your documents."*), and guarding against prompt injection.
* **Page-Level Source Citations**: Interactive inline source badges (`[Page 12]`) and collapsible right-hand side **Sources** drawer with excerpt snippets and page jump triggers.
* **Executive Dashboard & Document Management**: Metric stat cards (Total Documents, Total Pages, Questions Asked, Storage Used), drag-and-drop file uploader with stage-based progress indicators, and collection grouping.
* **Semantic Search**: Fast vector similarity search returning relevance percentages (e.g. 98%) and direct chat triggers.
* **Full Authentication & Multi-User Isolation**: JWT access/refresh tokens, bcrypt password hashing, password reset tokens, email verification flow, and server-side data ownership verification.
* **Modern Executive UI**: Vite + React + TypeScript + Tailwind CSS matching premium SaaS design standards with Light, Dark, and System theme support.

---

## 📐 Architecture & Dual OCR Processing Pipeline Flow

```text
                                +-------------------+
                                |   Uploaded PDF    |
                                +---------+---------+
                                          |
                                          v
                                +-------------------+
                                | PyMuPDF Text Check|
                                +---------+---------+
                                          |
                        +-----------------+-----------------+
                        | (Meaningful Chars >= Threshold)   | (Scanned PDF < Threshold)
                        v                                   v
             +--------------------+               +--------------------+
             | Normal Extraction  |               | OCR Fallback       |
             +---------+----------+               | (PyMuPDF 200 DPI   |
                       |                          |  Pixmap + Tesseract|
                       |                          |  pytesseract)      |
                       |                          +---------+----------+
                       +-----------------+------------------+
                                         |
                                         v
                               +-------------------+
                               | Clean & Split     | (Page metadata preserved)
                               +---------+---------+
                                         |
                                         v
                               +-------------------+
                               | OpenAI Embeddings | (1536-dim vectors)
                               +---------+---------+
                                         |
                                         v
                               +-------------------+
                               | FAISS Vector Store| (Saved under storage/vectorstores/)
                               +---------+---------+

[ User Question ] ---> Query Embedding ---> Vector Similarity Search ---> Top K Chunks
                                                                               |
                                                                               v
[ User ] <--- Answer + Source Citations <--- LLM Generator <--- Grounded System Prompt
```

---

## 🛠️ Technology Stack

### Frontend
* **Framework**: React 18 + TypeScript + Vite
* **Styling**: Tailwind CSS (Dark Mode enabled, Inter font, custom design system)
* **Icons**: Lucide React
* **State & Data Fetching**: TanStack Query (React Query v5) + Custom Context Stores
* **HTTP Client**: Axios with automatic JWT interceptors & token refresh

### Backend
* **API Framework**: FastAPI (Python 3.11+)
* **Database & ORM**: PostgreSQL / SQLite with SQLAlchemy 2.0 & Pydantic v2
* **Authentication**: PyJWT + Passlib (bcrypt password hashing)
* **PDF & OCR Engine**: PyMuPDF (`pymupdf`), `pytesseract`, Pillow (`PIL`)
* **Vector Index**: FAISS (`faiss-cpu`) + Pinecone adapter pattern
* **AI & Embeddings**: OpenAI API (`gpt-4o-mini`, `text-embedding-3-small`) + LangChain text splitters

---

## 🔍 Windows Tesseract OCR Setup

Scanned or image-based PDFs require **Tesseract OCR** installed on the host system:

1. **Download Tesseract OCR Installer for Windows**:
   - Download the official installer (e.g. `tesseract-ocr-w64-setup-v5.x.exe`) from [UB-Mannheim Tesseract Releases](https://github.com/UB-Mannheim/tesseract/wiki).
2. **Install Tesseract OCR**:
   - Standard installation path is: `C:\Program Files\Tesseract-OCR\tesseract.exe`
3. **Configure `TESSERACT_CMD` in `backend/.env`**:
   ```env
   TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
   OCR_TEXT_THRESHOLD=50
   ```
4. **Verify OCR Status**:
   - Query `GET /api/health/ocr` to check if Tesseract is detected.

---

## 📁 Project Structure

```text
documind-ai/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # Button, Input, Card, Modal, Badge, Skeleton, ProgressBar
│   │   │   ├── layout/      # Sidebar, Header, BottomNav, AuthLayout, DashboardLayout
│   │   │   ├── auth/        # LoginForm, RegisterForm, ForgotPasswordForm, VerifyEmailForm
│   │   │   ├── documents/   # DocumentCard, DocumentTable, FileUploader
│   │   │   ├── chat/        # ChatSidebar, MessageItem, SourcePanel, PDFViewerModal
│   │   │   ├── search/      # SearchResults
│   │   │   └── settings/    # Profile, Appearance, AI Settings
│   │   ├── pages/           # 16+ pages (Landing, Dashboard, Docs, Chat, Search, Collections, Settings)
│   │   ├── services/        # API service layer (authApi, documentApi, chatApi, searchApi)
│   │   ├── context/         # AuthContext, ThemeContext
│   │   ├── types/           # Shared TypeScript models
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entry point & CORS
│   │   ├── config.py        # Pydantic settings & OCR configuration
│   │   ├── database.py      # SQLAlchemy engine & session factory
│   │   ├── dependencies.py  # JWT authentication dependency
│   │   ├── models/          # SQLAlchemy models (User, Document, Chunk, Conversation, Message, Collection)
│   │   ├── schemas/         # Pydantic validation schemas
│   │   ├── routes/          # REST routes (auth, documents, chat, search, collections, user)
│   │   ├── rag/             # Loader (Normal + OCR), Splitter, Embeddings, FAISS VectorStore, Retriever, Prompt, Chain
│   │   └── document_processing/ # Background PDF processor
│   ├── tests/               # Pytest suite (test_auth, test_documents, test_rag, test_collections, test_ocr)
│   ├── requirements.txt
│   └── Dockerfile
│
├── storage/                 # Uploaded PDF files & persisted FAISS vector indices
├── docker-compose.yml       # Production containerization (frontend, backend, postgres)
├── README.md
└── LICENSE
```

---

## ⚡ Quick Start & Local Development Setup

### 1. Clone & Configure Environment Variables
```bash
git clone https://github.com/documind-ai/documind-ai.git
cd documind-ai
cp .env.example backend/.env
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
```

Run FastAPI Backend server:
```bash
uvicorn app.main:app --reload --port 8000
```
API Documentation available at: `http://localhost:8000/api/docs`

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🐳 Docker Setup

Run the entire monorepo stack with Docker Compose:

```bash
docker-compose up --build
```

Access services:
* **Frontend**: `http://localhost:5173`
* **Backend API**: `http://localhost:8000/api`
* **OpenAPI Specs**: `http://localhost:8000/api/docs`

---

## 🧪 Testing

Run backend unit and integration tests (including OCR fallback tests):

```bash
cd backend
pytest tests/ -v
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
