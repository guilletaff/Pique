const jwt = require('jsonwebtoken');

// Comprueba que hay una sesión válida y deja los datos en req.usuario
function verificarToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'Hay que iniciar sesión' });
  }
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión no válida o caducada' });
  }
}

// Autorización por rol: requiereRol('admin') deja pasar solo a administradores
function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para esto' });
    }
    next();
  };
}

module.exports = { verificarToken, requiereRol };