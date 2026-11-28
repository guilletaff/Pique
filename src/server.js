require('dotenv').config();

// Sin secreto no se pueden firmar las sesiones: mejor no arrancar
if (!process.env.JWT_SECRET) {
  console.error('Falta la variable JWT_SECRET (revisa el archivo .env)');
  process.exit(1);
}

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
