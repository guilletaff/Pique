# Documentación de la API de Pique

Base: `http://localhost:3000/api`

Documentación interactiva (OpenAPI + Swagger UI): http://localhost:3000/api-docs. La especificación está en [`openapi.yaml`](openapi.yaml).

## Convenciones

- Peticiones y respuestas en JSON (`Content-Type: application/json`). Máximo 10 kB por petición.
- Autenticación con **JWT** (caduca a las 2 horas). `register` y `login` devuelven `{ "token": "...", "usuario": {...} }`. En las rutas protegidas hay que enviar la cabecera `Authorization: Bearer <token>`. El frontend guarda el token en `sessionStorage`.
- Los errores siempre tienen la forma `{ "error": "mensaje" }`:

| Código | Cuándo |
|--------|--------|
| 400 | Datos no válidos |
| 401 | Falta la cabecera `Authorization`, el token no es válido o ha caducado |
| 403 | Hay sesión, pero no hay permiso |
| 404 | No existe |
| 409 | Conflicto (email repetido, pista ocupada, nombre de pista repetido) |
| 413 | Petición demasiado grande |
| 500 | Error del servidor (mensaje genérico, sin detalles internos) |

Acceso: **Público** (sin sesión), **Sesión** (cualquier usuario con sesión), **Admin** (rol `admin`).

## Resumen de endpoints

| Método | Ruta | Qué hace | Acceso |
|--------|------|----------|--------|
| GET | `/api/health` | Comprobar que el servidor está vivo | Público |
| POST | `/api/auth/register` | Crear cuenta | Público |
| POST | `/api/auth/login` | Iniciar sesión | Público |
| POST | `/api/auth/logout` | Cerrar sesión | Público |
| GET | `/api/auth/me` | Datos del usuario actual | Sesión |
| GET | `/api/usuarios` | Lista de jugadores (id y nombre) | Sesión |
| GET | `/api/pistas` | Listar pistas (el admin ve también las inactivas) | Sesión |
| GET | `/api/pistas/:id` | Ver una pista | Sesión |
| POST | `/api/pistas` | Crear pista | Admin |
| PUT | `/api/pistas/:id` | Editar pista | Admin |
| DELETE | `/api/pistas/:id` | Desactivar pista | Admin |
| GET | `/api/reservas?pista_id=&fecha=` | Franjas ocupadas de una pista en un día | Sesión |
| GET | `/api/reservas/mias` | Mis reservas | Sesión |
| POST | `/api/reservas` | Reservar una pista | Sesión |
| DELETE | `/api/reservas/:id` | Cancelar una reserva | Dueño o admin |
| GET | `/api/partidos` | Listar partidos (`?usuario_id=` para el historial de un jugador) | Sesión |
| GET | `/api/partidos/:id` | Ver un partido | Sesión |
| POST | `/api/partidos` | Registrar un partido | Sesión (jugador del partido) o admin |
| DELETE | `/api/partidos/:id` | Borrar un partido | Quien lo registró o admin |
| GET | `/api/ranking` | Clasificación de la liga | Sesión |

---

## Autenticación

### POST `/api/auth/register`

```json
{ "nombre": "Lucía Martín", "email": "lucia@padel.local", "password": "padel1234" }
```

- `nombre`: obligatorio, máximo 80 caracteres.
- `email`: formato válido, máximo 120 caracteres, único (si existe → `409`).
- `password`: entre 8 y 72 caracteres. Se guarda cifrada con bcrypt.
- El rol no se acepta del cuerpo: todo el mundo se registra como `jugador`.
Respuesta `201` con el token y los datos del usuario:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": { "id": 2, "nombre": "Lucía Martín", "email": "lucia@padel.local", "rol": "jugador" }
}
```

### POST `/api/auth/login`

```json
{ "email": "lucia@padel.local", "password": "padel1234" }
```

Respuesta `200` con el mismo formato que el registro: `{ "token": "...", "usuario": {...} }`. Si el email o la contraseña no son correctos → `401` con el mismo mensaje en los dos casos.

### POST `/api/auth/logout`

El servidor no guarda sesiones (JWT es *stateless*): cerrar sesión consiste en que el cliente borre su token. El endpoint existe para que el flujo sea explícito. Respuesta: `{ "mensaje": "Sesión cerrada" }`.

### GET `/api/auth/me`

Necesita `Authorization: Bearer <token>`. Respuesta: `{ "id": 2, "nombre": "Lucía Martín", "email": "lucia@padel.local", "rol": "jugador" }`.

## Usuarios

### GET `/api/usuarios`

Lista de jugadores para elegir compañeros y rivales. Solo `id` y `nombre` (no se exponen emails).

```json
[{ "id": 1, "nombre": "Admin Liga" }, { "id": 2, "nombre": "Lucía Martín" }]
```

## Pistas

### GET `/api/pistas`

```json
[{ "id": 1, "nombre": "Pista 1", "descripcion": "Cristal, cubierta", "activa": true }]
```

Los jugadores solo reciben las pistas activas; el admin las recibe todas.

### GET `/api/pistas/:id`

Una pista. Si no existe (o está inactiva y el usuario no es admin) → `404`.

### POST `/api/pistas` (admin)

```json
{ "nombre": "Pista 4", "descripcion": "Panorámica" }
```

- `nombre`: obligatorio, máximo 60 caracteres, único (`409` si se repite).
- `descripcion`: opcional, texto de hasta 500 caracteres.

Respuesta `201` con la pista creada.

### PUT `/api/pistas/:id` (admin)

```json
{ "nombre": "Pista 4", "descripcion": "Panorámica", "activa": true }
```

Los tres campos son obligatorios (`activa` debe ser `true` o `false`). Sirve también para reactivar una pista.

### DELETE `/api/pistas/:id` (admin)

No borra la pista: la marca como `activa: false` para no perder sus reservas. Responde con la pista actualizada.

## Reservas

### GET `/api/reservas?pista_id=1&fecha=2026-12-10`

Franjas ocupadas de una pista en un día (hora de Madrid). No dice quién ha reservado.

```json
[{ "pista_id": 1, "inicio": "2026-12-10T17:00:00.000Z", "fin": "2026-12-10T18:30:00.000Z" }]
```

### GET `/api/reservas/mias`

```json
[{ "id": 7, "pista_id": 1, "pista": "Pista 1", "inicio": "2026-12-10T17:00:00.000Z", "fin": "2026-12-10T18:30:00.000Z" }]
```

### POST `/api/reservas`

```json
{ "pista_id": 1, "inicio": "2026-12-10T17:00:00.000Z", "fin": "2026-12-10T18:30:00.000Z" }
```

Reglas:
- `inicio` y `fin` en formato ISO; `fin` posterior a `inicio`.
- No se puede reservar en el pasado ni más de 3 horas seguidas (`400`).
- La pista debe existir (`404`) y estar activa (`400`).
- Si se solapa con otra reserva de la misma pista → `409`. Antes de insertar, la API busca con una consulta `SELECT` si hay alguna reserva de esa pista que empiece antes de que acabe la nueva y acabe después de que empiece (franjas contiguas, como 17:00–18:30 y 18:30–20:00, sí se permiten).

Respuesta `201` con la reserva creada.

### DELETE `/api/reservas/:id`

Solo el dueño de la reserva o un admin (`403` en otro caso). Respuesta: `{ "mensaje": "Reserva cancelada" }`.

## Partidos

Formato de un partido en las respuestas:

```json
{
  "id": 3,
  "fecha": "2026-11-28",
  "creado_por": 2,
  "sets_equipo1": 2,
  "sets_equipo2": 1,
  "ganador": 1,
  "equipo1": [{ "id": 2, "nombre": "Lucía Martín" }, { "id": 3, "nombre": "Javier Ruiz" }],
  "equipo2": [{ "id": 4, "nombre": "Marta Gómez" }, { "id": 5, "nombre": "Pablo Sanz" }]
}
```

### GET `/api/partidos`

Todos los partidos, del más reciente al más antiguo. Con `?usuario_id=3` devuelve solo los partidos de ese jugador (su historial).

### GET `/api/partidos/:id`

Un partido (`404` si no existe).

### POST `/api/partidos`

```json
{
  "fecha": "2026-11-28",
  "equipo1": [2, 3],
  "equipo2": [4, 5],
  "sets_equipo1": 2,
  "sets_equipo2": 1
}
```

Reglas:
- Cada equipo tiene exactamente 2 ids de usuario, y los 4 son distintos (`400`).
- Todos los jugadores deben existir (`400`).
- Sets: enteros entre 0 y 3, y no puede haber empate (`400`). La base de datos también lo impide con un `CHECK`.
- `fecha` opcional (por defecto, hoy), con formato `AAAA-MM-DD` y nunca en el futuro.
- Un jugador solo puede registrar partidos en los que juega (`403`); el admin puede registrar cualquiera.
- El partido y sus 4 jugadores se guardan en una transacción: o se guarda todo o nada.

Respuesta `201` con el partido creado.

### DELETE `/api/partidos/:id`

Solo quien lo registró o un admin (`403`). Respuesta: `{ "mensaje": "Partido eliminado" }`.

## Ranking

### GET `/api/ranking`

Se calcula en el momento a partir de los partidos: **3 puntos por victoria**. Orden: puntos, después diferencia de sets y después nombre. Solo salen los jugadores con algún partido.

```json
[
  {
    "posicion": 1,
    "id": 2,
    "nombre": "Lucía Martín",
    "jugados": 5,
    "ganados": 5,
    "perdidos": 0,
    "sets_favor": 10,
    "sets_contra": 3,
    "puntos": 15
  }
]
```

## Ejemplo con curl

```bash
# Iniciar sesión: la respuesta trae el token
curl -H "Content-Type: application/json" \
     -d '{"email":"lucia@padel.local","password":"padel1234"}' \
     http://localhost:3000/api/auth/login

# Usar el token en la cabecera Authorization de las siguientes peticiones
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/ranking
```

En PowerShell hay que usar `curl.exe` (no `curl`), o bien:

```powershell
$r = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login `
     -ContentType "application/json" -Body '{"email":"lucia@padel.local","password":"padel1234"}'
Invoke-RestMethod -Uri http://localhost:3000/api/ranking -Headers @{ Authorization = "Bearer $($r.token)" }
```
