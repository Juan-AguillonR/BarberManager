from selenium.webdriver.support.ui import Select
from selenium.webdriver.common.keys import Keys
from datetime import datetime

from e2e.pages.base_page import BasePage


class ClientePage(BasePage):
    def wait_for_form(self):
        return self.wait_visible_test_id("turno-form")

    def select_service_by_name(self, nombre: str):
        select = Select(self.find_by_test_id("turno-servicio"))

        for option in select.options:
            if nombre in option.text:
                select.select_by_visible_text(option.text)
                return

        raise AssertionError(f"No se encontró el servicio '{nombre}' en el selector.")

    def select_first_available_service(self):
        select = Select(self.find_by_test_id("turno-servicio"))
        options = [opt for opt in select.options if opt.get_attribute("value")]
        if not options:
            raise AssertionError("No hay servicios disponibles para seleccionar.")
        select.select_by_value(options[0].get_attribute("value"))

    def book_appointment(self, fecha: str, hora: str):
        self.wait_for_form()

        fecha_obj = datetime.strptime(fecha, "%Y-%m-%d")
        fecha_chrome = fecha_obj.strftime("%m%d%Y")

        campo_fecha = self.find_by_test_id("turno-fecha")
        campo_fecha.click()
        campo_fecha.send_keys(Keys.CONTROL + "a")
        campo_fecha.send_keys(fecha_chrome)

        hora_chrome = hora.replace(":", "")
        campo_hora = self.find_by_test_id("turno-hora")
        campo_hora.click()
        campo_hora.send_keys(Keys.CONTROL + "a")
        campo_hora.send_keys(hora_chrome)

        self.find_by_test_id("turno-submit").click()

    def skip_payment_modal(self):
        self.wait_visible_test_id("pago-saltar").click()

    def get_status_message(self) -> str:
        return self.wait_visible_test_id("turno-status").text
