from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import engine, Base, SessionLocal
from .models import Workspace, Shift, Branch, User, AttendanceLedger, AuditLog
from .auth import hash_password
from .routers.auth import router as auth_router
from .routers.attendance import router as attendance_router
from .routers.points import router as points_router
from .routers.leave import router as leave_router
from .routers.rewards import router as rewards_router
from .routers.owner import router as owner_router
from .routers.superadmin import router as superadmin_router

def seed_database():
    """Initializes tables and seeds default workspace, superadmin, owner, and employee data if empty."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if already seeded
        existing_superadmin = db.query(User).filter(User.username == settings.SUPERADMIN_EMAIL).first()
        if existing_superadmin:
            return

        # 1. Create Default Workspace
        ws = Workspace(
            name="Rixos Radamis Sharm El-Sheikh",
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
            kiosk_code="SHARM1"
        )
        db.add(ws)
        db.flush()

        # 2. Create Default Shifts
        shift_morning = Shift(
            workspace_id=ws.id,
            name="Morning Shift",
            start_time="08:00",
            end_time="16:00",
            description="Standard morning resort photography session"
        )
        shift_evening = Shift(
            workspace_id=ws.id,
            name="Evening Shift",
            start_time="16:00",
            end_time="00:00",
            description="Sunset & golden hour beach portrait shift"
        )
        shift_night = Shift(
            workspace_id=ws.id,
            name="Night Shift",
            start_time="00:00",
            end_time="08:00",
            description="Overnight studio photo editing & gear maintenance"
        )
        db.add_all([shift_morning, shift_evening, shift_night])
        db.flush()

        # 3. Create Default Branches
        branch_sharm = Branch(
            workspace_id=ws.id,
            name="Rixos Radamis Resort Geofence",
            lat=27.9158,
            lng=34.3299,
            radius=300
        )
        branch_cairo = Branch(
            workspace_id=ws.id,
            name="Cairo Operations HQ",
            lat=30.0444,
            lng=31.2357,
            radius=250
        )
        db.add_all([branch_sharm, branch_cairo])
        db.flush()

        # 4. Create Superadmin User (Saleh Hamdy)
        superadmin = User(
            workspace_id=None,
            name="Saleh Hamdy (Superadmin)",
            username=settings.SUPERADMIN_EMAIL,
            email=settings.SUPERADMIN_EMAIL,
            hashed_password=hash_password("SuperSecure2026!"),
            role="superadmin",
            status="active",
            green=0,
            red=0,
            black=0,
            is_immutable=True
        )
        db.add(superadmin)
        db.flush()

        # 5. Create Default Owner (Layla Hassan)
        owner = User(
            workspace_id=ws.id,
            name="Layla Hassan (Studio Owner)",
            username="layla",
            email="layla@rixos-photo.eg",
            hashed_password=hash_password("password123"),
            role="owner",
            status="active",
            green=0,
            red=0,
            black=0,
            is_immutable=False
        )
        db.add(owner)
        db.flush()

        # 6. Create Initial Employees
        rico = User(
            workspace_id=ws.id,
            owner_id=owner.id,
            name="Rico Rodriguez",
            username="rico",
            email="rico@rixos-photo.eg",
            hashed_password=hash_password("password123"),
            role="employee",
            status="active",
            green=12,
            red=1,
            black=0,
            shift_id=shift_morning.id,
            is_immutable=False
        )
        omar = User(
            workspace_id=ws.id,
            owner_id=owner.id,
            name="Omar Sherif",
            username="omar",
            email="omar@rixos-photo.eg",
            hashed_password=hash_password("password123"),
            role="employee",
            status="active",
            green=28,
            red=0,
            black=0,
            shift_id=shift_evening.id,
            is_immutable=False
        )
        karim = User(
            workspace_id=ws.id,
            owner_id=owner.id,
            name="Karim Nabil",
            username="karim",
            email="karim@rixos-photo.eg",
            hashed_password=hash_password("password123"),
            role="employee",
            status="active",
            green=5,
            red=2,
            black=1,
            shift_id=shift_night.id,
            is_immutable=False
        )
        db.add_all([rico, omar, karim])
        db.flush()

        # 7. Add Initial Ledger Entries
        db.add_all([
            AttendanceLedger(
                workspace_id=ws.id,
                user_id=rico.id,
                branch_id=branch_sharm.id,
                action="Check-in Award",
                zone="Early Arrival Zone",
                delta_green=2,
                delta_red=0,
                delta_black=0,
                note="Early arrival bonus (+2 Green Points)",
                accuracy=12.5,
                kiosk_verified=True,
                checkin_lat=27.9158,
                checkin_lng=34.3299
            ),
            AttendanceLedger(
                workspace_id=ws.id,
                user_id=rico.id,
                branch_id=branch_sharm.id,
                action="Late Penalty",
                zone="Late Arrival Zone",
                delta_green=0,
                delta_red=1,
                delta_black=0,
                note="Late check-in past 10:00 (+1 Red Penalty)",
                accuracy=14.0,
                kiosk_verified=False,
                checkin_lat=27.9158,
                checkin_lng=34.3299
            ),
            AttendanceLedger(
                workspace_id=ws.id,
                user_id=karim.id,
                branch_id=branch_sharm.id,
                action="Critical Absence Penalty",
                zone="Critical Zone",
                delta_green=0,
                delta_red=0,
                delta_black=1,
                note="Unexcused critical window arrival (+1 Black Penalty)",
                accuracy=20.0,
                kiosk_verified=False,
                checkin_lat=27.9158,
                checkin_lng=34.3299
            )
        ])

        # 8. Add Audit Log
        db.add(AuditLog(
            workspace_id=ws.id,
            actor="System Seeder",
            action="System Initialization",
            ip="Local Host",
            detail="Seeded Rixos Radamis Sharm El-Sheikh workspace, initial branches, shifts, and superadmin"
        ))

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables and seed initial data
    seed_database()
    yield
    # Shutdown logic if any

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="Universal Attendance System API with Anti-Fraud Geofencing, Shift Scheduling, Cairo Timezone, and Superadmin Governance",
    lifespan=lifespan
)

# Enable CORS for local Vite development & production hosts
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under API Prefix
app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(attendance_router, prefix=settings.API_PREFIX)
app.include_router(points_router, prefix=settings.API_PREFIX)
app.include_router(leave_router, prefix=settings.API_PREFIX)
app.include_router(rewards_router, prefix=settings.API_PREFIX)
app.include_router(owner_router, prefix=settings.API_PREFIX)
app.include_router(superadmin_router, prefix=settings.API_PREFIX)

@app.get("/")
def root_redirect():
    return {
        "service": settings.PROJECT_NAME,
        "version": "2.0.0",
        "docs_url": "/docs",
        "timezone": settings.CAIRO_TZ,
        "status": "operational"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp_tz": settings.CAIRO_TZ,
        "service": settings.PROJECT_NAME
    }

