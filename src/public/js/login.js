const formLogin = document.getElementById('form-login');
const formRegistro = document.getElementById('form-registro');
const pestanaLogin = document.getElementById('pestana-login');
const pestanaRegistro = document.getElementById('pestana-registro');
const mensaje = document.getElementById('mensaje');

// Si ya hay sesión, no tiene sentido ver el login
if (sessionStorage.getItem('token')) {
  api('/auth/me')
    .then(() => { window.location.href = 'pistas.html'; })
    .catch(() => borrarToken());
}

function cambiarPestana(registro) {
  formLogin.classList.toggle('oculto', registro);
  formRegistro.classList.toggle('oculto', !registro);
  pestanaLogin.classList.toggle('activa', !registro);
  pestanaRegistro.classList.toggle('activa', registro);
  limpiarMensaje(mensaje);
}

pestanaLogin.addEventListener('click', () => cambiarPestana(false));
pestanaRegistro.addEventListener('click', () => cambiarPestana(true));

formLogin.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const datos = Object.fromEntries(new FormData(formLogin));
  if (!datos.email || !datos.password) {
    return mostrarMensaje(mensaje, 'Escribe tu email y tu contraseña');
  }
  try {
    const respuesta = await api('/auth/login', { method: 'POST', body: datos });
    guardarToken(respuesta.token);
    window.location.href = 'pistas.html';
  } catch (err) {
    mostrarMensaje(mensaje, err.message);
  }
});

formRegistro.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const datos = Object.fromEntries(new FormData(formRegistro));
  if (!datos.nombre.trim() || !datos.email || !datos.password) {
    return mostrarMensaje(mensaje, 'Rellena todos los campos');
  }
  if (datos.password.length < 8) {
    return mostrarMensaje(mensaje, 'La contraseña debe tener al menos 8 caracteres');
  }
  try {
    const respuesta = await api('/auth/register', { method: 'POST', body: datos });
    guardarToken(respuesta.token);
    window.location.href = 'pistas.html';
  } catch (err) {
    mostrarMensaje(mensaje, err.message);
  }
});
