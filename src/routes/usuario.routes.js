const express = require('express');
const usuarios = require('../controllers/usuario.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', verificarToken, usuarios.listar);

module.exports = router;
