const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Texto no vacío (rechaza números, objetos, arrays... que podrían romper el código)
function esTexto(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

// Genera el JWT de la sesión. El cliente lo guarda y lo envía en cada petición
// en la cabecera Authorization: Bearer <token>
function crearToken(usuario) {
  return jwt.sign(
    { id: usuario.id, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
}

async function register(req, res) {
  const { nombre, email, password } = req.body;

  if (!esTexto(nombre) || !esTexto(email) || !esTexto(password)) {
    return res.status(400).json({ error: 'Faltan campos: nombre, email y password' });
  }
  if (nombre.trim().length > 80) {
    return res.status(400).json({ error: 'El nombre no puede tener más de 80 caracteres' });
  }
  if (email.length > 120 || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'El email no es válido' });
  }
  // bcrypt solo tiene en cuenta los primeros 72 bytes de la contraseña
  if (password.length < 8 || Buffer.byteLength(password) > 72) {
    return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 72 caracteres' });
  }

  try {
    if (await Usuario.buscarPorEmail(email.toLowerCase())) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    // El rol no se acepta del body: todo el mundo se registra como jugador
    const usuario = await Usuario.crearUsuario({
      nombre: nombre.trim(),
      email: email.toLowerCase(),
      passwordHash,
    });
    res.status(201).json({ token: crearToken(usuario), usuario });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!esTexto(email) || !esTexto(password)) {
    return res.status(400).json({ error: 'Faltan campos: email y password' });
  }

  try {
    const usuario = await Usuario.buscarPorEmail(email.toLowerCase());
    // Mismo mensaje si falla el email o la contraseña, para no dar pistas
    if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }
    res.json({
      token: crearToken(usuario),
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

// Con JWT el servidor no guarda sesiones (stateless): cerrar sesión consiste en
// que el cliente borre su token. El endpoint existe para que el flujo sea explícito.
function logout(req, res) {
  res.json({ mensaje: 'Sesión cerrada' });
}

async function me(req, res) {
  try {
    const usuario = await Usuario.buscarPorId(req.usuario.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

module.exports = { register, login, logout, me };