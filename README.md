# Padel App

Aplicación web de pádel: pistas, reservas, partidos y ranking.
Backend con Node.js + Express (estructura MVC), base de datos PostgreSQL y despliegue con Docker.

## Estructura

```
src/
  config/        conexión a la base de datos
  controllers/   lógica de cada petición
  models/        consultas a la base de datos
  routes/        rutas de la API
  middlewares/   autenticación, validación, errores
  public/        frontend (HTML, CSS, JS)
  app.js         configuración de Express
  server.js      arranque del servidor
```

## Puesta en marcha

```bash
cp .env.example .env     # y cambiar las claves
docker compose up --build
```

Comprobar que funciona: http://localhost:3000/api/health

Sin Docker (necesita un PostgreSQL local): `npm install` y `npm run dev`.

## Reparto del trabajo

| Parte | Responsable | Rama |
|-------|-------------|------|
| Base de datos, usuarios, login y roles | Oriol | `feature/auth` |
| Pistas y reservas | _por decidir_ | `feature/reservas` |
| Partidos, ranking y frontend | _por decidir_ | `feature/ranking` |

## Flujo de Git

- `main` está protegida: solo se entra con Pull Request revisada por otro miembro.
- Cada tarea va en su rama (`feature/...`).
- Antes de empezar: `git pull origin main`.
- Commits pequeños con mensaje claro, por ejemplo `feat: añadir login`.
