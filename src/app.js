const path = require('path');
const express = require('express');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();
const enProduccion = process.env.NODE_ENV === 'production';

// Cabeceras de seguridad. La política CSP solo deja cargar scripts y estilos
// del propio servidor (nada de scripts inline), lo que frena el XSS.
// En local se sirve por http, así que no se fuerza HTTPS fuera de producción.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      upgradeInsecureRequests: enProduccion ? [] : null,
    },
  },
  strictTransportSecurity: enProduccion,
}));

// Como mucho 10 kB de JSON por petición (evita cuerpos enormes)
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Documentación de la API (OpenAPI + Swagger UI) en http://localhost:3000/api-docs
const documentoOpenApi = YAML.load(path.join(__dirname, '..', 'docs', 'openapi.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(documentoOpenApi));

// Comprobación de que el servidor está vivo
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/pistas', require('./routes/pista.routes'));
app.use('/api/reservas', require('./routes/reserva.routes'));
app.use('/api/partidos', require('./routes/partido.routes'));
app.use('/api/ranking', require('./routes/ranking.routes'));
app.use('/api/usuarios', require('./routes/usuario.routes'));

// Cualquier otra ruta de la API no existe
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores: nunca se devuelve la traza ni detalles internos
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es JSON válido' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La petición es demasiado grande' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error del servidor' });
});

module.exports = app;
