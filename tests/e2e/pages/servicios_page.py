from e2e.pages.base_page import BasePage


class ServiciosPage(BasePage):
    def wait_for_form(self):
        return self.wait_visible_test_id("servicios-form")

    def create_service(self, nombre: str, precio: str):
        self.wait_for_form()
        self.find_by_test_id("servicio-nombre").clear()
        self.find_by_test_id("servicio-nombre").send_keys(nombre)
        self.find_by_test_id("servicio-precio").clear()
        self.find_by_test_id("servicio-precio").send_keys(precio)
        self.find_by_test_id("servicio-submit").click()

    def table_contains_service(self, nombre: str) -> bool:
        tabla = self.wait_visible_test_id("servicios-tabla")

        return nombre in tabla.text
