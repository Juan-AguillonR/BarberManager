from locust import HttpUser, task, between
from datetime import datetime, timedelta
import random

class CrearTurnoUser(HttpUser):

    wait_time = between(1,2)

    @task
    def crear_turno(self):

        fecha = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

        hora = random.randint(8,18)

        minuto = random.choice([
            "00",
            "15",
            "30",
            "45"
        ])

        self.client.post(
            "/api/turnos",
            json={
                "fecha": fecha,
                "hora": f"{hora}:{minuto}:00",
                "usuarioId": 1
            }
        )