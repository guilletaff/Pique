# Plan del proyecto: Pique

Este documento está pensado para que cualquier miembro del grupo, o su asistente de IA, entienda el proyecto entero sin más explicaciones: qué se pide, qué app estamos haciendo, cómo está montada, qué está hecho y qué falta.

## Contexto

### El trabajo que se pide

Asignatura de Programación Web (CUNEF, 4.º de Ingeniería Informática). Hay que desarrollar una aplicación web completa sobre una temática libre, en grupos de tres personas.

Requisitos del enunciado:
- Git y GitHub para el control de versiones y la colaboración, con buenas prácticas de desarrollo en equipo.
- Frontend con HTML, CSS y JavaScript.
- Backend con Node.js y Express.js, con una estructura organizada (por ejemplo, MVC).
- Persistencia en una base de datos relacional o NoSQL.
- Autenticación, autorización y medidas básicas de seguridad web.
- Despliegue con contenedores (Docker).
- Documentación básica de la API y del proceso de instalación y uso.

Entregables:
- Repositorio en GitHub con el código fuente, la documentación y los scripts necesarios para ejecutarlo.
- Informe técnico en PDF: descripción del sistema, arquitectura, base de datos, medidas de seguridad y conclusiones.
- Presentación de 15 minutos con demostración funcional.
- Todo se sube a Canvas en una carpeta comprimida, y la sube solo uno de los miembros. Los miembros del grupo se indican en Canvas > Personas > Trabajo en grupo.

### La aplicación: Pique

Una web para organizar una liga de pádel entre amigos. El grupo la ha pensado a partir de una liga de pádel real que organiza uno de los miembros. Los usuarios se registran, reservan pistas, apuntan los resultados de sus partidos y consultan un ranking.

Qué puede hacer cada tipo de usuario:
- **Jugador** (rol por defecto al registrarse): ver las pistas, reservar una pista en una franja horaria, ver y cancelar sus propias reservas, registrar partidos y ver el ranking.
- **Administrador** (rol `admin`): todo lo anterior, y además dar de alta, editar y desactivar pistas.

Reglas de negocio importantes:
- Dos reservas de la misma pista no pueden solaparse en el tiempo. La API lo comprueba con una consulta antes de insertar y devuelve un `409` con un error claro.
- Un jugador solo puede modificar o cancelar sus propias reservas.
- Un partido es de 2 contra 2: 4 jugadores distintos, repartidos en dos equipos, y un resultado en sets sin empate.
- El ranking se calcula a partir de los partidos registrados (por ejemplo, 3 puntos por victoria).
- Nadie puede hacerse administrador desde la API; el rol solo se cambia directamente en la base de datos.

### Decisiones técnicas ya tomadas

- **Backend**: Node.js 22 con Express, estructura MVC: `routes` (direcciones), `controllers` (lógica), `models` (consultas SQL) y `middlewares`.
- **Base de datos**: PostgreSQL 16, con el esquema en `db/init.sql`, que Docker carga solo la primera vez. Acceso con la librería `pg` y consultas parametrizadas (`$1`, `$2`...), nunca concatenando texto, para evitar inyección SQL.
- **Autenticación**: JWT (caduca a las 2 horas) que la API devuelve en el JSON del login y el registro; el frontend lo guarda en `sessionStorage` y lo envía en la cabecera `Authorization: Bearer <token>`. Contraseñas cifradas con `bcrypt` (12 rondas).
- **Autorización**: por rol, con los middlewares `verificarToken` y `requiereRol` (ver la Fase 1).
- **Seguridad**: cabeceras con Helmet, validación de datos de entrada en el controlador, y errores con un mensaje genérico.
- **Reservas sin solapes**: se comprueban en la API (`haySolape` en `reserva.model.js`) con un `SELECT` antes de insertar.
- **Documentación de la API**: OpenAPI 3 en `docs/openapi.yaml`, servida con Swagger UI (`swagger-ui-express` + `yamljs`) en `/api-docs`; además, `docs/API.md`.
- **Frontend**: HTML, CSS y JavaScript sin frameworks, servido por el propio Express desde `src/public`.
- **Despliegue**: Docker Compose con dos servicios, `app` (Node) y `db` (PostgreSQL).

### Convenciones del código

- Nombres de tablas, columnas, variables y comentarios en español.
- Todas las rutas de la API cuelgan de `/api/...`, por ejemplo `/api/pistas`.
- Las respuestas son JSON. Los errores tienen la forma `{ "error": "mensaje" }` con el código HTTP adecuado: 400 datos no válidos, 401 sin sesión, 403 sin permiso, 404 no existe, 409 conflicto, 500 error del servidor.
- Nunca devolver `password_hash` en una respuesta.
- Cada módulo nuevo sigue el mismo patrón que `auth`: `src/models/x.model.js`, `src/controllers/x.controller.js`, `src/routes/x.routes.js`, y se monta en `src/app.js` con `app.use('/api/x', require('./routes/x.routes'))`.
- Las variables secretas van en `.env`, que no se sube a Git. Las que hacen falta están en `.env.example`.

### Estructura del repositorio

```
db/init.sql                  esquema de la base de datos
src/
  config/db.js               conexión a PostgreSQL (pool)
  controllers/               lógica de cada petición
  models/                    consultas SQL
  routes/                    rutas de la API
  middlewares/               autenticación y autorización
  public/                    frontend (HTML, CSS, JS)
  scripts/seed.js            datos de ejemplo (npm run seed)
  app.js                     configuración de Express y montaje de rutas
  server.js                  arranque del servidor
Dockerfile
docker-compose.yml
.env.example
docs/                        API.md, openapi.yaml, informe (md y pdf), guion de la presentación, capturas
PLAN.md                      este documento
```

### Entorno de trabajo del grupo

Se trabaja en Windows con Visual Studio Code, PowerShell, Git, Node.js y Docker Desktop. Los comandos de este documento están pensados para esa terminal. Si se añade una librería con `npm install`, hay que volver a lanzar `docker compose up --build` para que Docker la incluya.

Si usáis un asistente de IA para programar, conviene pedirle que trabaje sobre vuestra propia rama, que siga las convenciones de arriba y que no toque los archivos de otra fase sin avisar.

## Estado y fases

Estado: `[x]` hecho, `[ ]` pendiente.

### Resumen

| Fase | Qué es | Estado |
|------|--------|--------|
| 0 | Preparación (repo, Docker, esqueleto) | Hecha |
| 1 | Base de datos y autenticación | Hecha |
| 2 | Pistas y reservas | Hecha |
| 3 | Partidos y ranking | Hecha |
| 4 | Frontend | Hecha |
| 5 | Seguridad y documentación de la API | Hecha |
| 6 | Entrega: informe, presentación y Canvas | Informe y guion hechos; faltan diapositivas y Canvas |

Las fases 0, 1 y 2 están en `main`. Las fases 3, 4 y 5 están en la rama `feature/ranking`, pendientes de Pull Request y revisión.

## Fase 0. Preparación (hecha)

- [x] Repositorio en GitHub y esqueleto del proyecto (carpetas MVC, Express, Helmet).
- [x] Docker: `Dockerfile` y `docker-compose.yml` con la app y PostgreSQL.
- [x] Archivo `.env.example` con las variables necesarias.
- [x] README con la estructura y el flujo de Git.

## Fase 1. Base de datos y autenticación — hecha

Rama: `feature/auth`

Hecho:
- [x] Esquema de la base de datos en `db/init.sql` (se carga solo al arrancar Docker).
- [x] Tablas: `usuarios`, `pistas`, `reservas`, `partidos`, `partido_jugadores`.
- [x] Las reservas no pueden solaparse en la misma pista (comprobado en la API antes de insertar).
- [x] Registro, login, logout y `/api/auth/me`.
- [x] Contraseñas cifradas con bcrypt.
- [x] Sesión con JWT enviado en la cabecera `Authorization: Bearer`.
- [x] Roles `jugador` y `admin`; nadie puede registrarse como admin desde fuera.
- [x] Middleware de autenticación y de autorización por rol.

- [x] Pull Request de la autenticación fusionada en `main`.
- [x] Registro, login y `/api/auth/me` probados en local con Docker.
- [x] Forma de crear un usuario administrador (ver más abajo).

### Cómo crear un administrador

Hay que registrarse primero como usuario normal y después cambiar el rol directamente en la base de datos, con Docker en marcha:

```
docker compose exec db psql -U padel -d padel -c "UPDATE usuarios SET rol='admin' WHERE email='tu@email.com';"
```

Después hay que volver a iniciar sesión, porque el rol va dentro del token.

### Cómo usar la autenticación en vuestras rutas

```js
const { verificarToken, requiereRol } = require('../middlewares/auth.middleware');

// Cualquier usuario con sesión iniciada
router.get('/', verificarToken, controlador.listar);

// Solo administradores
router.post('/', verificarToken, requiereRol('admin'), controlador.crear);
```

Dentro del controlador, el usuario que hace la petición está en `req.usuario.id` y `req.usuario.rol`.

### Endpoints disponibles

| Método | Ruta | Qué hace | Acceso |
|--------|------|----------|--------|
| POST | `/api/auth/register` | Crear cuenta | Público |
| POST | `/api/auth/login` | Iniciar sesión | Público |
| POST | `/api/auth/logout` | Cerrar sesión | Público |
| GET | `/api/auth/me` | Datos del usuario actual | Con sesión |

### Tablas

- `usuarios`: id, nombre, email (único), password_hash, rol, creado_en
- `pistas`: id, nombre (único), descripcion, activa
- `reservas`: id, usuario_id, pista_id, inicio, fin
- `partidos`: id, fecha, creado_por, sets_equipo1, sets_equipo2
- `partido_jugadores`: partido_id, usuario_id, equipo (1 o 2)

## Fase 2. Pistas y reservas — hecha

Rama: `feature/reservas`

- [x] Modelo, controlador y rutas de pistas: listar, ver, crear, editar y desactivar.
- [x] Crear, editar y desactivar pistas solo para `admin`. Una pista no se borra, se marca como no activa para no perder sus reservas. Los jugadores solo ven las pistas activas.
- [x] Reservas: un jugador reserva una pista en una franja horaria (máximo 3 horas, no en el pasado, solo pistas activas).
- [x] Si la franja ya está ocupada, la API devuelve `409` (consulta de solape antes de insertar).
- [x] Ver las reservas propias y cancelarlas. Un jugador no puede cancelar las de otro; un administrador sí puede.
- [x] Ver las franjas ocupadas de una pista en un día.
- [x] Probado en local con Docker.

Pendiente de esta fase:
- [x] Que un compañero revise y fusione la Pull Request de `feature/reservas`.

### Endpoints de la fase 2

Todos necesitan sesión iniciada.

| Método | Ruta | Qué hace | Acceso |
|--------|------|----------|--------|
| GET | `/api/pistas` | Listar pistas (el admin ve también las inactivas) | Con sesión |
| GET | `/api/pistas/:id` | Ver una pista | Con sesión |
| POST | `/api/pistas` | Crear pista (`nombre`, `descripcion`) | Admin |
| PUT | `/api/pistas/:id` | Editar pista (`nombre`, `descripcion`, `activa`) | Admin |
| DELETE | `/api/pistas/:id` | Desactivar pista | Admin |
| POST | `/api/reservas` | Reservar (`pista_id`, `inicio`, `fin` en formato ISO) | Con sesión |
| GET | `/api/reservas/mias` | Mis reservas | Con sesión |
| GET | `/api/reservas?pista_id=1&fecha=2026-12-10` | Franjas ocupadas de una pista en un día | Con sesión |
| DELETE | `/api/reservas/:id` | Cancelar una reserva | Dueño o admin |

## Fase 3. Partidos y ranking — hecha

Rama: `feature/ranking`

- [x] Registrar un partido: 4 jugadores (2 equipos) y el resultado en sets (en una transacción).
- [x] Validar que son 4 jugadores distintos, que existen, que no hay empate (sets de 0 a 3) y que la fecha no es futura.
- [x] Un jugador solo registra partidos en los que juega; borrar, solo quien lo registró o un admin.
- [x] Listar partidos y ver el historial de un jugador.
- [x] Calcular el ranking (3 puntos por victoria, desempate por diferencia de sets) y exponerlo en la API.
- [x] `GET /api/usuarios` (solo id y nombre) para elegir jugadores.
- [ ] Que un compañero revise y fusione la Pull Request de `feature/ranking`.

### Endpoints de la fase 3

Todos necesitan sesión iniciada. Detalle y ejemplos en `docs/API.md`.

| Método | Ruta | Qué hace | Acceso |
|--------|------|----------|--------|
| GET | `/api/usuarios` | Jugadores (id y nombre) | Con sesión |
| GET | `/api/partidos` | Listar partidos (`?usuario_id=3` para el historial de un jugador) | Con sesión |
| GET | `/api/partidos/:id` | Ver un partido | Con sesión |
| POST | `/api/partidos` | Registrar (`fecha`, `equipo1: [id, id]`, `equipo2: [id, id]`, `sets_equipo1`, `sets_equipo2`) | Jugador del partido o admin |
| DELETE | `/api/partidos/:id` | Borrar un partido | Quien lo registró o admin |
| GET | `/api/ranking` | Clasificación | Con sesión |

## Fase 4. Frontend — hecha

Carpeta: `src/public`

- [x] Páginas de registro e inicio de sesión (`index.html`).
- [x] Listado de pistas y formulario de reserva con las franjas ocupadas del día (`pistas.html`).
- [x] Mis reservas, próximas y pasadas, con cancelación (`reservas.html`).
- [x] Registro de partidos con historial filtrable (`partidos.html`) y tabla de ranking (`ranking.html`).
- [x] Mostrar u ocultar opciones según el rol (panel de administración de pistas en `pistas.html`).
- [x] Funciones comunes en `js/comun.js`; textos siempre con `textContent` (sin XSS) y sin scripts inline (CSP de Helmet).

## Fase 5. Seguridad y documentación de la API (todo el grupo) — hecha

- [x] Revisar la seguridad: validación de tipos y longitudes, Helmet con CSP, JWT en cabecera `Authorization: Bearer`, JSON limitado a 10 kB, errores genéricos en JSON, `JWT_SECRET` obligatorio, PostgreSQL solo en `127.0.0.1`.
- [x] Documentar la API: `docs/openapi.yaml` con Swagger UI en `/api-docs`, `docs/API.md` y tabla resumen en el README.
- [x] README con instalación y uso paso a paso.
- [x] Datos de ejemplo para la demo: `docker compose exec app npm run seed` (contraseña `padel1234`, admin `admin@padel.local`).
- [x] Probado `docker compose down -v` + `docker compose up --build` desde cero, con el seed dos veces y las pruebas de la API.

## Fase 6. Entrega (todo el grupo) — en curso

- [x] Informe técnico: `docs/informe.md` y `docs/informe.pdf`. Con nombres y fecha.
- [x] Guion de la presentación y de la demo: `docs/presentacion.md`.
- [ ] Diapositivas de la presentación (15 minutos con demostración funcional).
- [ ] Indicar los miembros del grupo en Canvas.
- [ ] Subir a Canvas la carpeta comprimida (código, documentación, informe y presentación). La sube solo uno de los miembros.

## Revisión según los apuntes

Se contrastó el código con los apuntes de clase (temas 01–07) y se sustituyó lo que no se había dado en clase por lo que sí:

| En el código | ¿Visto en clase? | Decisión |
| --- | --- | --- |
| Express, rutas, controladores, MVC, `express.json`, `express.static`, middleware de errores | Sí (tema 03) | Se mantiene |
| `require` / `module.exports` (CommonJS) | Sí (tema 03) | Se mantiene |
| PostgreSQL con `pg`, consultas parametrizadas `$1`, `dotenv`, `.env` | Sí (temas 05 y 06) | Se mantiene |
| Transacción `BEGIN`/`COMMIT`/`ROLLBACK` al crear un partido | Sí (ACID, tema 05) | Se mantiene |
| `bcrypt` | Sí (tema 06) | Se mantiene; `saltRounds` subido a **12** como en los apuntes |
| `jsonwebtoken` (JWT) | Sí (tema 06) | Se mantiene, pero cambia dónde viaja el token |
| JWT guardado en cookie con `cookie-parser` | `cookie-parser` no; el ejemplo de clase usa `Authorization: Bearer` | **Sustituido** por cabecera `Authorization: Bearer <token>` y token en `sessionStorage` |
| `express-rate-limit` (límite de intentos) | No | **Eliminado** |
| Restricción `EXCLUDE USING gist` + extensión `btree_gist` | No | **Sustituido** por comprobación de solapes con un `SELECT` antes de insertar |
| Middlewares de autorización por rol (`requiereRol`) y por propietario | Sí (RBAC y propiedad, tema 06) | Se mantiene |
| `helmet` (con CSP) | Sí (temas 03 y 06) | Se mantiene |
| Documentación en `docs/API.md` (Markdown) | Clase usa OpenAPI (YAML) + Swagger UI con `swagger-ui-express` y `yamljs` | **Añadido** `docs/openapi.yaml`, servido en `/api-docs` (se conserva `API.md`) |
| Docker: `Dockerfile` con `USER node`, `.dockerignore`, Compose con volumen y healthcheck | Sí (tema 07) | Se mantiene |
| Frontend HTML/CSS/JS, `fetch`, `async/await`, `textContent`, `addEventListener`, `sessionStorage` | Sí (temas 02 y 03) | Se mantiene |
| `src/scripts/seed.js` con `npm run seed` | `npm run` sí (tema 03) | Se mantiene, adaptado a que ya no hay `EXCLUDE` |

## Reglas de trabajo en equipo

- `main` está protegida: solo se entra con Pull Request revisada por otro miembro.
- Una rama por tarea (`feature/...`) y commits pequeños con mensaje claro (`feat: ...`, `fix: ...`, `docs: ...`).
- Antes de empezar cada día: `git pull origin main`.
- No subir nunca el archivo `.env`.

## Cómo arrancar el proyecto

```
git clone https://github.com/guilletaff/Pique.git
cd Pique
cp .env.example .env      # en Windows: copiar y renombrar el archivo
docker compose up --build
```

Comprobar: http://localhost:3000/api/health debe responder `{"status":"ok"}`.
