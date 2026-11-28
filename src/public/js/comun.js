// Funciones compartidas por todas las páginas

// El JWT de la sesión se guarda en sessionStorage: se borra al cerrar la pestaña
function guardarToken(token) {
  sessionStorage.setItem('token', token);
}

function borrarToken() {
  sessionStorage.removeItem('token');
}

// Llama a la API y devuelve el JSON. Si hay sesión, añade la cabecera
// Authorization: Bearer <token>. Si la respuesta es un error, lanza una
// excepción con el mensaje que manda el servidor ({ error: '...' }).
async function api(ruta, { method = 'GET', body } = {}) {
  const opciones = { method, headers: {} };
  const token = sessionStorage.getItem('token');
  if (token) {
    opciones.headers['Authorization'] = 'Bearer ' + token;
  }
  if (body !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(body);
  }

  const respuesta = await fetch('/api' + ruta, opciones);
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    // respuesta sin cuerpo JSON
  }

  if (!respuesta.ok) {
    const error = new Error((datos && datos.error) || 'Error inesperado');
    error.status = respuesta.status;
    throw error;
  }
  return datos;
}

// Crea un elemento del DOM. Los textos se ponen siempre con textContent,
// nunca con innerHTML, para que un nombre con <script> no se ejecute (XSS).
function el(etiqueta, propiedades = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(propiedades)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave === 'className') nodo.className = valor;
    else if (clave === 'texto') nodo.textContent = valor;
    else if (clave.startsWith('on')) nodo.addEventListener(clave.slice(2).toLowerCase(), valor);
    else nodo.setAttribute(clave, valor === true ? '' : valor);
  }
  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return nodo;
}

// Muestra un aviso (tipo 'ok' o 'error') dentro de un contenedor
function mostrarMensaje(contenedor, texto, tipo = 'error') {
  contenedor.replaceChildren(el('p', { className: `aviso aviso-${tipo}`, texto }));
  if (tipo === 'ok') setTimeout(() => contenedor.replaceChildren(), 4000);
}

function limpiarMensaje(contenedor) {
  contenedor.replaceChildren();
}

// Fecha de hoy en formato AAAA-MM-DD según la hora local del navegador
function hoyISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function formatearFecha(fecha) {
  // fecha AAAA-MM-DD (sin hora): se crea a mediodía para que la zona horaria no cambie el día
  const d = typeof fecha === 'string' && fecha.length === 10 ? new Date(`${fecha}T12:00:00`) : new Date(fecha);
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatearHora(fecha) {
  return new Date(fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// Comprueba la sesión y pinta la barra de navegación.
// Si no hay sesión, manda al usuario a la página de login.
async function iniciarPagina(paginaActiva) {
  let usuario;
  try {
    usuario = await api('/auth/me');
  } catch {
    borrarToken();
    window.location.href = '/';
    return new Promise(() => {}); // la página se va a cambiar; no seguimos
  }

  const enlaces = [
    ['pistas.html', 'Reservar pista'],
    ['reservas.html', 'Mis reservas'],
    ['partidos.html', 'Partidos'],
    ['ranking.html', 'Ranking'],
  ];

  const nav = el('nav', { className: 'nav' },
    el('a', { className: 'marca', href: 'pistas.html' }, '🎾 Pique'),
    el('ul', {},
      enlaces.map(([href, texto]) =>
        el('li', {}, el('a', { href, className: href === paginaActiva ? 'activa' : null }, texto))
      )
    ),
    el('div', { className: 'usuario' },
      el('span', {}, usuario.nombre),
      usuario.rol === 'admin' ? el('span', { className: 'etiqueta', texto: 'admin' }) : null,
      el('button', { className: 'boton boton-secundario', onclick: cerrarSesion }, 'Salir')
    )
  );
  document.querySelector('header').replaceChildren(nav);
  return usuario;
}

async function cerrarSesion() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } finally {
    borrarToken();
    window.location.href = '/';
  }
}
