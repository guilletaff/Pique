const express = require('express');
const partidos = require('../controllers/partido.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas necesitan sesión iniciada
router.use(verificarToken);

router.get('/', partidos.listar);          // todos, o ?usuario_id=3 para el historial de un jugador
router.get('/:id', partidos.obtener);      // un partido
router.post('/', partidos.crear);          // registrar un partido
router.delete('/:id', partidos.eliminar);  // borrar (quien lo registró o admin)

module.exports = router;
