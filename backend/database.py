import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables before reading DATABASE_URL
_ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=_ROOT_DIR / ".env")
load_dotenv(dotenv_path=_ROOT_DIR / "backend" / ".env")

DATABASE_DIR = os.path.dirname(os.path.abspath(__file__))


def normalize_database_url(raw_url: str) -> str:
    """
    Normalize PostgreSQL URLs to explicitly use the installed psycopg2 driver
    so SQLAlchemy 2.x does not attempt to import psycopg v3.
    """
    url = (raw_url or "").strip()
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


default_sqlite = "complainai.db" if os.path.exists(os.path.join(DATABASE_DIR, "complainai.db")) else "resolvex.db"
raw_database_url = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(DATABASE_DIR, default_sqlite)}")
DATABASE_URL = normalize_database_url(raw_database_url)

# Configure database engine based on dialect (SQLite for local dev, PostgreSQL for production)
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,      # Tests connection liveness before checkout to prevent stale disconnects
        pool_recycle=300,        # Recycle connections every 5 minutes
        pool_size=10,            # Maintain 10 steady pooled connections
        max_overflow=20          # Allow up to 20 burst connections during high load
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
