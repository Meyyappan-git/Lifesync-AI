from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserInDBBase
# duplicate import removed
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from app.core.email import send_verification_email, send_password_reset_email
from datetime import datetime, timedelta
from typing import List
import uuid

router = APIRouter(prefix='/auth', tags=['auth'])

def _generate_token() -> str:
    return str(uuid.uuid4())

@router.post('/register', response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    hashed_pw = get_password_hash(user_in.password)
    verification_token = _generate_token()
    user = User(
        email=user_in.email,
        password_hash=hashed_pw,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        emergency_contact_name=user_in.emergency_contact_name,
        emergency_contact_phone=user_in.emergency_contact_phone,
        is_verified=False,
        verification_token_hash=get_password_hash(verification_token),
        verification_token_expires_at=datetime.utcnow() + timedelta(hours=24),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    send_verification_email(email, verification_token)
    access = create_access_token(data={'sub': str(user.id)})
    refresh = create_refresh_token(data={'sub': str(user.id)})
    return Token(access_token=access, refresh_token=refresh, token_type='bearer')

@router.get('/verify-email')
def verify_email(token: str, db: Session = Depends(get_db)):
    users = db.query(User).all()
    for user in users:
        if user.verification_token_hash and verify_password(token, user.verification_token_hash):
            if user.verification_token_expires_at and user.verification_token_expires_at < datetime.utcnow():
                raise HTTPException(status_code=400, detail='Verification token expired')
            user.is_verified = True
            user.verification_token_hash = None
            user.verification_token_expires_at = None
            db.commit()
            return {'detail': 'Email verified successfully'}
    raise HTTPException(status_code=400, detail='Invalid verification token')

@router.post('/login')
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail='Incorrect email or password')
    if not user.is_verified:
        raise HTTPException(status_code=400, detail='Email not verified')
    # Update last login timestamp
    from datetime import datetime
    user.last_login_at = datetime.utcnow()
    db.commit()
    access = create_access_token(data={'sub': str(user.id)})
    refresh = create_refresh_token(data={'sub': str(user.id)})
    return Token(access_token=access, refresh_token=refresh, token_type='bearer')

@router.get('/users', response_model=List[UserInDBBase])
def get_all_users(db: Session = Depends(get_db)):
    """Return a list of all registered users (admin view)."""
    return db.query(User).all()

@router.get('/online', response_model=List[UserInDBBase])
def get_online_users(db: Session = Depends(get_db), minutes: int = 15):
    """Return users who have logged in within the last *minutes* (default 15)."""
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(minutes=minutes)
    return db.query(User).filter(User.last_login_at >= cutoff).all()

@router.post('/password-reset-request')
def password_reset_request(email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    reset_token = _generate_token()
    user.password_reset_token_hash = get_password_hash(reset_token)
    user.password_reset_token_expires_at = datetime.utcnow() + timedelta(hours=2)
    db.commit()
    send_password_reset_email(email, reset_token)
    return {'detail': 'Password reset email sent'}

@router.post('/password-reset-confirm')
def password_reset_confirm(token: str, new_password: str, db: Session = Depends(get_db)):
    users = db.query(User).all()
    for user in users:
        if user.password_reset_token_hash and verify_password(token, user.password_reset_token_hash):
            if user.password_reset_token_expires_at and user.password_reset_token_expires_at < datetime.utcnow():
                raise HTTPException(status_code=400, detail='Reset token expired')
            user.password_hash = get_password_hash(new_password)
            user.password_reset_token_hash = None
            user.password_reset_token_expires_at = None
            db.commit()
            return {'detail': 'Password reset successful'}
    raise HTTPException(status_code=400, detail='Invalid reset token')
