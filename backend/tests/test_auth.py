import pytest
from app.models import User
from app.config import settings

def test_login_employee_success(client):
    response = client.post("/api/auth/login", json={
        "username": "rico",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "employee"
    assert data["username"] == "rico"
    assert data["name"] == "Rico Rodriguez"

def test_login_owner_success(client):
    response = client.post("/api/auth/login", json={
        "username": "layla",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "owner"
    assert data["username"] == "layla"

def test_login_invalid_password(client):
    response = client.post("/api/auth/login", json={
        "username": "rico",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "Invalid username or password" in response.json()["detail"]

def test_login_nonexistent_user(client):
    response = client.post("/api/auth/login", json={
        "username": "nonexistent_user_999",
        "password": "password123"
    })
    assert response.status_code == 401

def test_superadmin_otp_request_authorized(client):
    response = client.post("/api/auth/superadmin/otp/request", json={
        "email": settings.SUPERADMIN_EMAIL
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "sent" in data["message"].lower()

def test_superadmin_otp_request_unauthorized(client):
    response = client.post("/api/auth/superadmin/otp/request", json={
        "email": "hacker@evil.com"
    })
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]

def test_superadmin_otp_verify_success(client):
    response = client.post("/api/auth/superadmin/otp/verify", json={
        "email": settings.SUPERADMIN_EMAIL,
        "otp": settings.SUPERADMIN_DEFAULT_OTP
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "superadmin"
    assert data["username"] == settings.SUPERADMIN_EMAIL

def test_superadmin_otp_verify_invalid(client):
    response = client.post("/api/auth/superadmin/otp/verify", json={
        "email": settings.SUPERADMIN_EMAIL,
        "otp": "000000"
    })
    assert response.status_code == 400
    assert "invalid" in response.json()["detail"].lower()

def test_suspended_user_login_blocked(client, db):
    user = db.query(User).filter(User.username == "rico").first()
    original_status = user.status
    try:
        user.status = "suspended"
        db.commit()

        response = client.post("/api/auth/login", json={
            "username": "rico",
            "password": "password123"
        })
        assert response.status_code == 403
        assert "suspended" in response.json()["detail"].lower()
    finally:
        user.status = original_status
        db.commit()

