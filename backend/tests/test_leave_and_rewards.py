import pytest
from app.models import User, LeaveRequest, RewardRequest

def test_create_leave_request_success(client, employee_headers):
    response = client.post("/api/leave", headers=employee_headers, json={
        "start_date": "2026-11-15",
        "end_date": "2026-11-18",
        "reason": "Family vacation in Cairo"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pending"
    assert data["reason"] == "Family vacation in Cairo"
    assert data["start_date"] == "2026-11-15"

def test_create_leave_invalid_date(client, employee_headers):
    response = client.post("/api/leave", headers=employee_headers, json={
        "start_date": "2026-11-20",
        "end_date": "2026-11-15",
        "reason": "Invalid backward dates"
    })
    assert response.status_code == 400
    assert "earlier than start date" in response.json()["detail"].lower()

def test_leave_approval_and_rejection(client, owner_headers, db):
    # Create test leave
    rico = db.query(User).filter(User.username == "rico").first()
    leave = LeaveRequest(
        workspace_id=rico.workspace_id,
        user_id=rico.id,
        user_name=rico.name,
        start_date="2026-11-25",
        end_date="2026-11-26",
        reason="Medical appointment",
        status="pending"
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)

    # Approve
    res_appr = client.post(f"/api/owner/leave/{leave.id}/approve", headers=owner_headers)
    assert res_appr.status_code == 200
    assert res_appr.json()["leave"]["status"] == "approved"

    # Reject
    res_rej = client.post(f"/api/owner/leave/{leave.id}/reject", headers=owner_headers)
    assert res_rej.status_code == 200
    assert res_rej.json()["leave"]["status"] == "rejected"

def test_reward_insufficient_points(client, employee_headers, db):
    rico = db.query(User).filter(User.username == "rico").first()
    rico.green = 15  # threshold is 30
    db.commit()

    response = client.post("/api/rewards", headers=employee_headers, json={
        "payout_method": "vodafone_cash",
        "number": "01012345678"
    })
    assert response.status_code == 400
    assert "insufficient" in response.json()["detail"].lower()

def test_reward_request_and_owner_approval(client, employee_headers, owner_headers, db):
    rico = db.query(User).filter(User.username == "rico").first()
    rico.green = 35  # exceeds 30
    db.commit()

    # Request reward
    res_claim = client.post("/api/rewards", headers=employee_headers, json={
        "payout_method": "instapay",
        "number": "rico@instapay"
    })
    assert res_claim.status_code == 200
    claim_data = res_claim.json()
    assert claim_data["status"] == "pending"
    claim_id = claim_data["id"]

    # Owner approves reward
    res_appr = client.post(f"/api/owner/rewards/{claim_id}/approve", headers=owner_headers)
    assert res_appr.status_code == 200
    assert res_appr.json()["reward"]["status"] == "approved"

