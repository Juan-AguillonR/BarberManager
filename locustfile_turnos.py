from locust import HttpUser, task, between

class TurnosUser(HttpUser):

    wait_time = between(1, 2)

    @task
    def ver_turnos(self):

        self.client.get("/api/turnos")