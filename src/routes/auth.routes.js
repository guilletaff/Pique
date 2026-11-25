const express = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// Máximo 10 intentos de login cada 15 minutos por IP (frena la fuerza bruta)
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Prueba de nuevo en 15 minutos' },
});

router.post('/register', auth.register);
router.post('/login', limiteLogin, auth.login);
router.post('/logout', auth.logout);
router.get('/me', verificarToken, auth.me);

module.exports = router;