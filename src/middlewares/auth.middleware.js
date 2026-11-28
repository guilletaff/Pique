const jwt = require('jsonwebtoken');

// Comprueba que la petición trae un JWT válido en la cabecera
// Authorization: Bearer <token> y deja los datos del usuario en req.usuario
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Hay que iniciar sesión' });
  }
  const token = authHeader.split(' ')[1];
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