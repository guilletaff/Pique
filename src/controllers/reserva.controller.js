const Reserva = require('../models/reserva.model');
const Pista = require('../models/pista.model');

const DURACION_MAXIMA_MS = 3 * 60 * 60 * 1000; // 3 horas
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function idValido(valor) {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function fechaValida(valor) {
  if (typeof valor !== 'string') return null;
  const fecha = new Date(valor);
  return isNaN(fecha.getTime()) ? null : fecha;
}

async function crear(req, res) {
  const pistaId = idValido(req.body.pista_id);
  const inicio = fechaValida(req.body.inicio);
  const fin = fechaValida(req.body.fin);

  if (!pistaId || !inicio || !fin) {
    return res.status(400).json({ error: 'Hacen falta pista_id, inicio y fin (fechas ISO)' });
  }
  if (fin <= inicio) {
    return res.status(400).json({ error: 'La hora de fin debe ser posterior a la de inicio' });
  }
  if (inicio <= new Date()) {
    return res.status(400).json({ error: 'No se puede reservar en el pasado' });
  }
  if (fin - inicio > DURACION_MAXIMA_MS) {
    return res.status(400).json({ error: 'Una reserva no puede durar más de 3 horas' });
  }

  try {
    const pista = await Pista.buscarPorId(pistaId);
    if (!pista) return res.status(404).json({ error: 'Pista no encontrada' });
    if (!pista.activa) return res.status(400).json({ error: 'La pista no está disponible' });

    if (await Reserva.haySolape(pistaId, inicio.toISOString(), fin.toISOString())) {
      return res.status(409).json({ error: 'La pista ya está reservada en ese horario' });
    }

    const reserva = await Reserva.crear({
      usuarioId: req.usuario.id,
      pistaId,
      inicio: inicio.toISOString(),
      fin: fin.toISOString(),
    });
    res.status(201).json(reserva);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

async function mias(req, res) {
  try {
    res.json(await Reserva.listarPorUsuario(req.usuario.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

// Disponibilidad: GET /api/reservas?pista_id=1&fecha=2026-12-01
async function ocupadas(req, res) {
  const pistaId = idValido(req.query.pista_id);
  const fecha = req.query.fecha;

  if (!pistaId || typeof fecha !== 'string' || !FECHA_REGEX.test(fecha) || isNaN(new Date(fecha))) {
    return res.status(400).json({ error: 'Hacen falta pista_id y fecha (AAAA-MM-DD)' });
  }

  try {
    res.json(await Reserva.listarPorPistaYFecha(pistaId, fecha));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

async function cancelar(req, res) {
  const id = idValido(req.params.id);
  if (!id) return res.status(400).json({ error: 'El id no es válido' });

  try {
    const reserva = await Reserva.buscarPorId(id);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });

    // Solo el dueño de la reserva o un administrador pueden cancelarla
    if (reserva.usuario_id !== req.usuario.id && req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'No puedes cancelar la reserva de otro jugador' });
    }

    await Reserva.eliminar(id);
    res.json({ mensaje: 'Reserva cancelada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

module.exports = { crear, mias, ocupadas, cancelar };