const pool = require('../config/db');

async function crear({ usuarioId, pistaId, inicio, fin }) {
  const { rows } = await pool.query(
    `INSERT INTO reservas (usuario_id, pista_id, inicio, fin)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [usuarioId, pistaId, inicio, fin]
  );
  return rows[0];
}

async function buscarPorId(id) {
  const { rows } = await pool.query('SELECT * FROM reservas WHERE id = $1', [id]);
  return rows[0];
}

// Reservas de un usuario, las más próximas primero
async function listarPorUsuario(usuarioId) {
  const { rows } = await pool.query(
    `SELECT r.id, r.pista_id, p.nombre AS pista, r.inicio, r.fin
     FROM reservas r
     JOIN pistas p ON p.id = r.pista_id
     WHERE r.usuario_id = $1
     ORDER BY r.inicio`,
    [usuarioId]
  );
  return rows;
}

// Franjas ocupadas de una pista en un día (sin datos de quién reservó)
async function listarPorPistaYFecha(pistaId, fecha) {
  const { rows } = await pool.query(
    `SELECT pista_id, inicio, fin
     FROM reservas
     WHERE pista_id = $1
       AND (inicio AT TIME ZONE 'Europe/Madrid')::date = $2::date
     ORDER BY inicio`,
    [pistaId, fecha]
  );
  return rows;
}

async function eliminar(id) {
  await pool.query('DELETE FROM reservas WHERE id = $1', [id]);
}

module.exports = { crear, buscarPorId, listarPorUsuario, listarPorPistaYFecha, eliminar };