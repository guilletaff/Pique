const Usuario = require('../models/usuario.model');

// GET /api/usuarios: id y nombre de todos los jugadores, para elegir compañeros y rivales
async function listar(req, res) {
  try {
    res.json(await Usuario.listar());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

module.exports = { listar };
