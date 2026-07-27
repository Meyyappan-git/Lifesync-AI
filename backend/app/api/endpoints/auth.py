from datetime import timedelta
import random
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.user import UserCreate, User as UserSchema
from app.schemas.token import Token
from pydantic import BaseModel

router = APIRouter()

class OTPVerify(BaseModel):
    email: str
    otp: str

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(deps.get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        if user.is_verified:
            raise HTTPException(
                status_code=400,
                detail="Account already exists for this email.",
            )
        else:
            # User exists but not verified. Resend OTP.
            otp = "123456" # Hardcoded for testing since you don't have console access
            user.otp_code = otp
            db.commit()
            print(f"\n--- MOCK EMAIL --- \nTo: {user.email}\nYour OTP is: {otp}\n------------------\n")
            return {"message": "OTP resent to email"}

    otp = "123456" # Mocked for testing without console access
    user = User(
        email=user_in.email,
        password_hash=security.get_password_hash(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        is_verified=False,
        otp_code=otp
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Mock sending email
    print(f"\n--- MOCK EMAIL --- \nTo: {user.email}\nYour OTP is: {otp}\n------------------\n")
    
    return {"message": "OTP sent to email"}

@router.post("/verify-otp")
def verify_otp(verify_in: OTPVerify, db: Session = Depends(deps.get_db)):
    user = db.query(User).filter(User.email == verify_in.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User already verified")
    if user.otp_code != verify_in.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
        
    user.is_verified = True
    user.otp_code = None
    db.commit()
    return {"message": "Account verified successfully"}

@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user.is_verified:
        raise HTTPException(status_code=400, detail="Please verify your email with OTP first")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "refresh_token": security.create_refresh_token(user.id),
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserSchema)
def read_users_me(current_user: User = Depends(deps.get_current_user)):
    return current_user
