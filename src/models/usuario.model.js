const pool = require('../config/db');

async function crearUsuario({ nombre, email, passwordHash }) {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, nombre, email, rol`,
    [nombre, email, passwordHash]
  );
  return rows[0];
}

async function buscarPorEmail(email) {
  const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  return rows[0];
}

async function buscarPorId(id) {
  const { rows } = await pool.query(
    'SELECT id, nombre, email, rol FROM usuarios WHERE id = $1',
    [id]
  );
  return rows[0];
}

// Lista pública de jugadores (para elegir compañeros y rivales): sin email ni contraseña
async function listar() {
  const { rows } = await pool.query('SELECT id, nombre FROM usuarios ORDER BY nombre');
  return rows;
}

// Cuántos de estos ids existen de verdad en la tabla
async function contarExistentes(ids) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM usuarios WHERE id = ANY($1::int[])',
    [ids]
  );
  return rows[0].total;
}

module.exports = { crearUsuario, buscarPorEmail, buscarPorId, listar, contarExistentes };