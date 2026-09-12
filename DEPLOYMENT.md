# DocuMind AI — Vercel Production Deployment Guide

This document provides a concise step-by-step guide for deploying **DocuMind AI** to Vercel with PostgreSQL database and Vercel Blob Object Storage.

---

## 1. Required Environment Variables

Configure these environment variables in your **Vercel Project Settings → Environment Variables**:

| Variable Name | Environment | Description / Example |
| :--- | :--- | :--- |
| `APP_ENV` | Production | `production` |
| `DATABASE_URL` | Production | `postgresql://user:password@ep-xyz.postgres.database.azure.com/documind?sslmode=require` *(Use Transaction Pooler port 6543)* |
| `JWT_SECRET` | Production | High-entropy random secret key (Min 32 bytes) |
| `GROQ_API_KEY` | Production | Groq LLM API Key (`gsk_...`) |
| `STORAGE_BACKEND` | Production | `vercel_blob` |
| `BLOB_READ_WRITE_TOKEN` | Production | Vercel Blob store token |
| `FRONTEND_URL` | Production | Production domain URL (e.g. `https://documind-ai.vercel.app`) |
| `VITE_API_BASE_URL` | Production | Set to `/api` (or relative path) |

---

## 2. Storage Setup (Vercel Blob)

1. Open your project in the Vercel Dashboard.
2. Go to **Storage → Create Database → Blob**.
3. Link the Blob Store to your Vercel project.
4. Copy the generated `BLOB_READ_WRITE_TOKEN` into your project environment variables.
5. Set `STORAGE_BACKEND=vercel_blob` in project environment variables.

---

## 3. Production PostgreSQL Setup & Database Migration

1. Provision a PostgreSQL instance (Supabase, Neon, Railway, or Vercel Postgres).
2. Obtain the Connection String (use Transaction Pooler on port 6543 for serverless resilience).
3. Run Alembic database migrations from your local CLI or CI/CD pipeline:
   ```bash
   cd backend
   export DATABASE_URL="postgresql://user:password@ep-xyz.../documind?sslmode=require"
   alembic upgrade head
   ```

---

## 4. Vercel Project Setup & Build Configuration

- **Framework Preset**: Vite / Other
- **Root Directory**: `./` (Project Root)
- **Build Command**: `cd frontend && npm run build`
- **Output Directory**: `frontend/dist`
- **Install Command**: `npm install --prefix frontend`

*Root `vercel.json` maps `/api/(.*)` to `api/index.py` (FastAPI Serverless Function).*

---

## 5. Deployment Steps

Execute from project root directory:

```bash
# 1. Install CLI if needed
npm i -g vercel

# 2. Deploy to Production
vercel --prod
```

---

## 6. Post-Deployment Testing Checklist

1. **Health Check**: Open `https://<your-vercel-domain>/health` (Expected: `{"status": "ok"}`).
2. **User Authentication**: Register a new user, log in, and verify JWT token generation.
3. **PDF Upload & Storage**: Upload a sample PDF document and verify `Document.status` moves to `READY`.
4. **PDF View & Download**: Verify PDF viewer opens inline and download button streams the PDF file.
5. **RAG & Chat Search**: Ask document questions in Ask AI; verify grounded citations and multi-user isolation.
6. **Sentence-Transformers Performance Validation**: Validate cold-start latency and memory usage on Vercel Python Serverless Functions runtime.
