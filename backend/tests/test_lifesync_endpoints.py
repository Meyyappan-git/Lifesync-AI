import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.database import get_db
from app.db.base_class import Base
from app.services.folder_classifier import parse_metadata_from_text, classify_folder_for_doc

# Setup a test sqlite DB in memory
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
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
    yield
    Base.metadata.drop_all(bind=engine)

def test_parse_metadata_from_text_expiry():
    text = "Valid Until: 2027-12-31. Policy No: POL-99281."
    meta = parse_metadata_from_text(text)
    assert meta.get("expiry_date") == "2027-12-31"
    assert meta.get("policy_number") == "POL-99281"

def test_classify_folder_for_doc():
    assert classify_folder_for_doc("passport_renewal.pdf", "passport visa", {}) == "Travel"
    assert classify_folder_for_doc("health_report.pdf", "blood report prescription doctor", {}) == "Health"
    assert classify_folder_for_doc("bank_statement.pdf", "bank account statement balance tax", {}) == "Finance"


def test_auth_and_lifesync_flow():
    # 1. Register user
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": "testuser@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "first_name": "Test",
        "last_name": "User"
    })
    assert reg_resp.status_code == 201

    # 2. Login
    login_resp = client.post("/api/v1/auth/login", data={
        "username": "testuser@example.com",
        "password": "Password123!"
    })
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Get Dashboard
    dash_resp = client.get("/api/v1/lifesync/dashboard", headers=headers)
    assert dash_resp.status_code == 200
    dash = dash_resp.json()
    assert "health_score" in dash
    assert "folder_stats" in dash

    # 4. Update Emergency Profile
    ep_resp = client.put("/api/v1/lifesync/emergency-profile", json={
        "blood_group": "O+",
        "medical_conditions": "None",
        "emergency_contact_name": "Emergency Person",
        "emergency_contact_phone": "1234567890"
    }, headers=headers)
    assert ep_resp.status_code == 200

    # 5. Get Emergency Profile
    get_ep_resp = client.get("/api/v1/lifesync/emergency-profile", headers=headers)
    assert get_ep_resp.status_code == 200
    ep_data = get_ep_resp.json()
    assert ep_data["profile"]["blood_group"] == "O+"
    assert ep_data["profile"]["emergency_contact_name"] == "Emergency Person"

    # 6. Get Insights
    ins_resp = client.get("/api/v1/lifesync/insights", headers=headers)
    assert ins_resp.status_code == 200
    ins_data = ins_resp.json()
    assert "alerts" in ins_data
    assert "reminders" in ins_data

    # 7. Test RAG Assistant query endpoint
    rag_resp = client.post("/api/v1/lifesync/assistant/query", json={
        "query": "What emergency contact details are saved?"
    }, headers=headers)
    assert rag_resp.status_code == 200
    rag_data = rag_resp.json()
    assert "answer" in rag_data
    assert "retrieved_chunks" in rag_data
    assert "sources" in rag_data


