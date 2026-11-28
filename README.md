# Pique

Pique es una aplicación web para organizar una liga de pádel entre amigos: los jugadores se registran, reservan pistas, apuntan los resultados de sus partidos y consultan el ranking.

- **Backend**: Node.js 22 + Express, estructura MVC.
- **Base de datos**: PostgreSQL 16.
- **Frontend**: HTML, CSS y JavaScript sin frameworks, servido por el propio Express.
- **Despliegue**: Docker Compose (servicio `app` y servicio `db`).

## Funcionalidades

| | Jugador | Admin |
|---|:---:|:---:|
| Registrarse, iniciar y cerrar sesión | ✔ | ✔ |
| Ver pistas y su disponibilidad por día | ✔ | ✔ |
| Reservar una pista (sin solapamientos, máximo 3 h) | ✔ | ✔ |
| Ver y cancelar sus reservas | ✔ | ✔ (también las de otros) |
| Registrar partidos 2 contra 2 y ver el historial | ✔ | ✔ |
| Ver el ranking (3 puntos por victoria) | ✔ | ✔ |
| Crear, editar, desactivar y reactivar pistas | | ✔ |

## Instalación y puesta en marcha

### Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) arrancado.
- Git.

### Pasos

1. Clonar el repositorio:

   ```
   git clone https://github.com/guilletaff/Pique.git
   cd Pique
   ```

2. Crear el archivo `.env` a partir del ejemplo y cambiar las claves:

   ```
   cp .env.example .env
   ```

   En PowerShell: `Copy-Item .env.example .env`. Dentro, cambiar `DB_PASSWORD` y poner en `JWT_SECRET` un texto largo y aleatorio (por ejemplo, el resultado de `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

3. Arrancar todo:

   ```
   docker compose up --build
   ```

   La primera vez, PostgreSQL crea las tablas a partir de `db/init.sql`.

4. Comprobar que funciona: http://localhost:3000/api/health debe responder `{"status":"ok"}`.

5. Abrir la aplicación: http://localhost:3000

### Datos de ejemplo (opcional, recomendado para la demo)

Con Docker en marcha, en otra terminal:

```
docker compose exec app npm run seed
```

Crea 3 pistas, 8 usuarios con partidos ya jugados y un par de reservas para mañana. Todos tienen la contraseña `padel1234`:

- Administrador: `admin@padel.local`
- Jugadores: `lucia@padel.local`, `javier@padel.local`, `marta@padel.local`, `pablo@padel.local`, `elena@padel.local`, `diego@padel.local`, `sara@padel.local`

Se puede ejecutar varias veces sin duplicar nada. Son datos solo para pruebas: no usarlos en un entorno real.

### Crear un administrador a mano

Nadie puede hacerse administrador desde la API. Hay que registrarse como usuario normal y cambiar el rol en la base de datos:

```
docker compose exec db psql -U padel -d padel -c "UPDATE usuarios SET rol='admin' WHERE email='tu@email.com';"
```

Después hay que cerrar sesión y volver a entrar, porque el rol va dentro del token.

### Otros comandos útiles

| Qué | Comando |
|-----|---------|
| Parar | `Ctrl + C` o `docker compose down` |
| Borrar también la base de datos (empezar de cero) | `docker compose down -v` |
| Ver los logs de la app | `docker compose logs -f app` |
| Abrir la consola de PostgreSQL | `docker compose exec db psql -U padel -d padel` |

Si se añade una librería con `npm install`, hay que volver a lanzar `docker compose up --build`.

Si se cambia `db/init.sql`, hay que borrar el volumen (`docker compose down -v`) para que se vuelva a cargar.

### Sin Docker

Hace falta un PostgreSQL 16 local con la base de datos creada y `db/init.sql` cargado. Después: `npm install` y `npm run dev` (con `DB_HOST=localhost` en el `.env`).

## Uso

1. **Entrar**: crear una cuenta o iniciar sesión en la página principal.
2. **Reservar pista**: elegir pista y día; las franjas en rojo están ocupadas. Pulsar una hora libre, elegir la duración y «Reservar».
3. **Mis reservas**: ver las próximas y las pasadas, y cancelar las próximas.
4. **Partidos**: elegir los 4 jugadores y los sets de cada equipo. Debajo está el historial, que se puede filtrar por jugador.
5. **Ranking**: la clasificación se actualiza sola con cada partido. Tu fila aparece resaltada.
6. **Administrar pistas** (solo admin): al final de «Reservar pista» aparece un panel para crear, editar, desactivar y reactivar pistas.

## API

Documentación completa con ejemplos en [docs/API.md](docs/API.md). Con la app en marcha, la **documentación interactiva** (OpenAPI + Swagger UI) está en http://localhost:3000/api-docs: se pueden probar los endpoints pulsando «Authorize» y pegando el token del login.

Las rutas con acceso «Sesión», «Admin» o «Dueño» necesitan la cabecera `Authorization: Bearer <token>`.

| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/health` | Público |
| POST | `/api/auth/register`, `/api/auth/login` (devuelven `{ token, usuario }`), `/api/auth/logout` | Público |
| GET | `/api/auth/me` | Sesión |
| GET | `/api/usuarios` | Sesión |
| GET | `/api/pistas`, `/api/pistas/:id` | Sesión |
| POST, PUT, DELETE | `/api/pistas`, `/api/pistas/:id` | Admin |
| GET | `/api/reservas?pista_id=&fecha=`, `/api/reservas/mias` | Sesión |
| POST | `/api/reservas` | Sesión |
| DELETE | `/api/reservas/:id` | Dueño o admin |
| GET | `/api/partidos`, `/api/partidos/:id` | Sesión |
| POST | `/api/partidos` | Sesión (jugador del partido) o admin |
| DELETE | `/api/partidos/:id` | Quien lo registró o admin |
| GET | `/api/ranking` | Sesión |

## Seguridad

- Contraseñas cifradas con **bcrypt** (12 rondas); nunca se devuelve `password_hash`.
- Sesión con **JWT** (caduca a las 2 horas): el servidor lo devuelve al iniciar sesión, el navegador lo guarda en `sessionStorage` (se borra al cerrar la pestaña) y lo envía en la cabecera `Authorization: Bearer <token>`. Como no va en una cookie, el navegador no lo manda solo a otras webs (protección frente a CSRF).
- **Autorización por rol** con los middlewares `verificarToken` y `requiereRol`, y comprobación de propietario en reservas y partidos. El rol no se puede elegir al registrarse.
- **Consultas parametrizadas** (`$1`, `$2`...) en todas las consultas: sin inyección SQL.
- **Validación** de tipos, formatos y longitudes de todos los datos de entrada en los controladores.
- **Reservas sin solapes**: antes de guardar, la API comprueba con una consulta que la pista no esté ocupada en esa franja (`409` si lo está).
- **Reglas en la base de datos**: `CHECK` contra empates, franjas sin sentido y roles no válidos; `UNIQUE` y claves foráneas.
- **Helmet**: cabeceras de seguridad y política CSP que solo permite scripts del propio servidor (sin scripts inline).
- **Frontend sin XSS**: los datos se pintan con `textContent`, nunca con `innerHTML`.
- **Login sin pistas**: el mismo mensaje de error si falla el email o la contraseña.
- Cuerpo JSON limitado a 10 kB y **errores genéricos** (sin trazas ni detalles internos).
- Secretos en `.env` (fuera de Git); la app no arranca sin `JWT_SECRET`. PostgreSQL solo escucha en `127.0.0.1`, y el contenedor de la app corre con un usuario sin privilegios.

## Estructura

```
db/init.sql                  esquema de la base de datos
docs/API.md                  documentación de la API
docs/openapi.yaml            especificación OpenAPI (se sirve en /api-docs)
src/
  config/db.js               conexión a PostgreSQL (pool)
  controllers/               lógica de cada petición y validación
  models/                    consultas SQL
  routes/                    rutas de la API
  middlewares/               autenticación y autorización
  public/                    frontend (HTML, CSS, JS)
  scripts/seed.js            datos de ejemplo
  app.js                     configuración de Express y montaje de rutas
  server.js                  arranque del servidor
Dockerfile
docker-compose.yml
.env.example
```

## Flujo de Git

- `main` está protegida: solo se entra con Pull Request revisada por otro miembro.
- Cada tarea va en su rama (`feature/...`).
- Antes de empezar: `git pull origin main`.
- Commits pequeños con mensaje claro: `feat: ...`, `fix: ...`, `docs: ...`.
