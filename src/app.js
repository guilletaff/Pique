const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Comprobación de que el servidor está vivo
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/pistas', require('./routes/pista.routes'));
// Aquí se irán montando las rutas de los demás módulos, por ejemplo:
// app.use('/api/pistas', require('./routes/pistas.routes'));

module.exports = app;