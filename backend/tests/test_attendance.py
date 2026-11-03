import pytest

def test_get_summary(client, employee_headers):
    response = client.get("/api/me/summary", headers=employee_headers)
    assert response.status_code == 200
    data = response.json()
    assert "green" in data
    assert "red" in data
    assert "black" in data
    assert "branches" in data
    assert len(data["branches"]) > 0
    assert "settings" in data
    assert "company" in data
    assert "history" in data
    assert "calendar" in data
    assert data["currency"] == "EGP"

def test_checkin_inside_geofence_success(client, employee_headers):
    # Sharm El Sheikh resort branch coordinates
    response = client.post("/api/checkin", headers=employee_headers, json={
        "lat": 27.9158,
        "lng": 34.3299,
        "accuracy": 15.0
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["distance"] <= 300
    assert "Geofence" in data["zone"]

def test_checkin_outside_geofence_rejected(client, employee_headers):
    # Distant coordinates in Cairo or open desert
    response = client.post("/api/checkin", headers=employee_headers, json={
        "lat": 25.0000,
        "lng": 30.0000,
        "accuracy": 15.0
    })
    assert response.status_code == 400
    assert "outside" in response.json()["detail"].lower()

def test_checkin_anti_spoofing_low_accuracy_rejected(client, employee_headers):
    # Accuracy > 150m triggers anti-spoofing filter
    response = client.post("/api/checkin", headers=employee_headers, json={
        "lat": 27.9158,
        "lng": 34.3299,
        "accuracy": 220.0
    })
    assert response.status_code == 400
    assert "accuracy is too low" in response.json()["detail"].lower()

def test_checkin_with_valid_kiosk_code_bypasses_gps(client, employee_headers):
    # Low accuracy and remote location allowed if valid kiosk code is supplied
    response = client.post("/api/checkin", headers=employee_headers, json={
        "lat": 25.0000,
        "lng": 30.0000,
        "accuracy": 300.0,
        "kiosk_code": "SHARM1"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["kiosk_verified"] is True

def test_checkin_with_invalid_kiosk_code_rejected(client, employee_headers):
    response = client.post("/api/checkin", headers=employee_headers, json={
        "lat": 27.9158,
        "lng": 34.3299,
        "accuracy": 15.0,
        "kiosk_code": "WRONG_CODE_999"
    })
    assert response.status_code == 400
    assert "invalid on-site kiosk code" in response.json()["detail"].lower()

def test_get_points_history(client, employee_headers):
    response = client.get("/api/me/history", headers=employee_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "action" in first
    assert "delta_green" in first
    assert "timestamp" in first

def test_get_attendance_calendar(client, employee_headers):
    response = client.get("/api/me/calendar?year=2026&month=11", headers=employee_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 30  # November has 30 days
    assert data[0]["day"] == 1
    assert data[0]["date"] == "2026-11-01"

