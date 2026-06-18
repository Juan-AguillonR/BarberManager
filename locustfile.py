from locust import HttpUser, task, between

class BarberUser(HttpUser):

    wait_time = between(1, 3)

    @task
    def consultar_turnos(self):
        self.client.get("/api/turnos")