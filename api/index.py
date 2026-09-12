import os
import sys
from pathlib import Path

# Add backend directory to Python system path for Vercel Serverless Function execution
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Import FastAPI app instance
from app.main import app

# Vercel entrypoint handler
handler = app
