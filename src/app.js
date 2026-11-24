const path = require('path');
const express = require('express');
const helmet = require('helmet');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Comprobación de que el servidor está vivo
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Aquí se irán montando las rutas de cada módulo, por ejemplo:
// app.use('/api/auth', require('./routes/auth.routes'));
// app.use('/api/pistas', require('./routes/pistas.routes'));

module.exports = app;
