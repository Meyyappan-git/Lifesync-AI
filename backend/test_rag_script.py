import sys
from app.db.database import SessionLocal
from app.services.ai_assistant import answer_ai_assistant_query
from app.models.user import User

db = SessionLocal()
user = db.query(User).first()
if not user:
    print("No user found")
    sys.exit(1)

try:
    res = answer_ai_assistant_query(db, user, "what is meyyappan's cgpa")
    print(res)
except Exception as e:
    print("ERROR CAUGHT:", e)
    import traceback
    traceback.print_exc()

