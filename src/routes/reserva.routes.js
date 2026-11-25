const express = require('express');
const reservas = require('../controllers/reserva.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas necesitan sesión iniciada
router.use(verificarToken);

router.get('/', reservas.ocupadas);      // franjas ocupadas de una pista en un día
router.get('/mias', reservas.mias);      // mis reservas
router.post('/', reservas.crear);        // reservar una pista
router.delete('/:id', reservas.cancelar); // cancelar una reserva

module.exports = router;