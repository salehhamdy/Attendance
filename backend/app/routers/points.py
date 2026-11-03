from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Workspace
from ..auth import get_current_user
from ..services.ledger import atomic_cancel_red, atomic_cancel_black

router = APIRouter(prefix="/points", tags=["Points Trading"])

@router.post("/cancel-red")
def cancel_red_penalty(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ws = current_user.workspace or db.query(Workspace).first()
    if not ws:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    return atomic_cancel_red(db=db, user=current_user, workspace=ws)

@router.post("/cancel-black")
def cancel_black_penalty(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ws = current_user.workspace or db.query(Workspace).first()
    if not ws:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    return atomic_cancel_black(db=db, user=current_user, workspace=ws)

