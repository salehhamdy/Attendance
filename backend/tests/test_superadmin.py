import pytest
import uuid
from app.models import User, Workspace

def test_get_owners_overview(client, superadmin_headers):
    response = client.get("/api/superadmin/owners", headers=superadmin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "superadmin" in data
    assert data["superadmin"]["is_immutable"] is True
    assert "owners" in data
    assert len(data["owners"]) >= 1
    assert "stats" in data
    assert data["stats"]["total_owners"] >= 1

def test_create_owner_and_workspace(client, superadmin_headers):
    uid = uuid.uuid4().hex[:6]
    test_username = f"tariq_{uid}"
    response = client.post("/api/superadmin/owners", headers=superadmin_headers, json={
        "name": "Tariq Mansour",
        "username": test_username,
        "email": f"tariq_{uid}@redsea-media.eg",
        "workspace": f"Red Sea Media Hurghada {uid}",
        "password": "OwnerSecure2026!"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Tariq Mansour"
    assert data["username"] == test_username
    assert data["role"] == "owner"
    assert data["status"] == "active"

def test_cascading_owner_suspension_and_reinstatement(client, superadmin_headers, db):
    uid = uuid.uuid4().hex[:6]
    # Create isolated owner and subordinate
    ws = db.query(Workspace).filter(Workspace.id == 1).first()
    owner = User(
        workspace_id=ws.id,
        name=f"Owner {uid}",
        username=f"owner_{uid}",
        hashed_password="hash",
        role="owner",
        status="active"
    )
    db.add(owner)
    db.commit()
    db.refresh(owner)

    member = User(
        workspace_id=owner.workspace_id,
        owner_id=owner.id,
        name="Test Subordinate",
        username=f"sub_{uid}",
        hashed_password="hash",
        role="employee",
        status="active"
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    # 1. Suspend Owner
    res_suspend = client.post(f"/api/superadmin/owners/{owner.id}/suspend", headers=superadmin_headers)
    assert res_suspend.status_code == 200
    assert res_suspend.json()["success"] is True

    db.refresh(owner)
    db.refresh(member)
    assert owner.status == "suspended"
    assert member.status == "suspended"

    # 2. Reinstate Owner
    res_reinstate = client.post(f"/api/superadmin/owners/{owner.id}/reinstate", headers=superadmin_headers)
    assert res_reinstate.status_code == 200
    assert res_reinstate.json()["success"] is True

    db.refresh(owner)
    db.refresh(member)
    assert owner.status == "active"
    assert member.status == "active"

def test_superadmin_immutability_enforced(client, superadmin_headers, db):
    superadmin = db.query(User).filter(User.role == "superadmin").first()

    # Attempt to suspend superadmin
    res_suspend = client.post(f"/api/superadmin/owners/{superadmin.id}/suspend", headers=superadmin_headers)
    assert res_suspend.status_code == 403
    assert "immutable" in res_suspend.json()["detail"].lower()

    # Attempt to delete superadmin
    res_del = client.delete(f"/api/superadmin/owners/{superadmin.id}", headers=superadmin_headers)
    assert res_del.status_code == 403
    assert "immutable" in res_del.json()["detail"].lower()

def test_cascading_owner_removal(client, superadmin_headers, db):
    uid = uuid.uuid4().hex[:6]
    owner = User(
        name=f"Disposable Owner {uid}",
        username=f"disposable_owner_{uid}",
        hashed_password="hash",
        role="owner",
        status="active"
    )
    db.add(owner)
    db.commit()
    db.refresh(owner)

    employee = User(
        owner_id=owner.id,
        name="Disposable Employee",
        username=f"disposable_employee_{uid}",
        hashed_password="hash",
        role="employee",
        status="active"
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    owner_id = owner.id
    employee_id = employee.id

    # Cascading removal
    res_del = client.delete(f"/api/superadmin/owners/{owner_id}", headers=superadmin_headers)
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True

    assert db.query(User).filter(User.id == owner_id).first() is None
    assert db.query(User).filter(User.id == employee_id).first() is None

def test_audit_logs(client, superadmin_headers):
    # List audit logs
    res_list = client.get("/api/superadmin/audit-logs", headers=superadmin_headers)
    assert res_list.status_code == 200
    logs = res_list.json()
    assert isinstance(logs, list)
    assert len(logs) > 0

    # Export audit logs
    res_export = client.get("/api/superadmin/audit-logs/export", headers=superadmin_headers)
    assert res_export.status_code == 200
    data = res_export.json()
    assert "csv" in data
    assert "Log ID" in data["csv"]
    assert "Action" in data["csv"]
