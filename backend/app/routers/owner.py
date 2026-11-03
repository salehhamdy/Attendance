import secrets
import string
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Workspace, Branch, Shift, LeaveRequest, RewardRequest, AttendanceLedger
from ..schemas import (
    PointAdjustRequest,
    SettingsUpdateRequest,
    CompanyUpdateRequest,
    BranchCreateRequest,
    UserCreateRequest,
    PasswordResetRequest,
    ShiftCreateRequest,
    ShiftAssignRequest
)
from ..auth import require_role, hash_password
from ..services.ledger import log_audit_event

router = APIRouter(prefix="/owner", tags=["Owner Administration"])

@router.get("/users")
def get_owner_dashboard_data(
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    ws_id = current_user.workspace_id or 1
    ws = db.query(Workspace).filter(Workspace.id == ws_id).first()
    if not ws:
        ws = db.query(Workspace).first()

    users_query = db.query(User).filter(User.role != "superadmin")
    if current_user.role == "owner":
        users_query = users_query.filter(User.workspace_id == ws.id)
    users = users_query.all()

    branches = db.query(Branch).filter(Branch.workspace_id == ws.id).all()
    shifts = db.query(Shift).filter(Shift.workspace_id == ws.id).all()
    leaves = db.query(LeaveRequest).filter(LeaveRequest.workspace_id == ws.id).order_by(LeaveRequest.created_at.desc()).all()
    rewards = db.query(RewardRequest).filter(RewardRequest.workspace_id == ws.id).order_by(RewardRequest.created_at.desc()).all()

    users_data = []
    for u in users:
        shift_name = u.shift.name if u.shift else "Morning Shift"
        users_data.append({
            "id": u.id,
            "name": u.name,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "status": u.status,
            "green": u.green,
            "red": u.red,
            "black": u.black,
            "shift_id": u.shift_id,
            "shift_name": shift_name,
            "is_immutable": u.is_immutable,
            "workspace_id": u.workspace_id,
            "owner_id": u.owner_id
        })

    branches_data = [
        {
            "id": b.id,
            "name": b.name,
            "lat": b.lat,
            "lng": b.lng,
            "radius": b.radius
        } for b in branches
    ]

    shifts_data = [
        {
            "id": s.id,
            "name": s.name,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "description": s.description
        } for s in shifts
    ]

    leaves_data = [
        {
            "id": l.id,
            "user_id": l.user_id,
            "user_name": l.user_name,
            "start_date": l.start_date,
            "end_date": l.end_date,
            "reason": l.reason,
            "status": l.status,
            "created_at": l.created_at.isoformat() if l.created_at else None
        } for l in leaves
    ]

    rewards_data = [
        {
            "id": r.id,
            "user_id": r.user_id,
            "user_name": r.user_name,
            "payout_method": r.payout_method,
            "number": r.number,
            "amount_usd": r.amount_usd,
            "amount_egp": r.amount_egp,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None
        } for r in rewards
    ]

    return {
        "users": users_data,
        "settings": {
            "red_penalty_egp": ws.red_penalty_egp,
            "black_penalty_egp": ws.black_penalty_egp,
            "early_window_start": ws.early_window_start,
            "early_window_end": ws.early_window_end,
            "normal_window_end": ws.normal_window_end,
            "late_window_end": ws.late_window_end,
        },
        "company": {
            "company_name": ws.name,
            "currency": ws.currency,
            "reward_threshold": ws.reward_threshold,
            "reward_amount": ws.reward_amount,
            "allow_remote": ws.allow_remote,
            "branches": branches_data,
        },
        "branches": branches_data,
        "shifts": shifts_data,
        "leave_requests": leaves_data,
        "reward_requests": rewards_data,
        "pending_leaves": [l for l in leaves_data if l["status"] == "pending"],
        "pending_rewards": [r for r in rewards_data if r["status"] == "pending"],
        "kiosk_code": ws.kiosk_code
    }

@router.post("/adjust")
def adjust_points(
    req: PointAdjustRequest,
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.id == req.user_id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found"
        )

    if target.is_immutable or target.role == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation prohibited: The superadmin account is immutable."
        )

    delta_g, delta_r, delta_b = 0, 0, 0
    color = req.color.lower().strip()
    if color == "green":
        target.green = max(0, target.green + req.delta)
        delta_g = req.delta
    elif color == "red":
        target.red = max(0, target.red + req.delta)
        delta_r = req.delta
    elif color == "black":
        target.black = max(0, target.black + req.delta)
        delta_b = req.delta
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Color must be green, red, or black"
        )

    ws_id = target.workspace_id or current_user.workspace_id or 1
    ledger = AttendanceLedger(
        workspace_id=ws_id,
        user_id=target.id,
        action="Administrative Point Adjustment",
        zone="Owner Panel",
        delta_green=delta_g,
        delta_red=delta_r,
        delta_black=delta_b,
        note=f"Owner adjustment: {req.reason.strip()}"
    )
    db.add(ledger)
    log_audit_event(
        db,
        actor=current_user.name,
        action="Point Adjustment",
        detail=f"Adjusted {req.color} points by {req.delta} for {target.username} ({req.reason})",
        workspace_id=ws_id
    )

    db.commit()
    return {"success": True, "green": target.green, "red": target.red, "black": target.black}

@router.get("/settings")
def get_settings(
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    ws_id = current_user.workspace_id or 1
    ws = db.query(Workspace).filter(Workspace.id == ws_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    return {
        "red_penalty_egp": ws.red_penalty_egp,
        "black_penalty_egp": ws.black_penalty_egp,
        "early_window_start": ws.early_window_start,
        "early_window_end": ws.early_window_end,
        "normal_window_end": ws.normal_window_end,
        "late_window_end": ws.late_window_end,
    }

@router.post("/settings")
def update_settings(
    req: SettingsUpdateRequest,
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    ws_id = current_user.workspace_id or 1
    ws = db.query(Workspace).filter(Workspace.id == ws_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if req.red_penalty_egp is not None:
        ws.red_penalty_egp = req.red_penalty_egp
    if req.black_penalty_egp is not None:
        ws.black_penalty_egp = req.black_penalty_egp
    if req.early_window_start is not None:
        ws.early_window_start = req.early_window_start
    if req.early_window_end is not None:
        ws.early_window_end = req.early_window_end
    if req.normal_window_end is not None:
        ws.normal_window_end = req.normal_window_end
    if req.late_window_end is not None:
        ws.late_window_end = req.late_window_end

    log_audit_event(
        db,
        actor=current_user.name,
        action="Settings Updated",
        detail=f"Updated shift windows and penalty amounts for workspace {ws.name}",
        workspace_id=ws.id
    )
    db.commit()

    return {
        "red_penalty_egp": ws.red_penalty_egp,
        "black_penalty_egp": ws.black_penalty_egp,
        "early_window_start": ws.early_window_start,
        "early_window_end": ws.early_window_end,
        "normal_window_end": ws.normal_window_end,
        "late_window_end": ws.late_window_end,
    }

@router.get("/company")
def get_company(
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    ws_id = current_user.workspace_id or 1
    ws = db.query(Workspace).filter(Workspace.id == ws_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    branches = db.query(Branch).filter(Branch.workspace_id == ws.id).all()
    return {
        "company_name": ws.name,
        "currency": ws.currency,
        "reward_threshold": ws.reward_threshold,
        "reward_amount": ws.reward_amount,
        "allow_remote": ws.allow_remote,
        "branches": [
            {"id": b.id, "name": b.name, "lat": b.lat, "lng": b.lng, "radius": b.radius}
            for b in branches
        ],
    }

@router.post("/company")
def update_company(
    req: CompanyUpdateRequest,
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    ws_id = current_user.workspace_id or 1
    ws = db.query(Workspace).filter(Workspace.id == ws_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if req.company_name is not None:
        ws.name = req.company_name.strip()
    if req.currency is not None:
        ws.currency = req.currency.strip().upper()
    if req.reward_threshold is not None:
        ws.reward_threshold = req.reward_threshold
    if req.reward_amount is not None:
        ws.reward_amount = req.reward_amount.strip()
    if req.allow_remote is not None:
        ws.allow_remote = req.allow_remote

    log_audit_event(
        db,
        actor=current_user.name,
        action="Company Profile Updated",
        detail=f"Company profile updated for {ws.name}",
        workspace_id=ws.id
    )
    db.commit()

    branches = db.query(Branch).filter(Branch.workspace_id == ws.id).all()
    return {
        "company_name": ws.name,
        "currency": ws.currency,
        "reward_threshold": ws.reward_threshold,
        "reward_amount": ws.reward_amount,
        "allow_remote": ws.allow_remote,
        "branches": [
            {"id": b.id, "name": b.name, "lat": b.lat, "lng": b.lng, "radius": b.radius}
            for b in branches
        ],
    }

@router.post("/branches")
def add_branch(
    req: BranchCreateRequest,
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    ws_id = current_user.workspace_id or 1
    new_branch = Branch(
        workspace_id=ws_id,
        name=req.name.strip(),
        lat=req.lat,
        lng=req.lng,
        radius=req.radius or 300
    )
    db.add(new_branch)
    log_audit_event(
        db,
        actor=current_user.name,
        action="Branch Added",
        detail=f"Added branch '{req.name}' at ({req.lat}, {req.lng}) radius {req.radius}m",
        workspace_id=ws_id
    )
    db.commit()
    db.refresh(new_branch)
    return {
        "id": new_branch.id,
        "name": new_branch.name,
        "lat": new_branch.lat,
        "lng": new_branch.lng,
        "radius": new_branch.radius
    }

@router.delete("/branches/{branch_id}")
def delete_branch(
    branch_id: int,
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    db.delete(branch)
    log_audit_event(
        db,
        actor=current_user.name,
        action="Branch Removed",
        detail=f"Removed branch '{branch.name}'",
        workspace_id=branch.workspace_id
    )
    db.commit()
    return {"success": True}

@router.post("/users")
def add_user(
    req: UserCreateRequest,
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    clean_username = req.username.strip().lower()
    existing = db.query(User).filter(User.username == clean_username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{clean_username}' already exists. Please choose another."
        )

    ws_id = current_user.workspace_id or 1
    shift_id = req.shift_id
    if not shift_id:
        default_shift = db.query(Shift).filter(Shift.workspace_id == ws_id).first()
        shift_id = default_shift.id if default_shift else None

    new_user = User(
        workspace_id=ws_id,
        owner_id=current_user.id if current_user.role == "owner" else None,
        name=req.name.strip(),
        username=clean_username,
        hashed_password=hash_password("Pass123!"),
        role=req.role or "employee",
        status="active",
        green=0,
        red=0,
        black=0,
        shift_id=shift_id,
        is_immutable=False
    )
    db.add(new_user)
    log_audit_event(
        db,
        actor=current_user.name,
        action="User Created",
        detail=f"Created {new_user.role} user '{clean_username}' ({req.name})",
        workspace_id=ws_id
    )
    db.commit()
    db.refresh(new_user)

    shift_name = new_user.shift.name if new_user.shift else "Morning Shift"
    return {
        "id": new_user.id,
        "name": new_user.name,
        "username": new_user.username,
        "role": new_user.role,
        "status": new_user.status,
        "green": new_user.green,
        "red": new_user.red,
        "black": new_user.black,
        "shift_id": new_user.shift_id,
        "shift_name": shift_name,
        "is_immutable": new_user.is_immutable
    }

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_immutable or user.role == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation prohibited: The superadmin account is immutable."
        )

    db.delete(user)
    log_audit_event(
        db,
        actor=current_user.name,
        action="User Deleted",
        detail=f"Deleted user '{user.username}' ({user.name})",
        workspace_id=user.workspace_id
    )
    db.commit()
    return {"success": True}

@router.post("/users/{user_id}/reset-password")
def reset_password(
    user_id: int,
    req: PasswordResetRequest,
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_immutable or user.role == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation prohibited: Superadmin credentials cannot be reset via owner dashboard."
        )

    if not req.new_password or len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    user.hashed_password = hash_password(req.new_password)
    log_audit_event(
        db,
        actor=current_user.name,
        action="Password Reset",
        detail=f"Password manually reset for user '{user.username}'",
        workspace_id=user.workspace_id
    )
    db.commit()
    return {"success": True, "message": f"Password reset successfully for {user.username}"}

@router.get("/kiosk/code")
def get_kiosk_code(
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    ws_id = current_user.workspace_id or 1
    ws = db.query(Workspace).filter(Workspace.id == ws_id).first()
    return {"kiosk_code": ws.kiosk_code if ws else "SHARM1"}

@router.post("/kiosk/rotate")
def rotate_kiosk_code(
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    ws_id = current_user.workspace_id or 1
    ws = db.query(Workspace).filter(Workspace.id == ws_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    random_chars = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(5))
    ws.kiosk_code = f"K{random_chars}"

    log_audit_event(
        db,
        actor=current_user.name,
        action="Kiosk Code Rotated",
        detail=f"Rotated kiosk verification code to '{ws.kiosk_code}'",
        workspace_id=ws.id
    )
    db.commit()
    return {"success": True, "kiosk_code": ws.kiosk_code}

@router.get("/shifts")
def get_shifts(
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    ws_id = current_user.workspace_id or 1
    shifts = db.query(Shift).filter(Shift.workspace_id == ws_id).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "description": s.description
        } for s in shifts
    ]

@router.post("/shifts")
def create_shift(
    req: ShiftCreateRequest,
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    ws_id = current_user.workspace_id or 1
    new_shift = Shift(
        workspace_id=ws_id,
        name=req.name.strip(),
        start_time=req.start_time.strip(),
        end_time=req.end_time.strip(),
        description=req.description.strip() if req.description else ""
    )
    db.add(new_shift)
    log_audit_event(
        db,
        actor=current_user.name,
        action="Shift Created",
        detail=f"Created shift '{req.name}' ({req.start_time} - {req.end_time})",
        workspace_id=ws_id
    )
    db.commit()
    db.refresh(new_shift)
    return {
        "id": new_shift.id,
        "name": new_shift.name,
        "start_time": new_shift.start_time,
        "end_time": new_shift.end_time,
        "description": new_shift.description
    }

@router.delete("/shifts/{shift_id}")
def delete_shift(
    shift_id: int,
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift schedule not found")

    ws_id = shift.workspace_id
    fallback_shift = db.query(Shift).filter(
        Shift.workspace_id == ws_id,
        Shift.id != shift_id
    ).first()

    # Reassign users
    users = db.query(User).filter(User.shift_id == shift_id).all()
    for u in users:
        u.shift_id = fallback_shift.id if fallback_shift else None

    db.delete(shift)
    log_audit_event(
        db,
        actor=current_user.name,
        action="Shift Deleted",
        detail=f"Deleted shift '{shift.name}', reassigned {len(users)} users",
        workspace_id=ws_id
    )
    db.commit()
    return {"success": True}

@router.post("/users/{user_id}/shift")
def assign_user_shift(
    user_id: int,
    req: ShiftAssignRequest,
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    shift = db.query(Shift).filter(Shift.id == req.shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift schedule not found")

    user.shift_id = shift.id
    log_audit_event(
        db,
        actor=current_user.name,
        action="Shift Assigned",
        detail=f"Assigned user '{user.username}' to shift '{shift.name}'",
        workspace_id=user.workspace_id
    )
    db.commit()
    return {"success": True, "shift_id": shift.id, "shift_name": shift.name}

@router.get("/payroll/export")
def export_payroll_csv(
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    ws_id = current_user.workspace_id or 1
    ws = db.query(Workspace).filter(Workspace.id == ws_id).first()
    currency = ws.currency if ws else "EGP"
    red_val = ws.red_penalty_egp if ws else 250
    black_val = ws.black_penalty_egp if ws else 1000

    users_query = db.query(User).filter(User.role != "superadmin")
    if current_user.role == "owner":
        users_query = users_query.filter(User.workspace_id == ws_id)
    users = users_query.all()

    headers = [
        "Employee ID",
        "Name",
        "Username",
        "Role",
        "Shift",
        "Green Points",
        "Red Penalties",
        f"Red Deduction ({currency})",
        "Black Penalties",
        f"Black Deduction ({currency})",
        f"Total Deductions ({currency})",
        "Approved Rewards",
        f"Net Adjustment ({currency})",
    ]

    rows = []
    for u in users:
        red_ded = (u.red or 0) * red_val
        black_ded = (u.black or 0) * black_val
        total_ded = red_ded + black_ded
        net = -total_ded
        shift_name = u.shift.name if u.shift else "Default"
        rows.append(",".join([
            f"#{u.id}",
            f'"{u.name}"',
            f'"{u.username}"',
            u.role,
            f'"{shift_name}"',
            str(u.green or 0),
            str(u.red or 0),
            str(red_ded),
            str(u.black or 0),
            str(black_ded),
            str(total_ded),
            "0",
            str(net),
        ]))

    csv_content = "\n".join([",".join(headers)] + rows)
    company_name = ws.name if ws else "Attendance"
    filename = f"payroll-report-{company_name.lower().replace(' ', '-')}.csv"

    return {
        "csv": csv_content,
        "filename": filename
    }

