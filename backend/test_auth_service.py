import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db.database import SessionLocal
from app.services.auth_service import AuthService

db = SessionLocal()
auth_service = AuthService(db)

user = auth_service.user_repo.get_by_email("meyyappan2007@gmail.com")
if not user:
    print("User not found")
    sys.exit(1)

print("Found user:", user.email, "ID:", user.id)

try:
    # We don't have the password, but we can just trace what happens if password check passes
    print("Locked until:", user.locked_until)
    
    auth_service.user_repo.reset_failed_login(user)
    print("Reset failed login successful")
    
    session, refresh_token = auth_service.token_service.create_session(
        user_id=user.id,
        remember_me=False,
        ip="127.0.0.1",
        user_agent="test script"
    )
    print("Created session:", session.id)
    
    from app.core.security import create_access_token
    access_token, expires_in = create_access_token(
        user_id=str(user.id),
        role=user.role,
        sid=str(session.id)
    )
    print("Created access token")
    
    auth_service.activity_service.log_event(event="login_success", user_id=user.id)
    print("Logged event")

except Exception as e:
    import traceback
    traceback.print_exc()

