"""
Shared Playwright fixtures for backend E2E tests.

Environment variables:
  FRONTEND_BASE_URL   — default: http://localhost:3000
  BACKEND_BASE_URL    — default: http://localhost:8000
  E2E_TEST_EMAIL      — a verified test user email  (for authenticated fixtures)
  E2E_TEST_PASSWORD   — that user's password         (for authenticated fixtures)
"""

import os
import pytest
from playwright.sync_api import Page, Browser, BrowserContext, Playwright

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

FRONTEND_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
BACKEND_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")
TEST_EMAIL = os.getenv("E2E_TEST_EMAIL", "")
TEST_PASSWORD = os.getenv("E2E_TEST_PASSWORD", "")


# ---------------------------------------------------------------------------
# Base URL fixture — shared across all e2e tests
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def base_url() -> str:
    """Frontend base URL."""
    return FRONTEND_URL


@pytest.fixture(scope="session")
def api_base_url() -> str:
    """Backend API base URL."""
    return BACKEND_URL


# ---------------------------------------------------------------------------
# Authenticated browser context
# ---------------------------------------------------------------------------

@pytest.fixture(scope="function")
def authenticated_page(page: Page) -> Page:
    """
    Returns a Playwright Page already logged into the Lifesync-AI frontend.

    Skips the test if E2E_TEST_EMAIL / E2E_TEST_PASSWORD are not set.
    """
    if not TEST_EMAIL or not TEST_PASSWORD:
        pytest.skip("Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD to run authenticated E2E tests")

    page.goto(f"{FRONTEND_URL}/login")
    page.get_by_label("email").fill(TEST_EMAIL)
    page.get_by_label("password").fill(TEST_PASSWORD)
    page.get_by_role("button", name_re=r"(?i)sign in|log in").click()
    page.wait_for_url(f"{FRONTEND_URL}/dashboard**", timeout=15_000)
    return page
