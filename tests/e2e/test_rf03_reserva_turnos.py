from datetime import date, timedelta
import time  
import uuid

import pytest
import requests

from e2e.pages.cliente_page import ClientePage
from e2e.pages.login_page import LoginPage
from e2e.pages.panel_page import PanelPage


@pytest.fixture
def servicio_para_turno(api_url, admin_headers):
    nombre = f"Servicio RF03 {uuid.uuid4().hex[:6]}"
    response = requests.post(
        f"{api_url}/api/servicios",
        json={"tipo": nombre, "precio": 28000},
        headers=admin_headers,
        timeout=10,
    )
    assert response.status_code == 201
    return nombre


@pytest.mark.rf03
@pytest.mark.e2e
class TestRF03ReservaTurnos:
    """RF03 - Reserva de turnos (Selenium)."""

    def test_cliente_reserva_turno_con_exito(
        self, driver, base_url, test_users, servicio_para_turno
    ):
        login = LoginPage(driver, base_url)
        panel = PanelPage(driver, base_url)
        cliente = ClientePage(driver, base_url)

        fecha = (date.today() + timedelta(days=2)).isoformat()
        hora = f"{10 + int(uuid.uuid4().hex[:2], 16) % 8:02d}:30"

        login.open_login()
        login.login(test_users["cliente"]["usuario"], test_users["cliente"]["password"])
        time.sleep(2) 

        panel.wait_for_panel()
        panel.open_cliente_module()
        time.sleep(1.5)  

        cliente.wait_for_form()
        cliente.select_service_by_name(servicio_para_turno)
        cliente.book_appointment(fecha, hora)
        cliente.skip_payment_modal()
        time.sleep(2)  

        mensaje = cliente.get_status_message().lower()
        assert "turno agendado" in mensaje