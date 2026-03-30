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
