import os
import tempfile
import pytest
from fastapi.testclient import TestClient

# Point backend.database to an isolated temporary SQLite file before importing app
_TMP_DIR = tempfile.mkdtemp(prefix="complainai_test_")
_TEST_DB_PATH = os.path.join(_TMP_DIR, "test_complainai.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH}"
os.environ.pop("SEED_DEMO_DATA", None)

from backend.main import app  # noqa: E402
from backend.database import SessionLocal  # noqa: E402
from backend.seed import seed_database  # noqa: E402


@pytest.fixture(scope="session")
def test_client():
    """Session-scoped FastAPI TestClient running full lifespan against an isolated temp DB."""
    with TestClient(app) as client:
        yield client


@pytest.fixture(scope="session")
def seeded_client(test_client):
    """Explicitly seeds demo accounts into the isolated test DB for integration tests."""
    seed_database()
    return test_client


@pytest.fixture()
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
