import pytest
from app.models import User

def test_cancel_red_insufficient_points(client, employee_headers, db):
    user = db.query(User).filter(User.username == "rico").first()
    user.green = 0
    user.red = 1
    db.commit()

    response = client.post("/api/points/cancel-red", headers=employee_headers)
    assert response.status_code == 400
    assert "insufficient" in response.json()["detail"].lower()

def test_cancel_red_zero_penalties(client, employee_headers, db):
    user = db.query(User).filter(User.username == "rico").first()
    user.green = 10
    user.red = 0
    db.commit()

    response = client.post("/api/points/cancel-red", headers=employee_headers)
    assert response.status_code == 400
    assert "insufficient" in response.json()["detail"].lower()

def test_cancel_red_success(client, employee_headers, db):
    user = db.query(User).filter(User.username == "rico").first()
    user.green = 10
    user.red = 2
    db.commit()

    response = client.post("/api/points/cancel-red", headers=employee_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    # 1 green point cancels 1 red penalty
    assert data["green"] == 9
    assert data["red"] == 1

def test_cancel_black_insufficient_points(client, employee_headers, db):
    user = db.query(User).filter(User.username == "rico").first()
    user.green = 3  # needs 5
    user.black = 1
    db.commit()

    response = client.post("/api/points/cancel-black", headers=employee_headers)
    assert response.status_code == 400
    assert "insufficient" in response.json()["detail"].lower()

def test_cancel_black_zero_penalties(client, employee_headers, db):
    user = db.query(User).filter(User.username == "rico").first()
    user.green = 20
    user.black = 0
    db.commit()

    response = client.post("/api/points/cancel-black", headers=employee_headers)
    assert response.status_code == 400
    assert "insufficient" in response.json()["detail"].lower()

def test_cancel_black_success(client, employee_headers, db):
    user = db.query(User).filter(User.username == "rico").first()
    user.green = 20
    user.black = 1
    db.commit()

    response = client.post("/api/points/cancel-black", headers=employee_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    # 5 green points cancel 1 black penalty
    assert data["green"] == 15
    assert data["black"] == 0
