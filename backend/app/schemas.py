from datetime import datetime
from typing import Optional, List, Any, Union
from pydantic import BaseModel, ConfigDict

# Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class SuperadminOtpRequest(BaseModel):
    email: str

class SuperadminOtpVerify(BaseModel):
    email: str
    otp: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    name: str
    email: Optional[str] = None
    company_name: Optional[str] = None

# Check-in Schemas
class CheckinRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lat: float
    lng: float
    photo: Optional[str] = None
    accuracy: Optional[float] = 15.0
    kiosk_code: Optional[str] = None

class CheckinResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    success: bool
    type: str
    message: str
    distance: float
    zone: str
    branch: Optional[Any] = None
    allow_remote: bool
    is_remote: bool
    photo: Optional[str] = None
    accuracy: Optional[float] = None
    kiosk_verified: bool = False
    delta_green: Optional[int] = None
    summary: Optional[Any] = None

# Summary / Dashboard Schemas
class BranchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    lat: float
    lng: float
    radius: int

class ShiftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    start_time: str
    end_time: str
    description: Optional[str] = ""

class SettingsResponse(BaseModel):
    red_penalty_egp: int
    black_penalty_egp: int
    early_window_start: str
    early_window_end: str
    normal_window_end: str
    late_window_end: str

class CompanyResponse(BaseModel):
    company_name: str
    currency: str
    reward_threshold: int
    reward_amount: str
    allow_remote: bool
    branches: List[BranchResponse]

class LedgerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    timestamp: Optional[Union[str, datetime]] = None
    action: str
    zone: str
    delta_green: int
    delta_red: int
    delta_black: int
    note: Optional[str] = None
    photo: Optional[str] = None
    accuracy: Optional[float] = None
    kiosk_verified: bool = False

class CalendarDayResponse(BaseModel):
    day: int
    date: str
    status: str
    label: str
    time: str

class SummaryResponse(BaseModel):
    green: int
    red: int
    black: int
    red_penalty_egp: int
    black_penalty_egp: int
    currency: str
    company_name: str
    reward_threshold: int
    reward_amount: str
    allow_remote: bool
    branches: List[BranchResponse]
    deductions_egp: int
    progress: int
    settings: SettingsResponse
    company: CompanyResponse
    history: List[LedgerResponse]
    calendar: List[CalendarDayResponse]

# Point Exchanges & Adjustments
class PointAdjustRequest(BaseModel):
    user_id: int
    color: str
    delta: int
    reason: str

# Leaves & Rewards
class LeaveCreateRequest(BaseModel):
    start_date: str
    end_date: str
    reason: str

class LeaveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    user_name: str
    start_date: str
    end_date: str
    reason: str
    status: str
    created_at: Optional[Union[str, datetime]] = None

class RewardCreateRequest(BaseModel):
    payout_method: str
    number: str

class RewardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    user_name: str
    payout_method: str
    number: str
    amount_usd: int
    amount_egp: int
    status: str
    created_at: Optional[Union[str, datetime]] = None

# Owner Administration
class SettingsUpdateRequest(BaseModel):
    red_penalty_egp: Optional[int] = None
    black_penalty_egp: Optional[int] = None
    early_window_start: Optional[str] = None
    early_window_end: Optional[str] = None
    normal_window_end: Optional[str] = None
    late_window_end: Optional[str] = None

class CompanyUpdateRequest(BaseModel):
    company_name: Optional[str] = None
    currency: Optional[str] = None
    reward_threshold: Optional[int] = None
    reward_amount: Optional[str] = None
    allow_remote: Optional[bool] = None

class BranchCreateRequest(BaseModel):
    name: str
    lat: float
    lng: float
    radius: Optional[int] = 300

class UserCreateRequest(BaseModel):
    name: str
    username: str
    role: Optional[str] = "employee"
    shift_id: Optional[int] = None

class PasswordResetRequest(BaseModel):
    new_password: str

class ShiftCreateRequest(BaseModel):
    name: str
    start_time: str
    end_time: str
    description: Optional[str] = ""

class ShiftAssignRequest(BaseModel):
    shift_id: int

# Superadmin Governance
class OwnerCreateRequest(BaseModel):
    name: str
    username: str
    email: Optional[str] = None
    workspace: str
    password: Optional[str] = "OwnerPass123!"

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    timestamp: Optional[Union[str, datetime]] = None
    actor: str
    action: str
    ip: str
    detail: str
