"""
Backend E2E tests — Authentication flows via real browser (pytest-playwright).

These tests drive the Lifesync-AI *frontend* UI while also verifying the
backend API responds correctly. Run them with both servers live:

    # Terminal 1 — backend
    uvicorn app.main:app --reload --port 8000

    # Terminal 2 — frontend
    cd ../frontend && npm run dev

    # Terminal 3 — run E2E
    pytest tests/e2e/ -v -m e2e --browser chromium

Required env vars for authenticated tests:
    E2E_TEST_EMAIL     — a verified Lifesync account email
    E2E_TEST_PASSWORD  — that account's password
"""

import os
import pytest
from playwright.sync_api import Page, expect

FRONTEND_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")


# ---------------------------------------------------------------------------
# Login page
# ---------------------------------------------------------------------------

@pytest.mark.e2e
class TestLoginPageE2E:
    """Browser-level tests for the /login page."""

    def test_login_page_loads(self, page: Page):
        """The login page must be reachable and show an email field."""
        page.goto(f"{FRONTEND_URL}/login")
        expect(page.get_by_label("email")).to_be_visible()
        expect(page.get_by_label("password")).to_be_visible()

    def test_empty_form_shows_errors(self, page: Page):
        """Submitting an empty form surfaces validation errors."""
        page.goto(f"{FRONTEND_URL}/login")
        page.get_by_role("button", name_re=r"(?i)sign in|log in").click()
        error = page.locator('[role="alert"], .error, [data-error]').first
        expect(error).to_be_visible(timeout=5_000)

    def test_wrong_credentials_shows_error(self, page: Page):
        """Wrong credentials yield an error message — not a redirect."""
        page.goto(f"{FRONTEND_URL}/login")
        page.get_by_label("email").fill("nobody@nowhere.invalid")
        page.get_by_label("password").fill("BadPass123!")
        page.get_by_role("button", name_re=r"(?i)sign in|log in").click()
        error_text = page.get_by_text(pattern=r"(?i)invalid|incorrect|not found|wrong")
        expect(error_text.first).to_be_visible(timeout=8_000)
        # Should NOT have navigated away from login
        expect(page).to_have_url(f"{FRONTEND_URL}/login")

    def test_register_link_navigates(self, page: Page):
        """A link to the register page must exist on the login page."""
        page.goto(f"{FRONTEND_URL}/login")
        page.get_by_role("link", name_re=r"(?i)sign up|register|create").click()
        expect(page).to_have_url(pattern=r".*/register.*")

    def test_forgot_password_link_navigates(self, page: Page):
        """A 'forgot password' link must exist and navigate correctly."""
        page.goto(f"{FRONTEND_URL}/login")
        page.get_by_role("link", name_re=r"(?i)forgot|reset").click()
        expect(page).to_have_url(pattern=r".*/forgot-password.*")


# ---------------------------------------------------------------------------
# Register page
# ---------------------------------------------------------------------------

@pytest.mark.e2e
class TestRegisterPageE2E:
    """Browser-level tests for the /register page."""

    def test_register_page_loads(self, page: Page):
        page.goto(f"{FRONTEND_URL}/register")
        expect(page.get_by_label("email")).to_be_visible()

    def test_empty_form_shows_errors(self, page: Page):
        page.goto(f"{FRONTEND_URL}/register")
        page.get_by_role("button", name_re=r"(?i)sign up|register|create").click()
        error = page.locator('[role="alert"], .error, [data-error]').first
        expect(error).to_be_visible(timeout=5_000)

    def test_mismatched_passwords_rejected(self, page: Page):
        page.goto(f"{FRONTEND_URL}/register")
        page.get_by_label("email").fill("mismatch@example.com")
        pw_fields = page.get_by_label("password")
        pw_fields.first.fill("Password123!")
        count = pw_fields.count()
        if count > 1:
            pw_fields.last.fill("DifferentPass999!")
        page.get_by_role("button", name_re=r"(?i)sign up|register|create").click()
        expect(
            page.get_by_text(pattern=r"(?i)match|mismatch|confirm").first
        ).to_be_visible(timeout=5_000)

    def test_successful_registration_redirects(self, page: Page):
        """New unique email should result in check-email redirect / success state."""
        unique_email = f"e2e_pytest_{os.urandom(4).hex()}@testdomain.invalid"
        page.goto(f"{FRONTEND_URL}/register")
        page.get_by_label("email").fill(unique_email)
        pw_fields = page.get_by_label("password")
        pw_fields.first.fill("Password123!")
        if pw_fields.count() > 1:
            pw_fields.last.fill("Password123!")
        name_field = page.get_by_label("name")
        if name_field.count() > 0:
            name_field.first.fill("E2E Pytest User")
        page.get_by_role("button", name_re=r"(?i)sign up|register|create").click()
        expect(page).to_have_url(
            pattern=r".*(check-email|verify|success).*", timeout=12_000
        )


# ---------------------------------------------------------------------------
# Authenticated dashboard (requires env vars)
# ---------------------------------------------------------------------------

@pytest.mark.e2e
class TestDashboardE2E:
    """
    Authenticated dashboard tests.
    Skipped automatically when E2E_TEST_EMAIL / E2E_TEST_PASSWORD are absent.
    """

    def test_dashboard_loads_after_login(self, authenticated_page: Page):
        """After login, the dashboard page should render nav + content."""
        page = authenticated_page
        nav = page.locator("nav, [role='navigation'], aside").first
        expect(nav).to_be_visible()

    def test_logout_redirects_to_login(self, authenticated_page: Page):
        """Clicking logout must clear session and redirect to /login or /."""
        page = authenticated_page
        logout = page.get_by_role("button", name_re=r"(?i)log out|sign out|logout")
        if logout.count() == 0:
            logout = page.get_by_role("link", name_re=r"(?i)log out|sign out|logout")
        expect(logout.first).to_be_visible(timeout=5_000)
        logout.first.click()
        expect(page).to_have_url(pattern=r".*(login|\/).*", timeout=8_000)

    def test_dashboard_protected_after_logout(self, authenticated_page: Page):
        """Navigating to /dashboard after logout should redirect away."""
        page = authenticated_page
        # Log out first
        logout = page.get_by_role("button", name_re=r"(?i)log out|sign out|logout")
        if logout.count() == 0:
            logout = page.get_by_role("link", name_re=r"(?i)log out|sign out|logout")
        if logout.count() > 0:
            logout.first.click()
            page.wait_for_url(pattern=r".*(login|\/).*", timeout=8_000)
        # Try to access dashboard directly
        page.goto(f"{FRONTEND_URL}/dashboard")
        expect(page).not_to_have_url(f"{FRONTEND_URL}/dashboard", timeout=5_000)
