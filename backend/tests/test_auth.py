import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
from app.main import app
from app.db.database import get_db, engine, SessionLocal
from app.db.base_class import Base
from app.models.user import User
from app.models.session import Session as AuthSession
from app.models.one_time_token import OneTimeToken
from app.core.security import hash_password, hash_token, create_access_token


@pytest.fixture(autouse=True)
def setup_db():
    """Create fresh in-memory tables before each test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_register_and_verify_email_flow(client: AsyncClient):
    # 1. Register
    reg_data = {
        "full_name": "Test User",
        "email": "test@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
    }
    resp = await client.post("/api/v1/auth/register", json=reg_data)
    assert resp.status_code == 201
    assert "verification" in resp.json()["message"]

    # Retrieve token from DB
    db = SessionLocal()
    user = db.query(User).filter(User.email == "test@example.com").first()
    assert user is not None
    assert user.email_verified_at is None

    token_record = db.query(OneTimeToken).filter(OneTimeToken.user_id == user.id).first()
    assert token_record is not None
    db.close()

    # 2. Login fails before verification
    login_resp = await client.post("/api/v1/auth/login", json={"email": "test@example.com", "password": "Password123!"})
    assert login_resp.status_code == 403
    assert login_resp.json()["error"]["code"] == "email_not_verified"


@pytest.mark.asyncio
async def test_duplicate_registration_no_enumeration(client: AsyncClient):
    reg_data = {
        "full_name": "User One",
        "email": "enumtest@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
    }
    resp1 = await client.post("/api/v1/auth/register", json=reg_data)
    assert resp1.status_code == 201

    # Second registration with same email returns identical 201 response (anti-enumeration)
    resp2 = await client.post("/api/v1/auth/register", json=reg_data)
    assert resp2.status_code == 201
    assert resp1.json() == resp2.json()


@pytest.mark.asyncio
async def test_login_invalid_credentials_timing(client: AsyncClient):
    # Unknown email
    resp1 = await client.post("/api/v1/auth/login", json={"email": "unknown@example.com", "password": "WrongPassword1!"})
    assert resp1.status_code == 401
    assert resp1.json()["error"]["code"] == "invalid_credentials"

    # Register user
    reg_data = {
        "full_name": "Login User",
        "email": "loginuser@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
    }
    await client.post("/api/v1/auth/register", json=reg_data)

    # Wrong password for existing user returns identical 401 message
    resp2 = await client.post("/api/v1/auth/login", json={"email": "loginuser@example.com", "password": "WrongPassword1!"})
    assert resp2.status_code == 401
    assert resp1.json()["error"] == resp2.json()["error"]


@pytest.mark.asyncio
async def test_account_lockout_after_5_failures(client: AsyncClient):
    db = SessionLocal()
    pwd_h = hash_password("Password123!")
    user = User(email="lockout@example.com", password_hash=pwd_h, full_name="Lockout User", email_verified_at=datetime.now(timezone.utc))
    db.add(user)
    db.commit()
    db.close()

    # 4 failed attempts
    for _ in range(4):
        resp = await client.post("/api/v1/auth/login", json={"email": "lockout@example.com", "password": "WrongPassword!"})
        assert resp.status_code == 401

    # 5th failed attempt triggers 423 account_locked
    resp5 = await client.post("/api/v1/auth/login", json={"email": "lockout@example.com", "password": "WrongPassword!"})
    assert resp5.status_code == 423
    assert resp5.json()["error"]["code"] == "account_locked"
    assert "Retry-After" in resp5.headers


@pytest.mark.asyncio
async def test_refresh_token_rotation_and_theft_detection(client: AsyncClient):
    db = SessionLocal()
    pwd_h = hash_password("Password123!")
    user = User(email="refreshtest@example.com", password_hash=pwd_h, full_name="Refresh User", email_verified_at=datetime.now(timezone.utc))
    db.add(user)
    db.commit()
    db.close()

    login_resp = await client.post("/api/v1/auth/login", json={"email": "refreshtest@example.com", "password": "Password123!"})
    assert login_resp.status_code == 200
    cookies = login_resp.cookies
    assert "refresh_token" in cookies
    old_refresh_cookie = cookies["refresh_token"]

    # Perform refresh rotation
    ref_resp = await client.post("/api/v1/auth/refresh", cookies=cookies)
    assert ref_resp.status_code == 200
    assert "access_token" in ref_resp.json()
    new_refresh_cookie = ref_resp.cookies["refresh_token"]
    assert new_refresh_cookie != old_refresh_cookie

    # Attempt to reuse old refresh cookie (theft detection!)
    stolen_cookies = {"refresh_token": old_refresh_cookie}
    theft_resp = await client.post("/api/v1/auth/refresh", cookies=stolen_cookies)
    assert theft_resp.status_code == 401
    assert theft_resp.json()["error"]["code"] == "session_revoked"


@pytest.mark.asyncio
async def test_admin_rbac_guard(client: AsyncClient):
    db = SessionLocal()
    pwd_h = hash_password("Password123!")
    reg_user = User(email="regular@example.com", password_hash=pwd_h, full_name="Regular User", role="user", email_verified_at=datetime.now(timezone.utc))
    admin_user = User(email="adminuser@example.com", password_hash=pwd_h, full_name="Admin User", role="admin", email_verified_at=datetime.now(timezone.utc))
    db.add_all([reg_user, admin_user])
    db.commit()

    reg_token, _ = create_access_token(user_id=str(reg_user.id), role="user", sid="s1")
    admin_token, _ = create_access_token(user_id=str(admin_user.id), role="admin", sid="s2")
    db.close()

    # Regular user gets 403 Forbidden
    reg_resp = await client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {reg_token}"})
    assert reg_resp.status_code == 403
    assert reg_resp.json()["error"]["code"] == "forbidden"

    # Admin user gets 200 OK
    admin_resp = await client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_resp.status_code == 200
    assert "items" in admin_resp.json()
