import uuid
from datetime import date, timedelta

import pytest
import requests

from helpers.db import fetch_turnos_from_db


def _normalize_hora(value) -> str:
    return str(value).split(":")[:2]


@pytest.mark.rf06
@pytest.mark.api
class TestRF06ConsultaTurnosAPI:
    """RF06 - Consulta de turnos mediante Base de datos (PyTest)."""

    def test_get_turnos_retorna_200_con_fecha_y_hora(self, api_url, test_users):
        user = test_users["cliente"]
        fecha = (date.today() + timedelta(days=3)).isoformat()
        hora = f"{12 + int(uuid.uuid4().hex[:2], 16) % 6:02d}:15"

        create_response = requests.post(
            f"{api_url}/api/turnos",
            json={"fecha": fecha, "hora": hora, "usuarioId": user.get("usu_id")},
            headers={
                "Content-Type": "application/json",
                "x-user-usuario": user["usuario"],
                "x-user-rol": user["rol"],
            },
            timeout=10,
        )
        assert create_response.status_code == 201

        response = requests.get(f"{api_url}/api/turnos", timeout=10)
        assert response.status_code == 200

        turnos = response.json()
        print("\nTURNOS RECIBIDOS:")
        for t in turnos:
            print(t)
        assert isinstance(turnos, list)
        assert len(turnos) > 0

        creado = next(
            (
                turno
                for turno in turnos
                if str(turno.get("fecha"))[:10] == fecha
                and _normalize_hora(turno.get("hora")) == _normalize_hora(hora)
            ),
            None,
        )
        assert creado is not None
        assert "fecha" in creado
        assert "hora" in creado
        assert _normalize_hora(creado["hora"]) == _normalize_hora(hora)

    def test_get_turnos_coincide_con_registros_en_bd(self, api_url):
        response = requests.get(f"{api_url}/api/turnos", timeout=10)
        assert response.status_code == 200

        turnos_api = response.json()
        turnos_db = fetch_turnos_from_db()

        assert len(turnos_api) == len(turnos_db)

        api_por_id = {turno["id"]: turno for turno in turnos_api}
        for turno_db in turnos_db:
            turno_api = api_por_id.get(turno_db["id"])
            assert turno_api is not None
            assert str(turno_api["fecha"])[:10] == str(turno_db["fecha"])[:10]
            assert _normalize_hora(turno_api["hora"]) == _normalize_hora(turno_db["hora"])
