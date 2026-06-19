import uuid

import pytest
import time

from e2e.pages.cliente_page import ClientePage
from e2e.pages.login_page import LoginPage
from e2e.pages.panel_page import PanelPage
from e2e.pages.servicios_page import ServiciosPage


@pytest.mark.rf01
@pytest.mark.e2e
class TestRF01InicioSesion:
    """RF01 - Inicio de sesión de usuario (Selenium)."""

    def test_login_exitoso_redirige_al_panel(self, driver, base_url, test_users):
        login = LoginPage(driver, base_url)
        panel = PanelPage(driver, base_url)

        login.open_login()
        time.sleep(1)
        login.login(test_users["cliente"]["usuario"], test_users["cliente"]["password"])
        time.sleep(2)
        panel.wait_for_panel()
        time.sleep(2)
        assert "/panel" in driver.current_url
        assert panel.find_by_test_id("panel-titulo").text == "Panel de Control"

    def test_password_incorrecta_muestra_error(self, driver, base_url, test_users):
        login = LoginPage(driver, base_url)

        login.open_login()
        time.sleep(1)
        login.login(test_users["cliente"]["usuario"], "clave_incorrecta")
        time.sleep(2)
        error = login.get_error_message()
        assert "inválid" in error.lower() or "credencial" in error.lower()
        assert "/panel" not in driver.current_url

    def test_ruta_protegida_redirige_a_login(self, driver, base_url):
        login = LoginPage(driver, base_url)

        driver.get(f"{base_url}/turnos")
        time.sleep(2)

        assert login.is_login_page_visible()
        assert "/panel" not in driver.current_url
        assert login.find_by_test_id("login-title").text == "Iniciar sesión"
