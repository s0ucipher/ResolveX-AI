import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_DIR = os.path.dirname(os.path.abspath(__file__))
raw_database_url = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(DATABASE_DIR, 'resolvex.db')}")

# Fix Render/Heroku postgres:// scheme for SQLAlchemy 1.4+ and 2.0+
if raw_database_url.startswith("postgres://"):
    DATABASE_URL = raw_database_url.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = raw_database_url

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
