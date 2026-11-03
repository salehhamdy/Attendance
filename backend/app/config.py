import os

class Settings:
    PROJECT_NAME: str = "Universal Attendance System API"
    VERSION: str = "2.0.0"
    API_PREFIX: str = "/api"

    # Database: defaults to local SQLite if not configured
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./attendance.db")

    # Security & JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-attendance-production-key-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Superadmin Root Configuration (Immutable)
    SUPERADMIN_EMAIL: str = "salehhamdy599@gmail.com"
    SUPERADMIN_DEFAULT_OTP: str = "849201"

    # Timezone Convention: Africa/Cairo
    TIMEZONE: str = "Africa/Cairo"
    CAIRO_TZ: str = "Africa/Cairo"

    # Default Economic Policies
    DEFAULT_CURRENCY: str = "EGP"
    CURRENCY: str = "EGP"
    RED_PENALTY_EGP: int = 250
    DEFAULT_RED_PENALTY_EGP: int = 250
    BLACK_PENALTY_EGP: int = 1000
    DEFAULT_BLACK_PENALTY_EGP: int = 1000
    REWARD_THRESHOLD: int = 30
    DEFAULT_REWARD_THRESHOLD: int = 30
    REWARD_AMOUNT: str = "40 USD / 2,200 EGP"
    DEFAULT_REWARD_AMOUNT: str = "40 USD / 2,200 EGP"

    # Default Attendance Shift Windows (Cairo Local Time)
    EARLY_WINDOW_START: str = "07:00"
    DEFAULT_EARLY_START: str = "07:00"
    EARLY_WINDOW_END: str = "08:00"
    DEFAULT_EARLY_END: str = "08:00"
    NORMAL_WINDOW_END: str = "10:00"
    DEFAULT_NORMAL_END: str = "10:00"
    LATE_WINDOW_END: str = "12:00"
    DEFAULT_LATE_END: str = "12:00"

    # GPS Anti-Spoofing Threshold
    MAX_ALLOWED_ACCURACY_METERS: float = 150.0

settings = Settings()
