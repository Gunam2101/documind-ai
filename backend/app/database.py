from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

def normalize_db_url(raw_url: str) -> str:
    """
    Normalizes any PostgreSQL connection URL variant (postgres://, postgresql://,
    postgresql+psycopg2://) to postgresql+psycopg:// so SQLAlchemy uses psycopg v3.
    """
    if not raw_url:
        return raw_url

    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+"):
        return raw_url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif raw_url.startswith("postgresql+psycopg2://"):
        return raw_url.replace("postgresql+psycopg2://", "postgresql+psycopg://", 1)
    elif raw_url.startswith("postgres+psycopg2://"):
        return raw_url.replace("postgres+psycopg2://", "postgresql+psycopg://", 1)
    elif raw_url.startswith("postgres+psycopg://"):
        return raw_url.replace("postgres+psycopg://", "postgresql+psycopg://", 1)

    return raw_url

db_url = normalize_db_url(settings.DATABASE_URL)
is_sqlite = db_url.startswith("sqlite")

engine_kwargs = {
    "pool_pre_ping": True,
}

if not is_sqlite:
    engine_kwargs.update({
        "pool_size": 5,
        "max_overflow": 10,
        "pool_recycle": 300,
        "pool_timeout": 30
    })

engine = create_engine(
    db_url,
    **engine_kwargs
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()