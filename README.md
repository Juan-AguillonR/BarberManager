# Inicio Rápido con Create React App

Este proyecto fue creado con [Create React App](https://github.com/facebook/create-react-app).

## Scripts Disponibles

En la carpeta del proyecto puedes ejecutar:

### `npm start`

Inicia la aplicación en modo desarrollo.\
Abre [http://localhost:3000](http://localhost:3000) para verla en el navegador.

## Configuración de Backend + MySQL

Este proyecto incluye una API con Express en `server/` para conectar la app de React con MySQL.

1. Copia `.env.example` como `.env` y actualiza tus credenciales de MySQL.
2. Asegúrate de que MySQL esté ejecutándose y que la base de datos se llame `barberia`.
3. Instala dependencias:

```bash
npm install
```

4. Ejecuta frontend + backend juntos:

```bash
npm run dev
```

5. URL base de la API en desarrollo:

```text
http://localhost:4000
```

Endpoints de autenticación usados por el frontend:

- `POST /api/auth/register`
- `POST /api/auth/login`

Endpoints de datos usados por el frontend:

- `GET /api/tipos-pago`
- `GET /api/turnos`
- `GET /api/servicios`

La página se recarga automáticamente cuando realizas cambios.\
También puedes ver errores de lint en la consola.

### `npm test`

Ejecuta el runner de pruebas en modo interactivo (watch).\
Consulta la sección de [ejecución de pruebas](https://facebook.github.io/create-react-app/docs/running-tests) para más información.

### `npm run build`

Construye la app para producción en la carpeta `build`.\
Empaqueta React en modo producción y optimiza el rendimiento.

La compilación se minifica y los nombres de archivo incluyen hashes.\
Tu aplicación queda lista para desplegar.

Consulta la sección de [despliegue](https://facebook.github.io/create-react-app/docs/deployment) para más información.

### `npm run eject`

**Nota: esta operación es irreversible. Una vez ejecutes `eject`, no puedes volver atrás.**

Si no estás conforme con la configuración actual, puedes ejecutar `eject` en cualquier momento. Este comando elimina la dependencia de build única.

En su lugar, copiará todos los archivos de configuración y dependencias transitivas (webpack, Babel, ESLint, etc.) dentro de tu proyecto para que tengas control total. Todos los comandos excepto `eject` seguirán funcionando, pero apuntarán a los scripts copiados para que puedas ajustarlos.

No es obligatorio usar `eject`. La configuración por defecto es suficiente para proyectos pequeños y medianos.

## Aprende Más

Puedes aprender más en la [documentación de Create React App](https://facebook.github.io/create-react-app/docs/getting-started).

Para aprender React, revisa la [documentación oficial de React](https://reactjs.org/).

### División de Código

Esta sección está disponible aquí: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analizar el Tamaño del Bundle

Esta sección está disponible aquí: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Crear una Progressive Web App

Esta sección está disponible aquí: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Configuración Avanzada

Esta sección está disponible aquí: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Despliegue

Esta sección está disponible aquí: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` falla al minificar

Esta sección está disponible aquí: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

# Pruebas Automatizadas

El proyecto incluye pruebas automatizadas para validar los requerimientos funcionales utilizando **PyTest**, **Selenium**, **Requests** y **MySQL**.

## Estructura de Pruebas

```text
tests/
│
├── api/
│   ├── test_rf04_auth.py
│   ├── test_rf05_servicios.py
│   └── test_rf06_turnos.py
│
├── e2e/
│   ├── test_rf01_login.py
│   ├── test_rf02_servicios_admin.py
│   ├── test_rf03_reserva_turnos.py
│   └── pages/
│
├── helpers/
│   ├── db.py
│   └── users.py
│
├── conftest.py
└── pytest.ini
```

## Organización

| `api/` Contiene pruebas de backend que validan directamente los endpoints mediante peticiones HTTP.                                                        
| `e2e/` Contiene pruebas End-to-End con Selenium que simulan el comportamiento de un usuario real en el navegador.                                          
| `e2e/pages/` Implementa el patrón Page Object Model (POM), centralizando acciones y elementos de cada pantalla para reutilizarlos entre pruebas.                 
| `helpers/` Funciones auxiliares para acceso a base de datos y gestión de usuarios de prueba.                                                                   
| `conftest.py` Archivo de configuración compartida de PyTest. Define fixtures reutilizables como navegador, usuarios de prueba, URLs y cabeceras de autenticación. 
| `pytest.ini`  Configuración global de PyTest. Define marcadores, ubicación de los tests y reglas de descubrimiento.                                               

## Flujo de Ejecución

Las pruebas de API validan directamente la lógica del backend:

```text
PyTest
   ↓
Requests
   ↓
API Express
   ↓
MySQL
```

Las pruebas End-to-End validan el funcionamiento completo del sistema:

```text
PyTest
   ↓
Selenium
   ↓
Frontend React
   ↓
API Express
   ↓
MySQL
```

## Ejecución de Pruebas

Instalar dependencias:

```bash
pip install -r requirements.txt
```

Ejecutar todas las pruebas:

```bash
pytest
```

Ejecutar únicamente pruebas de API:

```bash
pytest -m api
```

Ejecutar únicamente pruebas End-to-End:

```bash
pytest -m e2e
```

Ejecutar un requerimiento específico:

```bash
pytest -m rf01
pytest -m rf02
pytest -m rf03
pytest -m rf04
pytest -m rf05
pytest -m rf06
```

## Requisitos Previos

Antes de ejecutar las pruebas es necesario:

1. Tener MySQL en ejecución.
2. Tener creada la base de datos `barberia`.
3. Configurar correctamente el archivo `.env`.
4. Levantar frontend y backend:

```bash
npm run dev
```

URLs utilizadas durante las pruebas:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:4000
```

Las pruebas E2E utilizan ChromeDriver administrado automáticamente mediante `webdriver-manager`, por lo que no es necesario instalarlo manualmente.
