const pool = require('../config/db');

async function listar({ soloActivas }) {
  const filtro = soloActivas ? 'WHERE activa = TRUE' : '';
  const { rows } = await pool.query(`SELECT * FROM pistas ${filtro} ORDER BY nombre`);
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await pool.query('SELECT * FROM pistas WHERE id = $1', [id]);
  return rows[0];
}

async function crear({ nombre, descripcion }) {
  const { rows } = await pool.query(
    'INSERT INTO pistas (nombre, descripcion) VALUES ($1, $2) RETURNING *',
    [nombre, descripcion || null]
  );
  return rows[0];
}

async function actualizar(id, { nombre, descripcion, activa }) {
  const { rows } = await pool.query(
    `UPDATE pistas
     SET nombre = $1, descripcion = $2, activa = $3
     WHERE id = $4
     RETURNING *`,
    [nombre, descripcion || null, activa, id]
  );
  return rows[0];
}

// No se borra la pista (se perderían sus reservas): se marca como no activa
async function desactivar(id) {
  const { rows } = await pool.query(
    'UPDATE pistas SET activa = FALSE WHERE id = $1 RETURNING *',
    [id]
  );
  return rows[0];
}

module.exports = { listar, buscarPorId, crear, actualizar, desactivar };