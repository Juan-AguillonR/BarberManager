from locust import HttpUser, task, between

class LoginUser(HttpUser):

    wait_time = between(1, 2)

    @task
    def login(self):

        self.client.post(
            "/api/auth/login",
            json={
                "usuario":"gcortes@uniempresarial.edu.co",
                "password":"123456"
            }
        )