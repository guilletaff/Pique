const express = require('express');
const pistas = require('../controllers/pista.controller');
const { verificarToken, requiereRol } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas las rutas necesitan sesión iniciada
router.use(verificarToken);

router.get('/', pistas.listar);
router.get('/:id', pistas.obtener);

// Solo los administradores pueden crear, editar y desactivar pistas
router.post('/', requiereRol('admin'), pistas.crear);
router.put('/:id', requiereRol('admin'), pistas.actualizar);
router.delete('/:id', requiereRol('admin'), pistas.desactivar);

module.exports = router;