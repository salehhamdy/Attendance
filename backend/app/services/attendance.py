from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Tuple
from ..config import settings
from ..models import Workspace, User

cairo_tz = ZoneInfo(settings.TIMEZONE)

def get_current_cairo_time() -> datetime:
    return datetime.now(cairo_tz)

def time_to_minutes(time_str: str) -> int:
    try:
        parts = str(time_str or "00:00").split(":")
        h = int(parts[0]) if len(parts) > 0 else 0
        m = int(parts[1]) if len(parts) > 1 else 0
        return h * 60 + m
    except Exception:
        return 0

def classify_checkin_points(
    user: User,
    workspace: Workspace,
    has_approved_leave: bool = False,
    override_time: datetime = None
) -> Tuple[int, int, int, str, str, str]:
    """
    Classifies check-in based on Africa/Cairo local time and configured arrival windows.
    Returns: (delta_green, delta_red, delta_black, point_type, action_label, point_msg)
    """
    now = override_time if override_time else get_current_cairo_time()
    current_mins = now.hour * 60 + now.minute

    early_start = time_to_minutes(workspace.early_window_start)
    early_end = time_to_minutes(workspace.early_window_end)
    normal_end = time_to_minutes(workspace.normal_window_end)
    late_end = time_to_minutes(workspace.late_window_end)

    currency = workspace.currency or "EGP"
    red_penalty = workspace.red_penalty_egp
    black_penalty = workspace.black_penalty_egp

    if early_start <= current_mins < early_end:
        return (
            1, 0, 0,
            "green",
            "Early Check-In",
            f"Early check-in ({workspace.early_window_start} - {workspace.early_window_end}): +1 Green Point awarded!"
        )
    elif early_end <= current_mins < normal_end:
        return (
            0, 0, 0,
            "normal",
            "On-Time Check-In",
            f"On-time check-in ({workspace.early_window_end} - {workspace.normal_window_end}): Attendance recorded."
        )
    elif normal_end <= current_mins < late_end:
        return (
            0, 1, 0,
            "red",
            "Late Check-In",
            f"Late check-in ({workspace.normal_window_end} - {workspace.late_window_end}): +1 Red Penalty assigned ({red_penalty} {currency})."
        )
    elif current_mins >= late_end:
        if has_approved_leave:
            return (
                0, 0, 0,
                "leave",
                "Approved Leave Check-In",
                "Approved leave active: Black absence penalty waived for today."
            )
        return (
            0, 0, 1,
            "black",
            "Severe Absence Delay",
            f"Severe delay / absent (post {workspace.late_window_end}): +1 Black Penalty assigned ({black_penalty} {currency})."
        )
    else:
        # Pre-early window arrival (early bonus)
        return (
            1, 0, 0,
            "green",
            "Early Check-In",
            "Early check-in: +1 Green Point awarded!"
        )

