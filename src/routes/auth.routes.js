const express = require('express');
const auth = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', auth.register);
router.post('/login', auth.login);
router.post('/logout', auth.logout);
router.get('/me', verificarToken, auth.me);

module.exports = router;