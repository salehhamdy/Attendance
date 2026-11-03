from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..config import settings
from ..database import get_db
from ..models import User, Workspace, Shift, Branch, AuditLog
from ..schemas import OwnerCreateRequest
from ..auth import require_role, hash_password
from ..services.ledger import log_audit_event

router = APIRouter(prefix="/superadmin", tags=["Superadmin Governance"])

@router.get("/owners")
def get_owners_overview(
    current_user: User = Depends(require_role(["superadmin"])),
    db: Session = Depends(get_db)
):
    owners = db.query(User).filter(User.role == "owner").all()
    
    owners_list = []
    total_team_members = 0

    for o in owners:
        team_count = db.query(User).filter(
            User.role == "employee",
            (User.owner_id == o.id) | (User.workspace_id == o.workspace_id)
        ).count()
        total_team_members += team_count
        ws_name = o.workspace.name if o.workspace else "General Workspace"

        owners_list.append({
            "id": o.id,
            "name": o.name,
            "username": o.username,
            "email": o.email,
            "workspace": ws_name,
            "workspace_id": o.workspace_id,
            "role": o.role,
            "status": o.status,
            "team_size": team_count,
            "is_immutable": o.is_immutable,
            "created_at": o.created_at.isoformat() if o.created_at else None
        })

    active_count = sum(1 for o in owners if o.status == "active")
    suspended_count = sum(1 for o in owners if o.status == "suspended")

    superadmin_info = {
        "id": current_user.id,
        "name": current_user.name,
        "username": current_user.username,
        "email": current_user.email or settings.SUPERADMIN_EMAIL,
        "role": current_user.role,
        "is_immutable": True,
        "allowed_email": settings.SUPERADMIN_EMAIL
    }

    return {
        "superadmin": superadmin_info,
        "owners": owners_list,
        "stats": {
            "total_owners": len(owners),
            "active_owners": active_count,
            "suspended_owners": suspended_count,
            "total_team_members": total_team_members
        }
    }

@router.post("/owners")
def create_owner(
    req: OwnerCreateRequest,
    current_user: User = Depends(require_role(["superadmin"])),
    db: Session = Depends(get_db)
):
    if not req.name or not req.username or not req.workspace:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Owner name, username, and assigned workspace are required"
        )

    clean_username = req.username.strip().lower()
    if clean_username == "superadmin" or clean_username == settings.SUPERADMIN_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation prohibited: The superadmin username is reserved and immutable."
        )

    existing = db.query(User).filter(User.username == clean_username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Owner with username "{clean_username}" already exists'
        )

    # Find or create workspace
    ws_name = req.workspace.strip()
    ws = db.query(Workspace).filter(Workspace.name == ws_name).first()
    if not ws:
        ws = Workspace(
            name=ws_name,
            currency="EGP",
            red_penalty_egp=settings.RED_PENALTY_EGP,
            black_penalty_egp=settings.BLACK_PENALTY_EGP,
            early_window_start=settings.EARLY_WINDOW_START,
            early_window_end=settings.EARLY_WINDOW_END,
            normal_window_end=settings.NORMAL_WINDOW_END,
            late_window_end=settings.LATE_WINDOW_END,
            reward_threshold=settings.REWARD_THRESHOLD,
            reward_amount="40 USD / 2,200 EGP",
            allow_remote=False,
            kiosk_code="K" + clean_username[:4].upper()
        )
        db.add(ws)
        db.flush()

        # Seed standard shifts for new workspace
        db.add_all([
            Shift(workspace_id=ws.id, name="Morning Shift", start_time="08:00", end_time="16:00", description="Standard Day Shift"),
            Shift(workspace_id=ws.id, name="Evening Shift", start_time="16:00", end_time="00:00", description="Afternoon / Sunset Shift"),
            Shift(workspace_id=ws.id, name="Night Shift", start_time="00:00", end_time="08:00", description="Overnight Surveillance Shift"),
            Branch(workspace_id=ws.id, name=f"{ws_name} Main Campus", lat=27.9158, lng=34.3299, radius=300)
        ])
        db.flush()

    pwd = req.password or "OwnerPass123!"
    new_owner = User(
        workspace_id=ws.id,
        name=req.name.strip(),
        username=clean_username,
        email=req.email.strip().lower() if req.email else None,
        hashed_password=hash_password(pwd),
        role="owner",
        status="active",
        green=0,
        red=0,
        black=0,
        is_immutable=False
    )
    db.add(new_owner)

    log_audit_event(
        db,
        actor=current_user.name,
        action="Owner Provisioned",
        detail=f"Superadmin provisioned owner '{clean_username}' for workspace '{ws.name}'",
        workspace_id=ws.id
    )
    db.commit()
    db.refresh(new_owner)

    return {
        "id": new_owner.id,
        "name": new_owner.name,
        "username": new_owner.username,
        "email": new_owner.email,
        "workspace": ws.name,
        "workspace_id": ws.id,
        "role": new_owner.role,
        "status": new_owner.status,
        "team_size": 0,
        "created_at": new_owner.created_at.isoformat() if new_owner.created_at else None
    }

@router.post("/owners/{owner_id}/suspend")
def suspend_owner(
    owner_id: int,
    current_user: User = Depends(require_role(["superadmin"])),
    db: Session = Depends(get_db)
):
    if owner_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation prohibited: The superadmin account is immutable and cannot be removed, suspended, or modified."
        )

    owner = db.query(User).filter(User.id == owner_id, User.role == "owner").first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")

    if owner.is_immutable:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation prohibited: This account is immutable."
        )

    owner.status = "suspended"

    # Cascading suspension: suspend all team members under this owner / workspace
    team_members = db.query(User).filter(
        User.role == "employee",
        (User.owner_id == owner.id) | (User.workspace_id == owner.workspace_id)
    ).all()

    for member in team_members:
        member.status = "suspended"

    log_audit_event(
        db,
        actor=current_user.name,
        action="Owner & Team Suspended",
        detail=f"Suspended owner '{owner.username}' and entire team ({len(team_members)} members)",
        workspace_id=owner.workspace_id
    )
    db.commit()

    return {
        "success": True,
        "message": f'Owner "{owner.name}" and team ({len(team_members)} members) suspended simultaneously.',
        "owner": {
            "id": owner.id,
            "name": owner.name,
            "username": owner.username,
            "status": owner.status
        },
        "suspended_team_count": len(team_members)
    }

@router.post("/owners/{owner_id}/reinstate")
def reinstate_owner(
    owner_id: int,
    current_user: User = Depends(require_role(["superadmin"])),
    db: Session = Depends(get_db)
):
    owner = db.query(User).filter(User.id == owner_id, User.role == "owner").first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")

    owner.status = "active"

    # Cascading reinstatement: reinstate all team members under this owner / workspace
    team_members = db.query(User).filter(
        User.role == "employee",
        (User.owner_id == owner.id) | (User.workspace_id == owner.workspace_id)
    ).all()

    for member in team_members:
        member.status = "active"

    log_audit_event(
        db,
        actor=current_user.name,
        action="Owner & Team Reinstated",
        detail=f"Reinstated owner '{owner.username}' and entire team ({len(team_members)} members)",
        workspace_id=owner.workspace_id
    )
    db.commit()

    return {
        "success": True,
        "message": f'Owner "{owner.name}" reinstated. Entire team access restored.',
        "owner": {
            "id": owner.id,
            "name": owner.name,
            "username": owner.username,
            "status": owner.status
        },
        "reinstated_team_count": len(team_members)
    }

@router.delete("/owners/{owner_id}")
def remove_owner(
    owner_id: int,
    current_user: User = Depends(require_role(["superadmin"])),
    db: Session = Depends(get_db)
):
    if owner_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation prohibited: The superadmin account is immutable and cannot be removed, suspended, or modified."
        )

    owner = db.query(User).filter(User.id == owner_id, User.role == "owner").first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")

    if owner.is_immutable:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation prohibited: The superadmin account is immutable and cannot be removed, suspended, or modified."
        )

    ws_id = owner.workspace_id
    owner_name = owner.name
    owner_username = owner.username

    # Cascading removal: delete all team members under this owner
    team_members = db.query(User).filter(
        User.role == "employee",
        (User.owner_id == owner.id) | (User.workspace_id == ws_id)
    ).all()
    count = len(team_members)
    for m in team_members:
        db.delete(m)

    # Delete the owner
    db.delete(owner)

    log_audit_event(
        db,
        actor=current_user.name,
        action="Owner & Team Removed",
        detail=f"Permanently removed owner '{owner_username}' and {count} team members",
        workspace_id=ws_id
    )
    db.commit()

    return {
        "success": True,
        "message": f'Owner "{owner_name}" and all associated workspace records permanently removed.',
        "deleted_owner": {
            "id": owner_id,
            "name": owner_name,
            "username": owner_username
        },
        "deleted_team_count": count
    }

@router.get("/audit-logs")
def get_audit_logs(
    current_user: User = Depends(require_role(["superadmin"])),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "actor": l.actor,
            "action": l.action,
            "ip": l.ip,
            "detail": l.detail
        } for l in logs
    ]

@router.get("/audit-logs/export")
def export_audit_logs_csv(
    current_user: User = Depends(require_role(["superadmin"])),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()

    headers = ["Log ID", "Timestamp", "Actor", "Action", "IP Address", "Event Details"]
    rows = []
    for l in logs:
        ts = l.timestamp.isoformat() if l.timestamp else ""
        rows.append(",".join([
            f"#{l.id}",
            f'"{ts}"',
            f'"{l.actor}"',
            f'"{l.action}"',
            f'"{l.ip}"',
            f'"{l.detail.replace(chr(34), chr(39))}"'
        ]))

    csv_content = "\n".join([",".join(headers)] + rows)
    return {
        "csv": csv_content,
        "filename": "superadmin-audit-logs.csv"
    }

