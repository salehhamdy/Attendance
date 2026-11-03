import pytest
from app.models import User, Shift, Branch, Workspace

def test_get_owner_dashboard(client, owner_headers):
    response = client.get("/api/owner/users", headers=owner_headers)
    assert response.status_code == 200
    data = response.json()
    assert "users" in data
    assert "settings" in data
    assert "company" in data
    assert "branches" in data
    assert "shifts" in data
    assert "pending_leaves" in data
    assert "pending_rewards" in data
    assert "kiosk_code" in data
    assert len(data["users"]) >= 3

def test_owner_adjust_points_success(client, owner_headers, db):
    target = db.query(User).filter(User.username == "rico").first()
    original_green = target.green

    response = client.post("/api/owner/adjust", headers=owner_headers, json={
        "user_id": target.id,
        "color": "green",
        "delta": 3,
        "reason": "Exemplary customer feedback in resort studio"
    })
    assert response.status_code == 200
    assert response.json()["green"] == original_green + 3

def test_owner_adjust_points_immutable_superadmin_forbidden(client, owner_headers, db):
    superadmin = db.query(User).filter(User.role == "superadmin").first()

    response = client.post("/api/owner/adjust", headers=owner_headers, json={
        "user_id": superadmin.id,
        "color": "green",
        "delta": 5,
        "reason": "Unauthorized bonus"
    })
    assert response.status_code == 403
    assert "immutable" in response.json()["detail"].lower()

def test_update_settings(client, owner_headers):
    response = client.post("/api/owner/settings", headers=owner_headers, json={
        "red_penalty_egp": 300,
        "black_penalty_egp": 1200,
        "early_window_start": "06:30"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["red_penalty_egp"] == 300
    assert data["black_penalty_egp"] == 1200
    assert data["early_window_start"] == "06:30"

def test_update_company(client, owner_headers):
    response = client.post("/api/owner/company", headers=owner_headers, json={
        "company_name": "Rixos Premium Photo Studio",
        "currency": "EGP",
        "allow_remote": True
    })
    assert response.status_code == 200
    data = response.json()
    assert data["company_name"] == "Rixos Premium Photo Studio"
    assert data["allow_remote"] is True

def test_branch_crud(client, owner_headers):
    # Create branch
    res_add = client.post("/api/owner/branches", headers=owner_headers, json={
        "name": "Nabq Bay Beach Club",
        "lat": 28.0250,
        "lng": 34.4320,
        "radius": 350
    })
    assert res_add.status_code == 200
    branch_data = res_add.json()
    branch_id = branch_data["id"]
    assert branch_data["name"] == "Nabq Bay Beach Club"

    # Delete branch
    res_del = client.delete(f"/api/owner/branches/{branch_id}", headers=owner_headers)
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True

def test_shift_management(client, owner_headers):
    # Create shift
    res_add = client.post("/api/owner/shifts", headers=owner_headers, json={
        "name": "Poolside Noon Shift",
        "start_time": "11:00",
        "end_time": "19:00",
        "description": "Aqua park midday action photos"
    })
    assert res_add.status_code == 200
    shift_data = res_add.json()
    shift_id = shift_data["id"]

    # Delete shift
    res_del = client.delete(f"/api/owner/shifts/{shift_id}", headers=owner_headers)
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True

def test_reset_user_password(client, owner_headers, db):
    target = db.query(User).filter(User.username == "rico").first()
    response = client.post(f"/api/owner/users/{target.id}/reset-password", headers=owner_headers, json={
        "new_password": "NewSecretPassword2026!"
    })
    assert response.status_code == 200
    assert response.json()["success"] is True

    # Superadmin password cannot be reset
    superadmin = db.query(User).filter(User.role == "superadmin").first()
    res_super = client.post(f"/api/owner/users/{superadmin.id}/reset-password", headers=owner_headers, json={
        "new_password": "HackedPassword123!"
    })
    assert res_super.status_code == 403

def test_rotate_kiosk_code(client, owner_headers):
    res_orig = client.get("/api/owner/kiosk/code", headers=owner_headers)
    assert res_orig.status_code == 200

    res_rotate = client.post("/api/owner/kiosk/rotate", headers=owner_headers)
    assert res_rotate.status_code == 200
    new_code = res_rotate.json()["kiosk_code"]
    assert new_code.startswith("K")

def test_export_payroll_csv(client, owner_headers):
    response = client.get("/api/owner/payroll/export", headers=owner_headers)
    assert response.status_code == 200
    data = response.json()
    assert "csv" in data
    assert "filename" in data
    csv_text = data["csv"]
    assert "Employee ID" in csv_text
    assert "Green Points" in csv_text
    assert "Red Deduction" in csv_text
    assert "Black Deduction" in csv_text
    assert "Net Adjustment" in csv_text

