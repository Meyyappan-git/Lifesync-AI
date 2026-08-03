from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.db.base_class import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    emergency_contact_name = Column(String)
    emergency_contact_phone = Column(String)
    is_verified = Column(Boolean, default=False)
    role = Column(String, default="user")  # "admin" or "user"
    verification_token_hash = Column(String, nullable=True)
    verification_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    password_reset_token_hash = Column(String, nullable=True)
    password_reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    refresh_token_version = Column(Integer, default=0)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
