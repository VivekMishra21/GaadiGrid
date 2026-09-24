import os

os.environ["DATABASE_URL"] = "postgresql+psycopg://gaadigrid:gaadigrid_dev@localhost:5433/gaadigrid_test"
os.environ["REDIS_URL"] = "redis://localhost:6380/1"
os.environ["ENVIRONMENT"] = "test"

import psycopg
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.redis_client import get_redis
from app.database.base import Base
from app.database.session import get_db
from app.main import app


def _ensure_test_database():
    admin_conn = psycopg.connect("host=localhost port=5433 user=gaadigrid password=gaadigrid_dev dbname=gaadigrid", autocommit=True)
    try:
        exists = admin_conn.execute("SELECT 1 FROM pg_database WHERE datname = 'gaadigrid_test'").fetchone()
        if not exists:
            admin_conn.execute("CREATE DATABASE gaadigrid_test")
    finally:
        admin_conn.close()


_ensure_test_database()

engine = create_engine(settings.database_url)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

with engine.connect() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    conn.commit()

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def clean_state():
    r = get_redis()
    r.flushdb()

    yield

    db = TestSessionLocal()
    try:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
    finally:
        db.close()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db_session():
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def fuel_types(db_session):
    """Seeds the fixed fuel-type catalog (PETROL/DIESEL/CNG/EV) needed by any
    station/price/queue-report test — mirrors what `ensure_fuel_types` does on
    real app startup, without depending on TestClient triggering the lifespan."""
    from app.workers.reference_data import ensure_fuel_types

    ensure_fuel_types(db_session)
