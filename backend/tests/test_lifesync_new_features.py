import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.database import get_db
from app.db.base_class import Base
from app.models.user import User
from app.models.core_models import Document, Folder, Reminder, DocumentRelationship, ChatMessage, RiskAlert
from app.models.health_report import HealthReport
from app.core.security import hash_password, create_access_token

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_features.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    db = TestingSessionLocal()
    # Seed user
    user = User(
        email="features_test@example.com",
        password_hash=hash_password("Password123!"),
        full_name="Features Tester",
        role="user",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Seed folder & docs
    f = Folder(name="Travel", description="Travel docs", user_id=user.id)
    db.add(f)
    db.commit()
    db.refresh(f)

    d1 = Document(user_id=user.id, folder_id=f.id, name="Passport.pdf", file_path="storage/dummy1.pdf", file_type="pdf")
    d2 = Document(user_id=user.id, folder_id=f.id, name="Flight_Ticket.pdf", file_path="storage/dummy2.pdf", file_type="pdf")
    db.add_all([d1, d2])
    db.commit()
    db.close()

    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)

import uuid

def get_auth_headers():
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "features_test@example.com").first()
    token, _ = create_access_token(user_id=str(user.id), role=user.role, sid=str(uuid.uuid4()))
    db.close()
    return {"Authorization": f"Bearer {token}"}


def test_reminders_crud_flow():
    headers = get_auth_headers()

    # 1. Create reminder
    trigger = (datetime.now() + timedelta(days=2)).isoformat()
    resp = client.post("/api/v1/lifesync/reminders", json={
        "title": "Renew Driving Licence",
        "message": "Visit RTO website to renew DL",
        "trigger_time": trigger
    }, headers=headers)
    assert resp.status_code == 201
    rem_data = resp.json()
    assert rem_data["title"] == "Renew Driving Licence"
    assert rem_data["is_sent"] is False
    rem_id = rem_data["id"]

    # 2. List reminders
    list_resp = client.get("/api/v1/lifesync/reminders", headers=headers)
    assert list_resp.status_code == 200
    reminders = list_resp.json()
    assert len(reminders) == 1
    assert reminders[0]["id"] == rem_id

    # 3. Update reminder
    patch_resp = client.patch(f"/api/v1/lifesync/reminders/{rem_id}", json={
        "title": "Renew DL (Urgent)"
    }, headers=headers)
    assert patch_resp.status_code == 200
    assert patch_resp.json()["title"] == "Renew DL (Urgent)"

    # 4. Send reminder email now
    send_resp = client.post(f"/api/v1/lifesync/reminders/{rem_id}/send-now", headers=headers)
    assert send_resp.status_code == 200
    assert send_resp.json()["is_sent"] is True

    # 5. Delete reminder
    del_resp = client.delete(f"/api/v1/lifesync/reminders/{rem_id}", headers=headers)
    assert del_resp.status_code == 200

    # 6. Verify deleted
    list_resp2 = client.get("/api/v1/lifesync/reminders", headers=headers)
    assert len(list_resp2.json()) == 0

def test_chat_history_endpoints():
    headers = get_auth_headers()
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "features_test@example.com").first()
    msg1 = ChatMessage(user_id=user.id, role="user", content="Where is my passport?")
    msg2 = ChatMessage(user_id=user.id, role="assistant", content="Found in Travel folder.")
    db.add_all([msg1, msg2])
    db.commit()
    db.close()

    # Get history
    hist_resp = client.get("/api/v1/lifesync/assistant/history", headers=headers)
    assert hist_resp.status_code == 200
    history = hist_resp.json()
    assert len(history) == 2
    assert history[0]["content"] == "Where is my passport?"

    # Clear history
    del_resp = client.delete("/api/v1/lifesync/assistant/history", headers=headers)
    assert del_resp.status_code == 200

    # Verify cleared
    hist_resp2 = client.get("/api/v1/lifesync/assistant/history", headers=headers)
    assert len(hist_resp2.json()) == 0

def test_document_patch_and_relationships():
    headers = get_auth_headers()
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "features_test@example.com").first()
    docs = db.query(Document).filter(Document.user_id == user.id).all()
    doc1 = docs[0]
    doc2 = docs[1]
    db.close()

    # 1. Update Document Metadata
    patch_resp = client.patch(f"/api/v1/lifesync/documents/{doc1.id}", json={
        "name": "Passport_Renewed.pdf",
        "metadata": {
            "expiry_date": "2032-01-01",
            "passport_number": "Z9876543"
        }
    }, headers=headers)
    assert patch_resp.status_code == 200
    updated_doc = patch_resp.json()
    assert updated_doc["name"] == "Passport_Renewed.pdf"
    assert updated_doc["metadata"]["expiry_date"] == "2032-01-01"

    # 2. Create Relationship (Flight Ticket depends on Passport)
    rel_resp = client.post(f"/api/v1/lifesync/documents/{doc2.id}/relationships", json={
        "target_document_id": doc1.id,
        "relationship_type": "depends_on",
        "notes": "International flight requires valid passport"
    }, headers=headers)
    assert rel_resp.status_code == 201
    rel_data = rel_resp.json()
    rel_id = rel_data["id"]

    # 3. Get Relationships
    get_rels_resp = client.get(f"/api/v1/lifesync/documents/{doc1.id}/relationships", headers=headers)
    assert get_rels_resp.status_code == 200
    rels = get_rels_resp.json()
    assert len(rels) == 1
    assert rels[0]["relationship_type"] == "depends_on"

    # 4. Delete Relationship
    del_rel_resp = client.delete(f"/api/v1/lifesync/documents/relationships/{rel_id}", headers=headers)
    assert del_rel_resp.status_code == 200

def test_risk_resolution_flow():
    headers = get_auth_headers()

    # 1. Resolve risk
    resolve_resp = client.post("/api/v1/lifesync/risks/resolve", json={
        "risk_title": "Critical Travel Risk: Passport Expiring Before International Flight",
        "is_resolved": True
    }, headers=headers)
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["is_resolved"] is True

    # 2. Get resolved risks
    get_res_resp = client.get("/api/v1/lifesync/risks/resolved", headers=headers)
    assert get_res_resp.status_code == 200
    assert "Critical Travel Risk: Passport Expiring Before International Flight" in get_res_resp.json()

def test_travel_readiness_customization():
    headers = get_auth_headers()
    
    # 1. Domestic trip check
    dom_resp = client.post("/api/v1/lifesync/travel-readiness/check", json={
        "destination": "San Francisco",
        "trip_type": "domestic",
        "departure_date": "2026-12-01"
    }, headers=headers)
    assert dom_resp.status_code == 200
    data_dom = dom_resp.json()
    assert data_dom["trip_type"] == "domestic"
    assert any("Government Photo ID" in c["name"] for c in data_dom["checks"])

    # 2. Schengen trip check
    schengen_resp = client.post("/api/v1/lifesync/travel-readiness/check", json={
        "destination": "France & Germany",
        "trip_type": "schengen",
        "departure_date": "2026-11-15"
    }, headers=headers)
    assert schengen_resp.status_code == 200
    data_sch = schengen_resp.json()
    assert data_sch["trip_type"] == "schengen"
    assert any("Schengen Travel Medical Insurance" in c["name"] for c in data_sch["checks"])

def test_health_report_deletion():
    headers = get_auth_headers()
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "features_test@example.com").first()

    report = HealthReport(
        user_id=user.id,
        report_type="manual",
        manual_data={"age": 30, "gender": "male", "symptoms": "fever"},
        cautions="Monitor body temperature.",
        remedies="Rest and hydrate."
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    report_id = report.id
    db.close()

    # Verify report is retrievable
    get_resp = client.get(f"/api/v1/health/report/{report_id}", headers=headers)
    assert get_resp.status_code == 200

    # Delete report
    del_resp = client.delete(f"/api/v1/health/report/{report_id}", headers=headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["message"] == "Health report deleted successfully"

    # Verify report no longer exists
    get_after = client.get(f"/api/v1/health/report/{report_id}", headers=headers)
    assert get_after.status_code == 404

def test_document_search_endpoint():
    headers = get_auth_headers()
    
    # 1. Search by name match
    search_resp = client.get("/api/v1/lifesync/documents/search?q=Passport", headers=headers)
    assert search_resp.status_code == 200
    res_data = search_resp.json()
    assert res_data["total"] >= 1
    assert any("passport" in r["name"].lower() for r in res_data["results"])

    # 2. Add metadata to doc and search by metadata
    doc_id = res_data["results"][0]["id"]
    patch_resp = client.patch(f"/api/v1/lifesync/documents/{doc_id}", json={
        "metadata": {"document_number": "Z12345X"}
    }, headers=headers)
    assert patch_resp.status_code == 200

    meta_resp = client.get("/api/v1/lifesync/documents/search?q=12345", headers=headers)
    assert meta_resp.status_code == 200
    meta_data = meta_resp.json()
    assert meta_data["total"] >= 1
    assert meta_data["results"][0]["matched_field"] == "metadata"

    # 3. Search with non-matching query
    nomatch_resp = client.get("/api/v1/lifesync/documents/search?q=NonExistentKeywordXYZ", headers=headers)
    assert nomatch_resp.status_code == 200
    assert nomatch_resp.json()["total"] == 0



