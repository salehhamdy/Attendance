from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from .database import Base

def now_utc():
    return datetime.now(timezone.utc)

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    currency = Column(String(10), default="EGP", nullable=False)
    red_penalty_egp = Column(Integer, default=250, nullable=False)
    black_penalty_egp = Column(Integer, default=1000, nullable=False)
    early_window_start = Column(String(10), default="07:00", nullable=False)
    early_window_end = Column(String(10), default="08:00", nullable=False)
    normal_window_end = Column(String(10), default="10:00", nullable=False)
    late_window_end = Column(String(10), default="12:00", nullable=False)
    reward_threshold = Column(Integer, default=30, nullable=False)
    reward_amount = Column(String(100), default="40 USD / 2,200 EGP", nullable=False)
    allow_remote = Column(Boolean, default=False, nullable=False)
    kiosk_code = Column(String(50), default="SHARM1", nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    # Relationships
    users = relationship("User", back_populates="workspace", cascade="all, delete-orphan")
    shifts = relationship("Shift", back_populates="workspace", cascade="all, delete-orphan")
    branches = relationship("Branch", back_populates="workspace", cascade="all, delete-orphan")
    ledger_entries = relationship("AttendanceLedger", back_populates="workspace", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="workspace", cascade="all, delete-orphan")
    reward_requests = relationship("RewardRequest", back_populates="workspace", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="workspace", cascade="all, delete-orphan")

class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    description = Column(String(255), default="")
    created_at = Column(DateTime(timezone=True), default=now_utc)

    workspace = relationship("Workspace", back_populates="shifts")
    users = relationship("User", back_populates="shift")

class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    radius = Column(Integer, default=300, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    workspace = relationship("Workspace", back_populates="branches")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), nullable=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # 'superadmin' | 'owner' | 'employee'
    status = Column(String(50), default="active", nullable=False)  # 'active' | 'suspended'
    green = Column(Integer, default=0, nullable=False)
    red = Column(Integer, default=0, nullable=False)
    black = Column(Integer, default=0, nullable=False)
    shift_id = Column(Integer, ForeignKey("shifts.id", ondelete="SET NULL"), nullable=True)
    is_immutable = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    workspace = relationship("Workspace", back_populates="users")
    shift = relationship("Shift", back_populates="users")
    ledger_entries = relationship("AttendanceLedger", back_populates="user", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="user", cascade="all, delete-orphan")
    reward_requests = relationship("RewardRequest", back_populates="user", cascade="all, delete-orphan")

class AttendanceLedger(Base):
    __tablename__ = "attendance_ledger"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=now_utc, index=True)
    action = Column(String(100), nullable=False)
    zone = Column(String(255), nullable=False)
    delta_green = Column(Integer, default=0, nullable=False)
    delta_red = Column(Integer, default=0, nullable=False)
    delta_black = Column(Integer, default=0, nullable=False)
    note = Column(Text, nullable=True)
    photo = Column(Text, nullable=True)
    accuracy = Column(Float, nullable=True)
    kiosk_verified = Column(Boolean, default=False, nullable=False)
    is_remote = Column(Boolean, default=False, nullable=False)
    checkin_lat = Column(Float, nullable=True)
    checkin_lng = Column(Float, nullable=True)

    workspace = relationship("Workspace", back_populates="ledger_entries")
    user = relationship("User", back_populates="ledger_entries")

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_name = Column(String(255), nullable=False)
    start_date = Column(String(20), nullable=False)
    end_date = Column(String(20), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # 'pending' | 'approved' | 'rejected'
    created_at = Column(DateTime(timezone=True), default=now_utc)

    workspace = relationship("Workspace", back_populates="leave_requests")
    user = relationship("User", back_populates="leave_requests")

class RewardRequest(Base):
    __tablename__ = "reward_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_name = Column(String(255), nullable=False)
    payout_method = Column(String(50), nullable=False)
    number = Column(String(100), nullable=False)
    amount_usd = Column(Integer, default=40, nullable=False)
    amount_egp = Column(Integer, default=2200, nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # 'pending' | 'approved' | 'rejected'
    created_at = Column(DateTime(timezone=True), default=now_utc)

    workspace = relationship("Workspace", back_populates="reward_requests")
    user = relationship("User", back_populates="reward_requests")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    actor = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False)
    ip = Column(String(100), default="Local Platform")
    detail = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=now_utc, index=True)

    workspace = relationship("Workspace", back_populates="audit_logs")

