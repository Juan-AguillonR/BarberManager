import os

import pymysql


def get_db_connection():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "barberia"),
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )


def set_user_role(usuario: str, rol: str) -> None:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "UPDATE usuarios_app SET rol = %s WHERE usuario = %s",
                (rol, usuario),
            )


def fetch_turnos_from_db():
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT tur_id AS id, tur_fecha AS fecha, tur_hora AS hora FROM turnos ORDER BY tur_id ASC"
            )
            return cursor.fetchall()
