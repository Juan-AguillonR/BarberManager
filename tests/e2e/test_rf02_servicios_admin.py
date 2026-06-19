import time  
import uuid

import pytest

from e2e.pages.login_page import LoginPage
from e2e.pages.panel_page import PanelPage
from e2e.pages.servicios_page import ServiciosPage


@pytest.mark.rf02
@pytest.mark.e2e
class TestRF02GestionServiciosAdmin:
    """RF02 - Gestión de servicios por administrador (Selenium)."""

    def test_admin_crea_servicio_y_aparece_en_lista(self, driver, base_url, test_users):
        login = LoginPage(driver, base_url)
        panel = PanelPage(driver, base_url)
        servicios = ServiciosPage(driver, base_url)

        nombre_servicio = f"Corte RF02 {uuid.uuid4().hex[:6]}"
        precio = "35000"

        login.open_login()
        login.login(test_users["admin"]["usuario"], test_users["admin"]["password"])
        time.sleep(2)  

        panel.wait_for_panel()
        panel.open_servicios_module()
        time.sleep(1.5) 

        servicios.wait_for_form()
        servicios.create_service(nombre_servicio, precio)
        time.sleep(2)  

        assert servicios.table_contains_service(nombre_servicio)
        assert "35000" in servicios.find_by_test_id("servicios-tabla").text