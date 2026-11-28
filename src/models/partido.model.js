const pool = require('../config/db');

// Consulta base: cada partido con sus 4 jugadores agrupados en un array JSON
const SELECT_PARTIDOS = `
  SELECT p.id,
         to_char(p.fecha, 'YYYY-MM-DD') AS fecha,
         p.creado_por,
         p.sets_equipo1,
         p.sets_equipo2,
         json_agg(
           json_build_object('id', u.id, 'nombre', u.nombre, 'equipo', pj.equipo)
           ORDER BY pj.equipo, u.nombre
         ) AS jugadores
  FROM partidos p
  JOIN partido_jugadores pj ON pj.partido_id = p.id
  JOIN usuarios u ON u.id = pj.usuario_id
`;

// Crea el partido y sus 4 jugadores en una transacción: o se guarda todo o nada
async function crear({ fecha, creadoPor, equipo1, equipo2, setsEquipo1, setsEquipo2 }) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const { rows } = await cliente.query(
      `INSERT INTO partidos (fecha, creado_por, sets_equipo1, sets_equipo2)
       VALUES (COALESCE($1::date, CURRENT_DATE), $2, $3, $4)
       RETURNING id`,
      [fecha || null, creadoPor, setsEquipo1, setsEquipo2]
    );
    const partidoId = rows[0].id;

    for (const usuarioId of equipo1) {
      await cliente.query(
        'INSERT INTO partido_jugadores (partido_id, usuario_id, equipo) VALUES ($1, $2, 1)',
        [partidoId, usuarioId]
      );
    }
    for (const usuarioId of equipo2) {
      await cliente.query(
        'INSERT INTO partido_jugadores (partido_id, usuario_id, equipo) VALUES ($1, $2, 2)',
        [partidoId, usuarioId]
      );
    }

    await cliente.query('COMMIT');
    return partidoId;
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
}

// Todos los partidos, o solo los de un jugador si se indica usuarioId (historial)
async function listar({ usuarioId } = {}) {
  const { rows } = await pool.query(
    `${SELECT_PARTIDOS}
     WHERE $1::int IS NULL
        OR p.id IN (SELECT partido_id FROM partido_jugadores WHERE usuario_id = $1)
     GROUP BY p.id
     ORDER BY p.fecha DESC, p.id DESC`,
    [usuarioId || null]
  );
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    `${SELECT_PARTIDOS}
     WHERE p.id = $1
     GROUP BY p.id`,
    [id]
  );
  return rows[0];
}

async function eliminar(id) {
  // partido_jugadores se borra solo por el ON DELETE CASCADE
  await pool.query('DELETE FROM partidos WHERE id = $1', [id]);
}

// Clasificación: puntos por victoria, después diferencia de sets y después nombre.
// Solo aparecen los jugadores que han jugado al menos un partido.
async function ranking(puntosVictoria) {
  const { rows } = await pool.query(
    `WITH estadisticas AS (
       SELECT u.id,
              u.nombre,
              COUNT(*)::int AS jugados,
              COUNT(*) FILTER (
                WHERE (pj.equipo = 1 AND p.sets_equipo1 > p.sets_equipo2)
                   OR (pj.equipo = 2 AND p.sets_equipo2 > p.sets_equipo1)
              )::int AS ganados,
              SUM(CASE WHEN pj.equipo = 1 THEN p.sets_equipo1 ELSE p.sets_equipo2 END)::int AS sets_favor,
              SUM(CASE WHEN pj.equipo = 1 THEN p.sets_equipo2 ELSE p.sets_equipo1 END)::int AS sets_contra
       FROM usuarios u
       JOIN partido_jugadores pj ON pj.usuario_id = u.id
       JOIN partidos p ON p.id = pj.partido_id
       GROUP BY u.id, u.nombre
     )
     SELECT id,
            nombre,
            jugados,
            ganados,
            jugados - ganados AS perdidos,
            sets_favor,
            sets_contra,
            ganados * $1::int AS puntos
     FROM estadisticas
     ORDER BY puntos DESC, (sets_favor - sets_contra) DESC, nombre`,
    [puntosVictoria]
  );
  return rows;
}

module.exports = { crear, listar, buscarPorId, eliminar, ranking };
