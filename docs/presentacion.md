# Guion de la presentación (15 minutos)

Reparto orientativo para tres personas: **A** (introducción y arquitectura), **B** (demo), **C** (base de datos, seguridad y cierre). Cambiad los nombres por los vuestros.

| Minuto | Quién | Bloque |
|---|---|---|
| 0:00 – 1:30 | A | Problema y app |
| 1:30 – 4:00 | A | Arquitectura y tecnologías |
| 4:00 – 10:00 | B | Demostración en directo |
| 10:00 – 12:30 | C | Base de datos y reglas de negocio |
| 12:30 – 14:00 | C | Seguridad |
| 14:00 – 15:00 | C | Conclusiones y preguntas |

## Diapositivas

1. **Portada.** Pique · nombres del grupo · asignatura.
2. **El problema.** Una liga de pádel real entre amigos: reservas por mensajes, resultados en una hoja de cálculo, ranking a mano. Qué queremos: reservar sin choques, apuntar resultados y ver el ranking al momento.
3. **Qué hace la app.** Tabla jugador / administrador (la del README).
4. **Arquitectura.** Diagrama navegador → Express (rutas → middlewares → controladores → modelos) → PostgreSQL, todo en dos contenedores Docker.
5. **Tecnologías.** Node.js 22 + Express, PostgreSQL 16, JWT + bcrypt, Helmet, OpenAPI + Swagger UI, HTML/CSS/JS sin frameworks, Docker Compose, GitHub con Pull Requests.
6. **Demo** (pantalla con la app).
7. **Base de datos.** Diagrama de las 5 tablas. Destacar los `CHECK` (sin empates, `fin > inicio`, roles válidos), las claves foráneas y la transacción al registrar un partido. Las reservas solapadas las rechaza la API con una consulta previa (`409`).
8. **Ranking con SQL.** Se calcula en la consulta, nunca queda desactualizado: 3 puntos por victoria, desempate por sets.
9. **Seguridad.** Una línea por medida: bcrypt (12 rondas), JWT en cabecera `Authorization: Bearer` (guardado en `sessionStorage`, caduca en 2 h), roles y propietario, consultas parametrizadas, validación, CSP con Helmet, `textContent`. API documentada con OpenAPI y Swagger UI en `/api-docs`.
10. **Trabajo en equipo.** Ramas `feature/...`, `main` protegida, Pull Requests revisadas (enseñar el historial de GitHub).
11. **Conclusiones y mejoras.** Qué hemos aprendido y qué haríamos después (tests automáticos, confirmar resultados, temporadas, HTTPS).
12. **¿Preguntas?**

Capturas para las diapositivas: carpeta `docs/img`.

## Preparación antes de presentar

```
docker compose down -v          # base de datos limpia
docker compose up --build
docker compose exec app npm run seed
```

- Abrir http://localhost:3000 en una ventana normal y otra **de incógnito** (para tener dos usuarios a la vez).
- Contraseña de todos los usuarios de ejemplo: `padel1234`.
- Tener abierta una terminal por si falla algo y para enseñar el `curl` del final.
- Tener abierta otra pestaña con http://localhost:3000/api-docs (Swagger UI).

## Guion de la demo (6 minutos)

1. **Registro** (incógnito): crear una cuenta nueva. Comentar que entra como `jugador` y que la contraseña se guarda cifrada.
2. **Reservar pista**: elegir mañana en la Pista 1. Las 18:00–19:30 ya salen en rojo (reserva de Lucía). Elegir las 10:00, 1 hora y media, «Reservar».
3. **Solapamiento**: intentar reservar las 10:30 en la misma pista con otro usuario (ventana normal, entrar como `javier@padel.local`). Ya aparece ocupada; si se lanza la petición a mano, la API responde `409`.
4. **Mis reservas**: ver la reserva y cancelarla.
5. **Registrar partido**: con Javier, elegir compañeros y rivales y poner 2–1. Probar antes un 1–1 para enseñar el error «no puede acabar en empate».
6. **Ranking**: ver cómo ha cambiado la clasificación; la fila propia sale resaltada.
7. **Permisos**: con el jugador, no aparece el panel de administración. Cerrar sesión y entrar como `admin@padel.local`: aparece el panel. Crear «Pista 4», desactivarla y comprobar que desaparece del desplegable de reservas.
8. **Documentación de la API**: abrir http://localhost:3000/api-docs. Enseñar los endpoints agrupados por etiquetas, pulsar «Authorize», pegar un token y probar `GET /api/ranking` desde Swagger.
9. **Seguridad en directo** (opcional, si sobra tiempo): en las herramientas del navegador (F12 → Aplicación → Session Storage) se ve el `token`; en la pestaña Red, cualquier petición a `/api/...` lleva la cabecera `Authorization: Bearer ...`. Al pulsar «Salir» el token desaparece.

## Preguntas que pueden hacer

- **¿Qué pasa si dos personas reservan a la vez?** Antes de guardar, la API comprueba con una consulta si la franja se solapa con otra reserva de la pista; si es así, responde `409`. Si las dos peticiones llegaran en el mismo instante exacto podrían colarse ambas (la comprobación y la inserción son dos consultas); es una limitación conocida que se resolvería con una restricción en la base de datos.
- **¿Cómo se hace alguien administrador?** Solo cambiando el rol en la base de datos; la API nunca acepta el rol.
- **¿Por qué JWT en cabecera?** Es la autenticación basada en tokens vista en clase: el servidor no guarda sesiones (*stateless*) y el cliente manda `Authorization: Bearer <token>`. Lo guardamos en `sessionStorage`, que se borra al cerrar la pestaña.
- **¿Y si hay un XSS?** Un script podría leer `sessionStorage`, por eso evitamos que se pueda inyectar: `textContent` en vez de `innerHTML` y CSP de Helmet que solo permite scripts del propio servidor.
- **¿Y el CSRF?** Como el token no va en una cookie, el navegador no lo envía solo en peticiones que vienen de otra web.
- **¿Por qué PostgreSQL y no MongoDB?** Datos muy relacionados y reglas que queríamos garantizar en la propia base de datos (empates, franjas válidas, claves foráneas, transacciones).
- **¿Por qué no guardáis el ranking en una tabla?** Porque se calcula al momento a partir de los partidos y así nunca queda desactualizado.
