import sys
from app.db.database import SessionLocal, engine
from app.db.base_class import Base
from app.repositories.user_repository import UserRepository
from app.core.security import hash_password
from app.core.config import settings
from datetime import datetime, timezone


def seed_admin():
    """Seed initial admin user into the database from settings."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user_repo = UserRepository(db)
        existing = user_repo.get_by_email(settings.ADMIN_EMAIL)
        if existing:
            print(f"✅ Admin user '{settings.ADMIN_EMAIL}' already exists.")
            return

        pwd_hash = hash_password(settings.ADMIN_PASSWORD)
        admin_user = user_repo.create(
            email=settings.ADMIN_EMAIL,
            password_hash=pwd_hash,
            full_name="LifeSync Admin",
            role="admin",
        )
        user_repo.update(admin_user, email_verified_at=datetime.now(timezone.utc))
        print(f"🚀 Admin user '{settings.ADMIN_EMAIL}' created successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    seed_admin()
