from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from ..models import User, Workspace, AttendanceLedger, AuditLog

def atomic_cancel_red(db: Session, user: User, workspace: Workspace) -> dict:
    """
    Atomically cancels 1 Red Penalty using 1 Green Point.
    Enforces that money is integer EGP and all balance changes go through ledger.
    """
    if user.green < 1 or user.red < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient points: Need at least 1 Green point and 1 active Red penalty"
        )

    user.green -= 1
    user.red -= 1

    entry = AttendanceLedger(
        workspace_id=workspace.id,
        user_id=user.id,
        action="Red Penalty Cancelled",
        zone="Point Exchange",
        delta_green=-1,
        delta_red=-1,
        delta_black=0,
        note=f"1 Red Penalty cancelled (-{workspace.red_penalty_egp} {workspace.currency} deduction)"
    )
    db.add(entry)
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "message": f"1 Red Penalty cancelled (-{workspace.red_penalty_egp} {workspace.currency} deduction)",
        "green": user.green,
        "red": user.red,
        "black": user.black
    }

def atomic_cancel_black(db: Session, user: User, workspace: Workspace) -> dict:
    """
    Atomically cancels 1 Black Penalty using 5 Green Points.
    Enforces that money is integer EGP and all balance changes go through ledger.
    """
    if user.green < 5 or user.black < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient points: Need at least 5 Green points and 1 active Black penalty"
        )

    user.green -= 5
    user.black -= 1

    entry = AttendanceLedger(
        workspace_id=workspace.id,
        user_id=user.id,
        action="Black Penalty Cancelled",
        zone="Point Exchange",
        delta_green=-5,
        delta_red=0,
        delta_black=-1,
        note=f"1 Black Penalty cancelled (-{workspace.black_penalty_egp} {workspace.currency} deduction)"
    )
    db.add(entry)
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "message": f"1 Black Penalty cancelled (-{workspace.black_penalty_egp} {workspace.currency} deduction)",
        "green": user.green,
        "red": user.red,
        "black": user.black
    }

def log_audit_event(
    db: Session,
    actor: str,
    action: str,
    detail: str,
    ip: str = "Local Platform",
    workspace_id: Optional[int] = None
) -> AuditLog:
    """
    Creates an immutable audit log entry.
    """
    log_entry = AuditLog(
        workspace_id=workspace_id,
        actor=actor,
        action=action,
        ip=ip,
        detail=detail
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

