import uuid

import pytest
import requests


@pytest.mark.rf05
@pytest.mark.api
class TestRF05GestionServiciosAPI:
    """RF05 - Gestión de servicios mediante API (PyTest)."""

    def test_crear_servicio_retorna_201(self, api_url, admin_headers):
        nombre = f"Servicio RF05 {uuid.uuid4().hex[:6]}"
        response = requests.post(
            f"{api_url}/api/servicios",
            json={"tipo": nombre, "precio": 42000},
            headers=admin_headers,
            timeout=10,
        )

        assert response.status_code == 201
        assert "creado" in response.json()["message"].lower()

    def test_servicio_creado_aparece_en_get(self, api_url, admin_headers):
        nombre = f"Servicio RF05 GET {uuid.uuid4().hex[:6]}"
        create_response = requests.post(
            f"{api_url}/api/servicios",
            json={"tipo": nombre, "precio": 51000},
            headers=admin_headers,
            timeout=10,
        )
        assert create_response.status_code == 201

        list_response = requests.get(f"{api_url}/api/servicios", timeout=10)
        assert list_response.status_code == 200

        servicios = list_response.json()
        tipos = [item.get("tipo") for item in servicios]
        assert nombre in tipos

    def test_solo_admin_puede_crear_servicios(self, api_url, cliente_headers):
        response = requests.post(
            f"{api_url}/api/servicios",
            json={"tipo": "Servicio no permitido", "precio": 10000},
            headers=cliente_headers,
            timeout=10,
        )

        assert response.status_code == 403
