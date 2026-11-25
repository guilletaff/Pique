const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario.model');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function crearCookie(res, usuario) {
  const token = jwt.sign(
    { id: usuario.id, rol: usuario.rol },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
  res.cookie('token', token, {
    httpOnly: true,                                  // JavaScript del navegador no puede leerla
    sameSite: 'strict',                              // protege frente a CSRF
    secure: process.env.NODE_ENV === 'production',   // solo por HTTPS en producción
    maxAge: 2 * 60 * 60 * 1000,
  });
}

async function register(req, res) {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Faltan campos: nombre, email y password' });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'El email no es válido' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    if (await Usuario.buscarPorEmail(email.toLowerCase())) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    // El rol no se acepta del body: todo el mundo se registra como jugador
    const usuario = await Usuario.crearUsuario({
      nombre: nombre.trim(),
      email: email.toLowerCase(),
      passwordHash,
    });
    crearCookie(res, usuario);
    res.status(201).json(usuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan campos: email y password' });
  }

  try {
    const usuario = await Usuario.buscarPorEmail(email.toLowerCase());
    // Mismo mensaje si falla el email o la contraseña, para no dar pistas
    if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }
    crearCookie(res, usuario);
    res.json({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
}

function logout(req, res) {
  res.clearCookie('token');
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