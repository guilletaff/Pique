// Carga datos de ejemplo para probar la app o para la demostración.
// Uso con Docker:  docker compose exec app npm run seed
// Se puede ejecutar varias veces: lo que ya existe no se duplica.
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const PASSWORD_DEMO = 'padel1234';

const USUARIOS = [
  { nombre: 'Admin Liga', email: 'admin@padel.local', rol: 'admin' },
  { nombre: 'Lucía Martín', email: 'lucia@padel.local' },
  { nombre: 'Javier Ruiz', email: 'javier@padel.local' },
  { nombre: 'Marta Gómez', email: 'marta@padel.local' },
  { nombre: 'Pablo Sanz', email: 'pablo@padel.local' },
  { nombre: 'Elena Torres', email: 'elena@padel.local' },
  { nombre: 'Diego López', email: 'diego@padel.local' },
  { nombre: 'Sara Navarro', email: 'sara@padel.local' },
];

const PISTAS = [
  { nombre: 'Pista 1', descripcion: 'Cristal, cubierta' },
  { nombre: 'Pista 2', descripcion: 'Cristal, exterior' },
  { nombre: 'Pista 3', descripcion: 'Muro, exterior' },
];

// [días atrás, equipo 1, equipo 2, sets equipo 1, sets equipo 2] (índices de USUARIOS)
const PARTIDOS = [
  [20, [1, 2], [3, 4], 2, 1],
  [18, [5, 6], [7, 1], 0, 2],
  [15, [2, 3], [4, 5], 2, 0],
  [12, [1, 4], [6, 7], 2, 1],
  [9, [3, 5], [2, 6], 1, 2],
  [6, [1, 7], [4, 2], 2, 0],
  [3, [6, 4], [5, 3], 2, 1],
  [1, [7, 2], [1, 5], 1, 2],
];

async function main() {
  const hash = await bcrypt.hash(PASSWORD_DEMO, 12);
  const ids = [];

  for (const u of USUARIOS) {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING id`,
      [u.nombre, u.email, hash, u.rol || 'jugador']
    );
    ids.push(rows[0].id);
  }
  console.log(`Usuarios: ${ids.length} (contraseña de todos: ${PASSWORD_DEMO})`);

  const pistaIds = [];
  for (const p of PISTAS) {
    const { rows } = await pool.query(
      `INSERT INTO pistas (nombre, descripcion) VALUES ($1, $2)
       ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id`,
      [p.nombre, p.descripcion]
    );
    pistaIds.push(rows[0].id);
  }
  console.log(`Pistas: ${pistaIds.length}`);

  const { rows: [{ total }] } = await pool.query('SELECT COUNT(*)::int AS total FROM partidos');
  if (total === 0) {
    for (const [diasAtras, eq1, eq2, s1, s2] of PARTIDOS) {
      const { rows } = await pool.query(
        `INSERT INTO partidos (fecha, creado_por, sets_equipo1, sets_equipo2)
         VALUES (CURRENT_DATE - $1::int, $2, $3, $4) RETURNING id`,
        [diasAtras, ids[eq1[0]], s1, s2]
      );
      for (const [equipo, jugadores] of [[1, eq1], [2, eq2]]) {
        for (const i of jugadores) {
          await pool.query(
            'INSERT INTO partido_jugadores (partido_id, usuario_id, equipo) VALUES ($1, $2, $3)',
            [rows[0].id, ids[i], equipo]
          );
        }
      }
    }
    console.log(`Partidos: ${PARTIDOS.length}`);
  } else {
    console.log('Ya había partidos: no se añaden más');
  }

  // Un par de reservas para mañana. Solo se insertan si no se solapan con
  // otra reserva de la misma pista (así no se duplican al repetir el seed)
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const dia = manana.toISOString().slice(0, 10);
  for (const [usuario, pista, hora] of [[1, 0, '18:00'], [2, 1, '19:30']]) {
    await pool.query(
      `INSERT INTO reservas (usuario_id, pista_id, inicio, fin)
       SELECT $1, $2, ($3::date + $4::time) AT TIME ZONE 'Europe/Madrid',
                      ($3::date + $4::time + INTERVAL '90 minutes') AT TIME ZONE 'Europe/Madrid'
       WHERE NOT EXISTS (
         SELECT 1 FROM reservas
         WHERE pista_id = $2
           AND inicio < ($3::date + $4::time + INTERVAL '90 minutes') AT TIME ZONE 'Europe/Madrid'
           AND fin > ($3::date + $4::time) AT TIME ZONE 'Europe/Madrid'
       )`,
      [ids[usuario], pistaIds[pista], dia, hora]
    );
  }
  console.log('Reservas de ejemplo para mañana: hechas');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
