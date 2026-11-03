import pytest
import os
import sys

# Ensure backend root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app, seed_database
from app.database import SessionLocal, Base, engine
from app.auth import create_access_token, hash_password
from app.config import settings
from app.models import Workspace, User

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    seed_database()
    yield

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture(autouse=True)
def reset_db_state(db):
    # Ensure default workspace properties
    ws = db.query(Workspace).filter(Workspace.id == 1).first()
    if ws:
        ws.allow_remote = False
        ws.kiosk_code = "SHARM1"
        ws.red_penalty_egp = 250
        ws.black_penalty_egp = 1000

    # Ensure Rico baseline
    rico = db.query(User).filter(User.username == "rico").first()
    if rico:
        rico.status = "active"
        rico.hashed_password = hash_password("password123")
        rico.green = 12
        rico.red = 1
        rico.black = 0

    # Ensure Layla baseline
    layla = db.query(User).filter(User.username == "layla").first()
    if layla:
        layla.status = "active"
        layla.hashed_password = hash_password("password123")

    db.commit()
    yield

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def superadmin_headers():
    token = create_access_token({"sub": settings.SUPERADMIN_EMAIL, "role": "superadmin"})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def owner_headers():
    token = create_access_token({"sub": "layla", "role": "owner"})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def employee_headers():
    token = create_access_token({"sub": "rico", "role": "employee"})
    return {"Authorization": f"Bearer {token}"}
