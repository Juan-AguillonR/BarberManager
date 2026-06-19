from e2e.pages.base_page import BasePage


class LoginPage(BasePage):
    def open_login(self):
        self.open("/")

    def login(self, usuario: str, password: str):
        self.wait_visible_test_id("login-form")
        self.find_by_test_id("login-usuario").clear()
        self.find_by_test_id("login-usuario").send_keys(usuario)
        self.find_by_test_id("login-password").clear()
        self.find_by_test_id("login-password").send_keys(password)
        self.find_by_test_id("login-submit").click()

    def get_error_message(self) -> str:
        return self.wait_visible_test_id("login-error").text

    def is_login_page_visible(self) -> bool:
        try:
            self.wait_visible_test_id("login-page")
            return True
        except Exception:
            return False
