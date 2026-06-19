from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


class BasePage:
    def __init__(self, driver, base_url: str):
        self.driver = driver
        self.base_url = base_url
        self.wait = WebDriverWait(driver, 10)

    def open(self, path: str = "/"):
        self.driver.get(f"{self.base_url}{path}")

    def find_by_test_id(self, test_id: str):
        return self.driver.find_element("css selector", f'[data-testid="{test_id}"]')

    def wait_visible_test_id(self, test_id: str):
        return self.wait.until(
            EC.visibility_of_element_located(("css selector", f'[data-testid="{test_id}"]'))
        )

    def current_path(self) -> str:
        url = self.driver.current_url
        return url.replace(self.base_url, "") or "/"
