from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from e2e.pages.base_page import BasePage


class PanelPage(BasePage):
    def wait_for_panel(self):
        self.wait.until(EC.url_contains("/panel"))
        return self.wait_visible_test_id("panel-principal")

    def open_servicios_module(self):
        button = self.wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(normalize-space(), 'Ver Servicios')]")
            )
        )
        button.click()
        self.wait.until(EC.url_contains("/servicios"))

    def open_cliente_module(self):
        button = self.wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(normalize-space(), 'Ver Mi Panel')]")
            )
        )
        button.click()
        self.wait.until(EC.url_contains("/cliente"))
