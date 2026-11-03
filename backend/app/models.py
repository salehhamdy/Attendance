from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    Integer, String, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

def now_utc() -> datetime:
    return datetime.now(timezone.utc)

class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="EGP", nullable=False)
    red_penalty_egp: Mapped[int] = mapped_column(Integer, default=250, nullable=False)
    black_penalty_egp: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    early_window_start: Mapped[str] = mapped_column(String(10), default="07:00", nullable=False)
    early_window_end: Mapped[str] = mapped_column(String(10), default="08:00", nullable=False)
    normal_window_end: Mapped[str] = mapped_column(String(10), default="10:00", nullable=False)
    late_window_end: Mapped[str] = mapped_column(String(10), default="12:00", nullable=False)
    reward_threshold: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    reward_amount: Mapped[str] = mapped_column(String(100), default="40 USD / 2,200 EGP", nullable=False)
    allow_remote: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    kiosk_code: Mapped[str] = mapped_column(String(50), default="SHARM1", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="workspace", cascade="all, delete-orphan")
    shifts: Mapped[List["Shift"]] = relationship("Shift", back_populates="workspace", cascade="all, delete-orphan")
    branches: Mapped[List["Branch"]] = relationship("Branch", back_populates="workspace", cascade="all, delete-orphan")
    ledger_entries: Mapped[List["AttendanceLedger"]] = relationship("AttendanceLedger", back_populates="workspace", cascade="all, delete-orphan")
    leave_requests: Mapped[List["LeaveRequest"]] = relationship("LeaveRequest", back_populates="workspace", cascade="all, delete-orphan")
    reward_requests: Mapped[List["RewardRequest"]] = relationship("RewardRequest", back_populates="workspace", cascade="all, delete-orphan")
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="workspace", cascade="all, delete-orphan")

class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    start_time: Mapped[str] = mapped_column(String(10), nullable=False)
    end_time: Mapped[str] = mapped_column(String(10), nullable=False)
    description: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    workspace: Mapped[Optional["Workspace"]] = relationship("Workspace", back_populates="shifts")
    users: Mapped[List["User"]] = relationship("User", back_populates="shift")

class Branch(Base):
    __tablename__ = "branches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    radius: Mapped[int] = mapped_column(Integer, default=300, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    workspace: Mapped[Optional["Workspace"]] = relationship("Workspace", back_populates="branches")

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    workspace_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    owner_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # 'superadmin' | 'owner' | 'employee'
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)  # 'active' | 'suspended'
    green: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    red: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    black: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    shift_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("shifts.id", ondelete="SET NULL"), nullable=True)
    is_immutable: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    workspace: Mapped[Optional["Workspace"]] = relationship("Workspace", back_populates="users")
    shift: Mapped[Optional["Shift"]] = relationship("Shift", back_populates="users")
    ledger_entries: Mapped[List["AttendanceLedger"]] = relationship("AttendanceLedger", back_populates="user", cascade="all, delete-orphan")
    leave_requests: Mapped[List["LeaveRequest"]] = relationship("LeaveRequest", back_populates="user", cascade="all, delete-orphan")
    reward_requests: Mapped[List["RewardRequest"]] = relationship("RewardRequest", back_populates="user", cascade="all, delete-orphan")

class AttendanceLedger(Base):
    __tablename__ = "attendance_ledger"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    zone: Mapped[str] = mapped_column(String(255), nullable=False)
    delta_green: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delta_red: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delta_black: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    photo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    accuracy: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    kiosk_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_remote: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    checkin_lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    checkin_lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    workspace: Mapped[Optional["Workspace"]] = relationship("Workspace", back_populates="ledger_entries")
    user: Mapped[Optional["User"]] = relationship("User", back_populates="ledger_entries")

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_name: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[str] = mapped_column(String(20), nullable=False)
    end_date: Mapped[str] = mapped_column(String(20), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # 'pending' | 'approved' | 'rejected'
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    workspace: Mapped[Optional["Workspace"]] = relationship("Workspace", back_populates="leave_requests")
    user: Mapped[Optional["User"]] = relationship("User", back_populates="leave_requests")

class RewardRequest(Base):
    __tablename__ = "reward_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_name: Mapped[str] = mapped_column(String(255), nullable=False)
    payout_method: Mapped[str] = mapped_column(String(50), nullable=False)
    number: Mapped[str] = mapped_column(String(100), nullable=False)
    amount_usd: Mapped[int] = mapped_column(Integer, default=40, nullable=False)
    amount_egp: Mapped[int] = mapped_column(Integer, default=2200, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)  # 'pending' | 'approved' | 'rejected'
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    workspace: Mapped[Optional["Workspace"]] = relationship("Workspace", back_populates="reward_requests")
    user: Mapped[Optional["User"]] = relationship("User", back_populates="reward_requests")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    workspace_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    actor: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    ip: Mapped[str] = mapped_column(String(100), default="Local Platform")
    detail: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)

    workspace: Mapped[Optional["Workspace"]] = relationship("Workspace", back_populates="audit_logs")
