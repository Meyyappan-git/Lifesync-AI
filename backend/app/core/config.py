import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "LifeSync AI"
    API_V1_STR: str = "/api/v1"

    # Database
    POSTGRES_USER: str = "lifesync"
    POSTGRES_PASSWORD: str = "lifesyncpassword"
    POSTGRES_SERVER: str = "db"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "lifesync_db"
    DATABASE_URL: str | None = None

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if self.DATABASE_URL:
            return self.DATABASE_URL
        if os.getenv("POSTGRES_SERVER"):
            return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        db_path = os.path.join(base_dir, "lifesync.db")
        return f"sqlite:///{db_path}"

    # JWT & Auth
    SECRET_KEY: str = "supersecretkey_please_change_in_production"
    JWT_SECRET: str | None = None
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = 15
    REFRESH_DAYS: int = 30
    COOKIE_SECURE: bool = False

    @property
    def EFFECTIVE_JWT_SECRET(self) -> str:
        return self.JWT_SECRET or self.SECRET_KEY

    # Frontend URL
    FRONTEND_URL: str = "http://localhost:3000"

    # Email config
    EMAIL_BACKEND: str = "console"  # "console" or "smtp"
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = True
    EMAIL_FROM: str = "noreply@lifesync.ai"

    # Initial Admin Seed
    ADMIN_EMAIL: str = "admin@lifesync.ai"
    ADMIN_PASSWORD: str = "AdminPass123!"

    # Local Storage
    STORAGE_DIR: str = "storage"

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
