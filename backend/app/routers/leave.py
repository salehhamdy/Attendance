from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Workspace, LeaveRequest
from ..schemas import LeaveCreateRequest, LeaveResponse
from ..auth import get_current_user, require_role

router = APIRouter(tags=["Leave Management"])

@router.post("/leave", response_model=LeaveResponse)
def create_leave_request(
    req: LeaveCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not req.start_date or not req.end_date or not req.reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start date, end date, and reason are required"
        )

    if req.end_date < req.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date cannot be earlier than start date"
        )

    ws = current_user.workspace or db.query(Workspace).first()
    new_leave = LeaveRequest(
        workspace_id=ws.id if ws else 1,
        user_id=current_user.id,
        user_name=current_user.name,
        start_date=req.start_date,
        end_date=req.end_date,
        reason=req.reason.strip(),
        status="pending"
    )
    db.add(new_leave)
    db.commit()
    db.refresh(new_leave)
    return new_leave

@router.get("/leave")
def list_leave_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role in ["owner", "superadmin"]:
        query = db.query(LeaveRequest)
        if current_user.role == "owner" and current_user.workspace_id:
            query = query.filter(LeaveRequest.workspace_id == current_user.workspace_id)
        leaves = query.order_by(LeaveRequest.created_at.desc()).all()
    else:
        leaves = db.query(LeaveRequest).filter(
            LeaveRequest.user_id == current_user.id
        ).order_by(LeaveRequest.created_at.desc()).all()

    return leaves

@router.post("/owner/leave/{leave_id}/approve")
def approve_leave(
    leave_id: int,
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )

    leave.status = "approved"
    db.commit()
    db.refresh(leave)
    return {"success": True, "leave": leave}

@router.post("/owner/leave/{leave_id}/reject")
def reject_leave(
    leave_id: int,
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Leave request not found"
        )

    leave.status = "rejected"
    db.commit()
    db.refresh(leave)
    return {"success": True, "leave": leave}

