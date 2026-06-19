import requests

from helpers.db import set_user_role

TEST_PASSWORD = "Test12345"
ADMIN_USER = "admin_test"
CLIENT_USER = "cliente_test"


def register_user(api_url: str, usuario: str, password: str = TEST_PASSWORD) -> bool:
    response = requests.post(
        f"{api_url}/api/auth/register",
        json={"usuario": usuario, "password": password},
        timeout=10,
    )
    return response.status_code in (201, 409)


def ensure_test_users(api_url: str) -> dict:
    for usuario in (ADMIN_USER, CLIENT_USER):
        register_user(api_url, usuario)

    set_user_role(ADMIN_USER, "admin")
    set_user_role(CLIENT_USER, "cliente")

    users = {}
    for key, usuario in (("admin", ADMIN_USER), ("cliente", CLIENT_USER)):
        response = requests.post(
            f"{api_url}/api/auth/login",
            json={"usuario": usuario, "password": TEST_PASSWORD},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()["user"]
        users[key] = {
            "usuario": usuario,
            "password": TEST_PASSWORD,
            "rol": data["rol"],
            "usu_id": data.get("usu_id"),
        }

    return users
