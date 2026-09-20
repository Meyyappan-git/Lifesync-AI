import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db.database import SessionLocal
from app.services.auth_service import AuthService
from app.core.security import hash_password

db = SessionLocal()
auth_service = AuthService(db)

user = auth_service.user_repo.get_by_email("meyyappan2007@gmail.com")
if user:
    user.password_hash = hash_password("Password123!")
    db.commit()
    print("Password updated")
else:
    print("User not found")
