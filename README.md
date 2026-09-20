# Lifesync-AI
A tool which predicts the future cautions and gives remedies
3️⃣ GUI option (optional but visual)
DB Browser for SQLite – open lifesync.db and explore tables, rows, and schema with a graphical interface.
Download: https://sqlitebrowser.org/

VS Code – install the SQLite extension, then open lifesync.db and browse it from the sidebar.

🎯 TL;DR Cheat‑sheet
bash
# 1️⃣ List all tables
sqlite3 lifesync.db ".tables"
# 2️⃣ Show CREATE statement for a table
sqlite3 lifesync.db ".schema users"
# 3️⃣ Or use Python/SQLAlchemy
python - <<'PY'
from app.db.database import engine
from sqlalchemy import inspect
print(inspect(engine).get_table_names())
PY
Run any of these commands and you’ll see the exact tables defined in your Lifesync AI database. Let me know if you need help inspecting row data or writing queries against a particular table!