const Pista = require('../models/pista.model');

const UNIQUE_VIOLATION = '23505';

function idValido(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function datosValidos({ nombre, descripcion }) {
  const nombreOk = typeof nombre === 'string' && nombre.trim().length > 0 && nombre.trim().length <= 60;
  // La descripción es opcional, pero si viene tiene que ser texto razonable
  const descripcionOk = descripcion === undefined || descripcion === null ||
    (typeof descripcion === 'string' && descripcion.length <= 500);
  return nombreOk && descripcionOk;
}

async function listar(req, res) {
  try {
    // Los jugadores solo ven las pistas activas; el admin las ve todas
    const pistas = await Pista.listar({ soloActivas: req.usuario.rol !== 'admin' });
    res.json(pistas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

async function obtener(req, res) {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id no es válido' });

  try {
    const pista = await Pista.buscarPorId(id);
    if (!pista || (!pista.activa && req.usuario.rol !== 'admin')) {
      return res.status(404).json({ error: 'Pista no encontrada' });
    }
    res.json(pista);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

async function crear(req, res) {
  if (!datosValidos(req.body)) {
    return res.status(400).json({ error: 'El nombre es obligatorio (máximo 60 caracteres) y la descripción, si se indica, debe ser texto de hasta 500 caracteres' });
  }

  try {
    const pista = await Pista.crear({
      nombre: req.body.nombre.trim(),
      descripcion: req.body.descripcion,
    });
    res.status(201).json(pista);
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: 'Ya existe una pista con ese nombre' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

async function actualizar(req, res) {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id no es válido' });
  if (!datosValidos(req.body)) {
    return res.status(400).json({ error: 'El nombre es obligatorio (máximo 60 caracteres) y la descripción, si se indica, debe ser texto de hasta 500 caracteres' });
  }
  if (typeof req.body.activa !== 'boolean') {
    return res.status(400).json({ error: 'El campo activa debe ser true o false' });
  }

  try {
    const pista = await Pista.actualizar(id, {
      nombre: req.body.nombre.trim(),
      descripcion: req.body.descripcion,
      activa: req.body.activa,
    });
    if (!pista) return res.status(404).json({ error: 'Pista no encontrada' });
    res.json(pista);
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: 'Ya existe una pista con ese nombre' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

async function desactivar(req, res) {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id no es válido' });

  try {
    const pista = await Pista.desactivar(id);
    if (!pista) return res.status(404).json({ error: 'Pista no encontrada' });
    res.json(pista);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

module.exports = { listar, obtener, crear, actualizar, desactivar };