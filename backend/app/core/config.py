from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "LifeSync AI"
    API_V1_STR: str = "/api/v1"
    
    # Database settings
    POSTGRES_USER: str = "lifesync"
    POSTGRES_PASSWORD: str = "lifesyncpassword"
    POSTGRES_SERVER: str = "db" # Service name in docker-compose
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "lifesync_db"
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        import os
        if os.getenv("POSTGRES_SERVER"):
            return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        # Using SQLite for local non-Docker development
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        db_path = os.path.join(base_dir, "lifesync.db")
        return f"sqlite:///{db_path}"

    # JWT Settings
    SECRET_KEY: str = "supersecretkey_please_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Storage
    STORAGE_DIR: str = "storage"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
