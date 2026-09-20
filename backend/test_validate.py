import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db.database import SessionLocal
from app.services.auth_service import AuthService
from app.schemas.user import UserResponse

db = SessionLocal()
auth_service = AuthService(db)

user = auth_service.user_repo.get_by_email("meyyappan2007@gmail.com")
if not user:
    print("User not found")
    sys.exit(1)

try:
    user_resp = UserResponse.model_validate(user)
    print("Validated:", user_resp.email)
except Exception as e:
    import traceback
    traceback.print_exc()

