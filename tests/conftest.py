import os
import sys
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

sys.path.insert(0, str(Path(__file__).resolve().parent))

from helpers.users import ensure_test_users

API_URL = os.getenv("REACT_APP_API_URL", "http://localhost:4000")
BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:3000")


def _api_is_running() -> bool:
    try:
        response = requests.get(f"{API_URL}/api/health", timeout=3)
        return response.status_code == 200
    except requests.RequestException:
        return False


def _frontend_is_running() -> bool:
    try:
        response = requests.get(BASE_URL, timeout=3)
        return response.status_code == 200
    except requests.RequestException:
        return False


@pytest.fixture(scope="session")
def api_url():
    if not _api_is_running():
        pytest.skip("La API no está disponible. Ejecuta: npm run dev")
    return API_URL


@pytest.fixture(scope="session")
def base_url():
    if not _frontend_is_running():
        pytest.skip("El frontend no está disponible. Ejecuta: npm run dev")
    return BASE_URL


@pytest.fixture(scope="session")
def test_users(api_url):
    return ensure_test_users(api_url)


@pytest.fixture
def api_session():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def admin_headers(test_users):
    user = test_users["admin"]
    return {
        "Content-Type": "application/json",
        "x-user-rol": user["rol"],
        "x-user-usuario": user["usuario"],
    }


@pytest.fixture
def cliente_headers(test_users):
    user = test_users["cliente"]
    return {
        "Content-Type": "application/json",
        "x-user-rol": user["rol"],
        "x-user-usuario": user["usuario"],
    }


@pytest.fixture
def driver(base_url):
    options = Options()
    if os.getenv("HEADLESS", "true").lower() == "true":
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1280,900")

    service = Service(ChromeDriverManager().install())
    browser = webdriver.Chrome(service=service, options=options)
    browser.implicitly_wait(5)
    browser.get(base_url)

    yield browser

    browser.quit()
