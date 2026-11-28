const express = require('express');
const partidos = require('../controllers/partido.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', verificarToken, partidos.ranking);

module.exports = router;
