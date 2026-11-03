from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Workspace, RewardRequest
from ..schemas import RewardCreateRequest, RewardResponse
from ..auth import get_current_user, require_role

router = APIRouter(tags=["Reward Management"])

@router.post("/rewards", response_model=RewardResponse)
def create_reward_request(
    req: RewardCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not req.payout_method or not req.number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payout method and account/phone number are required"
        )

    valid_methods = ["vodafone_cash", "instapay", "binance_usdt"]
    if req.payout_method.lower() not in valid_methods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payout method. Supported: {', '.join(valid_methods)}"
        )

    ws = current_user.workspace or db.query(Workspace).first()
    threshold = ws.reward_threshold if ws else 30

    if current_user.green < threshold:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient Green Points: You currently have {current_user.green}/{threshold} required points"
        )

    new_reward = RewardRequest(
        workspace_id=ws.id if ws else 1,
        user_id=current_user.id,
        user_name=current_user.name,
        payout_method=req.payout_method.lower(),
        number=req.number.strip(),
        amount_usd=40,
        amount_egp=2200,
        status="pending"
    )
    db.add(new_reward)
    db.commit()
    db.refresh(new_reward)
    return new_reward

@router.get("/rewards")
def list_rewards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role in ["owner", "superadmin"]:
        query = db.query(RewardRequest)
        if current_user.role == "owner" and current_user.workspace_id:
            query = query.filter(RewardRequest.workspace_id == current_user.workspace_id)
        rewards = query.order_by(RewardRequest.created_at.desc()).all()
    else:
        rewards = db.query(RewardRequest).filter(
            RewardRequest.user_id == current_user.id
        ).order_by(RewardRequest.created_at.desc()).all()

    return rewards

@router.post("/owner/rewards/{reward_id}/approve")
def approve_reward(
    reward_id: int,
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    reward = db.query(RewardRequest).filter(RewardRequest.id == reward_id).first()
    if not reward:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reward request not found"
        )

    reward.status = "approved"
    db.commit()
    db.refresh(reward)
    return {"success": True, "reward": reward}

@router.post("/owner/rewards/{reward_id}/reject")
def reject_reward(
    reward_id: int,
    current_user: User = Depends(require_role(["owner", "superadmin"])),
    db: Session = Depends(get_db)
):
    reward = db.query(RewardRequest).filter(RewardRequest.id == reward_id).first()
    if not reward:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reward request not found"
        )

    reward.status = "rejected"
    db.commit()
    db.refresh(reward)
    return {"success": True, "reward": reward}

