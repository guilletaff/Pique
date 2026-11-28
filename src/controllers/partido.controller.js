const Partido = require('../models/partido.model');
const Usuario = require('../models/usuario.model');

const PUNTOS_VICTORIA = 3;
const MAX_SETS = 3; // sets que puede ganar como mucho un equipo en un partido
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function idValido(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function setsValidos(valor) {
  return Number.isInteger(valor) && valor >= 0 && valor <= MAX_SETS;
}

// Un equipo son exactamente 2 ids de usuario válidos
function equipoValido(equipo) {
  if (!Array.isArray(equipo) || equipo.length !== 2) return null;
  const ids = equipo.map(idValido);
  return ids.every(Boolean) ? ids : null;
}

// Fecha AAAA-MM-DD que exista de verdad (rechaza, por ejemplo, 2026-02-31)
function fechaValida(valor) {
  if (typeof valor !== 'string' || !FECHA_REGEX.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !isNaN(fecha) && fecha.toISOString().slice(0, 10) === valor;
}

function hoyEnMadrid() {
  // El formato sueco (sv-SE) es justo AAAA-MM-DD
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
}

// Pasa de la fila de la base de datos a una respuesta más cómoda para el frontend
function formatear(fila) {
  const quitarEquipo = ({ id, nombre }) => ({ id, nombre });
  return {
    id: fila.id,
    fecha: fila.fecha,
    creado_por: fila.creado_por,
    sets_equipo1: fila.sets_equipo1,
    sets_equipo2: fila.sets_equipo2,
    ganador: fila.sets_equipo1 > fila.sets_equipo2 ? 1 : 2,
    equipo1: fila.jugadores.filter((j) => j.equipo === 1).map(quitarEquipo),
    equipo2: fila.jugadores.filter((j) => j.equipo === 2).map(quitarEquipo),
  };
}

// POST /api/partidos
// { fecha?: 'AAAA-MM-DD', equipo1: [id, id], equipo2: [id, id], sets_equipo1, sets_equipo2 }
async function crear(req, res) {
  const { fecha, sets_equipo1: sets1, sets_equipo2: sets2 } = req.body;
  const equipo1 = equipoValido(req.body.equipo1);
  const equipo2 = equipoValido(req.body.equipo2);

  if (!equipo1 || !equipo2) {
    return res.status(400).json({ error: 'Cada equipo debe tener 2 jugadores (equipo1 y equipo2)' });
  }
  const jugadores = [...equipo1, ...equipo2];
  if (new Set(jugadores).size !== 4) {
    return res.status(400).json({ error: 'Los 4 jugadores deben ser distintos' });
  }
  if (!setsValidos(sets1) || !setsValidos(sets2)) {
    return res.status(400).json({ error: `Los sets deben ser números enteros entre 0 y ${MAX_SETS}` });
  }
  if (sets1 === sets2) {
    return res.status(400).json({ error: 'Un partido no puede acabar en empate' });
  }
  if (fecha !== undefined && fecha !== null && fecha !== '') {
    if (!fechaValida(fecha)) {
      return res.status(400).json({ error: 'La fecha no es válida (AAAA-MM-DD)' });
    }
    if (fecha > hoyEnMadrid()) {
      return res.status(400).json({ error: 'No se puede registrar un partido en una fecha futura' });
    }
  }
  // Un jugador solo puede apuntar partidos en los que ha jugado; el admin, cualquiera
  if (req.usuario.rol !== 'admin' && !jugadores.includes(req.usuario.id)) {
    return res.status(403).json({ error: 'Solo puedes registrar partidos en los que hayas jugado' });
  }

  try {
    if ((await Usuario.contarExistentes(jugadores)) !== 4) {
      return res.status(400).json({ error: 'Alguno de los jugadores no existe' });
    }
    const id = await Partido.crear({
      fecha: fecha || null,
      creadoPor: req.usuario.id,
      equipo1,
      equipo2,
      setsEquipo1: sets1,
      setsEquipo2: sets2,
    });
    res.status(201).json(formatear(await Partido.buscarPorId(id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

// GET /api/partidos            -> todos los partidos
// GET /api/partidos?usuario_id=3 -> historial de un jugador
async function listar(req, res) {
  let usuarioId = null;
  if (req.query.usuario_id !== undefined) {
    usuarioId = idValido(req.query.usuario_id);
    if (!usuarioId) return res.status(400).json({ error: 'El usuario_id no es válido' });
  }

  try {
    const partidos = await Partido.listar({ usuarioId });
    res.json(partidos.map(formatear));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

async function obtener(req, res) {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id no es válido' });

  try {
    const partido = await Partido.buscarPorId(id);
    if (!partido) return res.status(404).json({ error: 'Partido no encontrado' });
    res.json(formatear(partido));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

// Borrar un partido apuntado por error: quien lo registró o un administrador
async function eliminar(req, res) {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id no es válido' });

  try {
    const partido = await Partido.buscarPorId(id);
    if (!partido) return res.status(404).json({ error: 'Partido no encontrado' });
    if (partido.creado_por !== req.usuario.id && req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo quien registró el partido o un administrador pueden borrarlo' });
    }
    await Partido.eliminar(id);
    res.json({ mensaje: 'Partido eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

// GET /api/ranking
async function ranking(req, res) {
  try {
    const filas = await Partido.ranking(PUNTOS_VICTORIA);
    res.json(filas.map((fila, i) => ({ posicion: i + 1, ...fila })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

module.exports = { crear, listar, obtener, eliminar, ranking };
