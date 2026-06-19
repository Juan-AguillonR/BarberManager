import uuid

import pytest
import requests

from helpers.users import TEST_PASSWORD, register_user


@pytest.mark.rf04
@pytest.mark.api
class TestRF04AutenticacionAPI:
    """RF04 - Validación de autenticación mediante API (PyTest)."""

    def test_login_credenciales_validas_retorna_200(self, api_url, test_users):
        user = test_users["cliente"]
        response = requests.post(
            f"{api_url}/api/auth/login",
            json={"usuario": user["usuario"], "password": user["password"]},
            timeout=10,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["user"]["usuario"] == user["usuario"]

    def test_login_credenciales_invalidas_retorna_401(self, api_url, test_users):
        user = test_users["cliente"]
        response = requests.post(
            f"{api_url}/api/auth/login",
            json={"usuario": user["usuario"], "password": "clave_incorrecta"},
            timeout=10,
        )

        assert response.status_code == 401

    def test_cinco_intentos_fallidos_retorna_429(self, api_url):
        usuario = f"rf04_lockout_{uuid.uuid4().hex[:8]}"
        register_user(api_url, usuario, TEST_PASSWORD)

        for intento in range(5):
            response = requests.post(
                f"{api_url}/api/auth/login",
                json={"usuario": usuario, "password": "clave_incorrecta"},
                timeout=10,
            )

            print(
                f"Intento {intento + 1}:",
                response.status_code,
                response.text
            )

            assert response.status_code == 401

        bloqueado = requests.post(
            f"{api_url}/api/auth/login",
            json={"usuario": usuario, "password": "clave_incorrecta"},
            timeout=10,
        )

        assert bloqueado.status_code == 429
