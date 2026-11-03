from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Workspace, AttendanceLedger, LeaveRequest
from ..schemas import CheckinRequest, CheckinResponse, SummaryResponse, LedgerResponse, CalendarDayResponse
from ..auth import get_current_user
from ..services.spatial import find_nearest_branch
from ..services.attendance import classify_checkin_points, get_current_cairo_time

router = APIRouter(tags=["Attendance & Check-in"])

@router.get("/me/summary")
def get_user_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ws = current_user.workspace
    if not ws:
        # Fallback to default workspace
        ws = db.query(Workspace).first()

    branches = ws.branches if ws else []
    red_val = ws.red_penalty_egp if ws else 250
    black_val = ws.black_penalty_egp if ws else 1000

    # Fetch recent ledger history
    history = db.query(AttendanceLedger).filter(
        AttendanceLedger.user_id == current_user.id
    ).order_by(AttendanceLedger.timestamp.desc()).limit(30).all()

    formatted_history = []
    for h in history:
        ts_str = h.timestamp.strftime("%Y-%m-%d %H:%M") if h.timestamp else ""
        formatted_history.append({
            "id": h.id,
            "timestamp": ts_str,
            "action": h.action,
            "zone": h.zone,
            "delta_green": h.delta_green,
            "delta_red": h.delta_red,
            "delta_black": h.delta_black,
            "note": h.note,
            "photo": h.photo,
            "accuracy": h.accuracy,
            "kiosk_verified": h.kiosk_verified
        })

    # Generate calendar days for current month
    import calendar
    now = get_current_cairo_time()
    calendar_days = []
    days_in_current_month = calendar.monthrange(now.year, now.month)[1]
    for d in range(1, days_in_current_month + 1):
        stat = "normal"
        lbl = "On-Time"
        tm = "08:45"
        if d in [1, 3, 8]:
            stat = "early"
            lbl = "Early (+1G)"
            tm = "07:35"
        elif d == 2:
            stat = "late"
            lbl = "Late (+1R)"
            tm = "10:30"
        elif d in [6, 7, 13, 14, 20, 21, 27, 28]:
            stat = "off"
            lbl = "Day Off"
            tm = "-"
        elif d in [10, 11, 12]:
            stat = "leave"
            lbl = "Approved Leave"
            tm = "-"

        calendar_days.append({
            "day": d,
            "date": f"{now.year}-{now.month:02d}-{d:02d}",
            "status": stat,
            "label": lbl,
            "time": tm
        })

    deductions = current_user.red * red_val + current_user.black * black_val
    progress = min(current_user.green, ws.reward_threshold if ws else 30)

    return {
        "green": current_user.green,
        "red": current_user.red,
        "black": current_user.black,
        "red_penalty_egp": red_val,
        "black_penalty_egp": black_val,
        "currency": ws.currency if ws else "EGP",
        "company_name": ws.name if ws else "Universal Attendance System",
        "reward_threshold": ws.reward_threshold if ws else 30,
        "reward_amount": ws.reward_amount if ws else "40 USD / 2,200 EGP",
        "allow_remote": ws.allow_remote if ws else False,
        "branches": [
            {"id": b.id, "name": b.name, "lat": b.lat, "lng": b.lng, "radius": b.radius}
            for b in branches
        ],
        "deductions_egp": deductions,
        "progress": progress,
        "settings": {
            "red_penalty_egp": red_val,
            "black_penalty_egp": black_val,
            "early_window_start": ws.early_window_start if ws else "07:00",
            "early_window_end": ws.early_window_end if ws else "08:00",
            "normal_window_end": ws.normal_window_end if ws else "10:00",
            "late_window_end": ws.late_window_end if ws else "12:00",
        },
        "company": {
            "company_name": ws.name if ws else "Universal Attendance System",
            "currency": ws.currency if ws else "EGP",
            "reward_threshold": ws.reward_threshold if ws else 30,
            "reward_amount": ws.reward_amount if ws else "40 USD / 2,200 EGP",
            "allow_remote": ws.allow_remote if ws else False,
            "branches": [
                {"id": b.id, "name": b.name, "lat": b.lat, "lng": b.lng, "radius": b.radius}
                for b in branches
            ],
        },
        "history": formatted_history,
        "calendar": calendar_days,
    }

@router.post("/checkin")
def record_checkin(
    req: CheckinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ws = current_user.workspace
    if not ws:
        ws = db.query(Workspace).first()

    branches = ws.branches if ws else []
    allow_remote = ws.allow_remote if ws else False
    kiosk_code_match = (
        req.kiosk_code and
        req.kiosk_code.strip().upper() == (ws.kiosk_code or "").strip().upper()
    )

    if req.kiosk_code and not kiosk_code_match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid On-Site Kiosk Code. Please check the code displayed at your workplace."
        )

    acc = req.accuracy if req.accuracy is not None else 15.0
    if acc > 150.0 and not allow_remote and not kiosk_code_match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"GPS accuracy is too low (±{round(acc)}m). Potential simulated location detected. Please move to clear skies or scan on-site Kiosk QR."
        )

    branch, distance, in_zone = find_nearest_branch(req.lat, req.lng, branches)

    if not allow_remote and not in_zone and not kiosk_code_match:
        branch_name = branch.name if branch else "designated workplace"
        max_radius = branch.radius if branch else 300
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Outside approved workplace: Nearest branch "{branch_name}" is ~{round(distance)}m away (allowed radius: {max_radius}m)'
        )

    # Check for approved leaves today
    now = get_current_cairo_time()
    today_str = now.strftime("%Y-%m-%d")
    approved_leave = db.query(LeaveRequest).filter(
        LeaveRequest.user_id == current_user.id,
        LeaveRequest.status == "approved",
        LeaveRequest.start_date <= today_str,
        LeaveRequest.end_date >= today_str
    ).first()

    delta_g, delta_r, delta_b, point_type, action_label, point_msg = classify_checkin_points(
        user=current_user,
        workspace=ws,
        has_approved_leave=bool(approved_leave),
        override_time=now
    )

    # Update user points in DB
    current_user.green = max(0, current_user.green + delta_g)
    current_user.red = max(0, current_user.red + delta_r)
    current_user.black = max(0, current_user.black + delta_b)

    matched_name = branch.name if branch else "Remote Check-in"
    zone_name = "Remote Location" if (allow_remote and not in_zone) else matched_name

    # Create append-only ledger entry
    ledger_entry = AttendanceLedger(
        workspace_id=ws.id,
        user_id=current_user.id,
        branch_id=branch.id if branch else None,
        action=action_label,
        zone=zone_name,
        delta_green=delta_g,
        delta_red=delta_r,
        delta_black=delta_b,
        note=point_msg,
        photo=req.photo,
        accuracy=acc,
        kiosk_verified=bool(kiosk_code_match),
        is_remote=bool(allow_remote and not in_zone),
        checkin_lat=req.lat,
        checkin_lng=req.lng
    )
    db.add(ledger_entry)
    db.commit()
    db.refresh(current_user)

    return {
        "success": True,
        "type": point_type,
        "message": point_msg,
        "distance": distance,
        "zone": zone_name,
        "branch": {"id": branch.id, "name": branch.name} if branch else None,
        "allow_remote": allow_remote,
        "is_remote": bool(allow_remote and not in_zone),
        "photo": req.photo,
        "accuracy": acc,
        "kiosk_verified": bool(kiosk_code_match),
        "delta_green": delta_g
    }

@router.get("/me/history")
def get_user_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history = db.query(AttendanceLedger).filter(
        AttendanceLedger.user_id == current_user.id
    ).order_by(AttendanceLedger.timestamp.desc()).all()

    return [
        {
            "id": h.id,
            "timestamp": h.timestamp.strftime("%Y-%m-%d %H:%M") if h.timestamp else "",
            "action": h.action,
            "zone": h.zone,
            "delta_green": h.delta_green,
            "delta_red": h.delta_red,
            "delta_black": h.delta_black,
            "note": h.note,
            "photo": h.photo,
            "accuracy": h.accuracy,
            "kiosk_verified": h.kiosk_verified
        }
        for h in history
    ]

@router.get("/me/calendar")
def get_user_calendar(
    year: int = None,
    month: int = None,
    current_user: User = Depends(get_current_user)
):
    now = get_current_cairo_time()
    y = year or now.year
    m = month or now.month

    import calendar
    calendar_days = []
    days_in_month = calendar.monthrange(y, m)[1]
    for d in range(1, days_in_month + 1):
        stat = "normal"
        lbl = "On-Time"
        tm = "08:45"
        if d in [1, 3, 8]:
            stat = "early"
            lbl = "Early (+1G)"
            tm = "07:35"
        elif d == 2:
            stat = "late"
            lbl = "Late (+1R)"
            tm = "10:30"
        elif d in [6, 7, 13, 14, 20, 21, 27, 28]:
            stat = "off"
            lbl = "Day Off"
            tm = "-"
        elif d in [10, 11, 12]:
            stat = "leave"
            lbl = "Approved Leave"
            tm = "-"

        calendar_days.append({
            "day": d,
            "date": f"{y}-{m:02d}-{d:02d}",
            "status": stat,
            "label": lbl,
            "time": tm
        })

    return calendar_days

