// Horario del club: primera y última hora a la que se puede empezar a jugar
const HORA_APERTURA = 8;
const HORA_ULTIMO_INICIO = 22.5; // 22:30
const PASO_MINUTOS = 30;

const selectPista = document.getElementById('reserva-pista');
const inputFecha = document.getElementById('reserva-fecha');
const selectDuracion = document.getElementById('reserva-duracion');
const contenedorFranjas = document.getElementById('franjas');
const resumen = document.getElementById('resumen-reserva');
const botonReservar = document.getElementById('boton-reservar');
const mensajeReserva = document.getElementById('mensaje-reserva');

let usuario = null;
let pistas = [];
let horaElegida = null; // 'HH:MM'

// Todas las horas de inicio posibles del día: 08:00, 08:30, ..., 22:30
function horasDelDia() {
  const horas = [];
  for (let m = HORA_APERTURA * 60; m <= HORA_ULTIMO_INICIO * 60; m += PASO_MINUTOS) {
    horas.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return horas;
}

// ---------- Reservar ----------

async function cargarFranjas() {
  horaElegida = null;
  actualizarResumen();
  const pistaId = selectPista.value;
  const fecha = inputFecha.value;
  if (!pistaId || !fecha) {
    contenedorFranjas.replaceChildren(el('p', { className: 'vacio', texto: 'Elige pista y día' }));
    return;
  }

  let ocupadas = [];
  try {
    ocupadas = await api(`/reservas?pista_id=${encodeURIComponent(pistaId)}&fecha=${encodeURIComponent(fecha)}`);
  } catch (err) {
    mostrarMensaje(mensajeReserva, err.message);
  }
  const ahora = new Date();

  const botones = horasDelDia().map((hora) => {
    const inicio = new Date(`${fecha}T${hora}`);
    const fin = new Date(inicio.getTime() + PASO_MINUTOS * 60000);
    const ocupada = ocupadas.some((r) => inicio < new Date(r.fin) && fin > new Date(r.inicio));
    const pasada = inicio <= ahora;

    const clase = ['franja', ocupada && 'ocupada', pasada && !ocupada && 'pasada'].filter(Boolean).join(' ');
    return el('button', {
      type: 'button',
      className: clase,
      disabled: ocupada || pasada,
      'data-hora': hora,
      title: ocupada ? 'Ocupada' : pasada ? 'Ya ha pasado' : 'Libre',
      onclick: () => elegirHora(hora),
    }, hora);
  });
  contenedorFranjas.replaceChildren(...botones);
}

function elegirHora(hora) {
  horaElegida = hora;
  for (const boton of contenedorFranjas.querySelectorAll('.franja')) {
    boton.classList.toggle('elegida', boton.dataset.hora === hora);
  }
  actualizarResumen();
}

function calcularIntervalo() {
  const inicio = new Date(`${inputFecha.value}T${horaElegida}`);
  const fin = new Date(inicio.getTime() + Number(selectDuracion.value) * 60000);
  return { inicio, fin };
}

function actualizarResumen() {
  if (!horaElegida) {
    resumen.textContent = '';
    botonReservar.disabled = true;
    return;
  }
  const { inicio, fin } = calcularIntervalo();
  const pista = pistas.find((p) => String(p.id) === selectPista.value);
  resumen.textContent = `${pista ? pista.nombre : ''} · ${formatearFecha(inputFecha.value)} · de ${formatearHora(inicio)} a ${formatearHora(fin)}`;
  botonReservar.disabled = false;
}

document.getElementById('form-reserva').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!horaElegida) return;
  const { inicio, fin } = calcularIntervalo();
  botonReservar.disabled = true;
  try {
    await api('/reservas', {
      method: 'POST',
      body: { pista_id: Number(selectPista.value), inicio: inicio.toISOString(), fin: fin.toISOString() },
    });
    mostrarMensaje(mensajeReserva, '¡Reserva hecha! La tienes en «Mis reservas».', 'ok');
  } catch (err) {
    mostrarMensaje(mensajeReserva, err.message);
  }
  await cargarFranjas();
});

selectPista.addEventListener('change', cargarFranjas);
inputFecha.addEventListener('change', cargarFranjas);
selectDuracion.addEventListener('change', actualizarResumen);

// ---------- Listado de pistas ----------

function pintarPistas() {
  const activas = pistas.filter((p) => p.activa);
  const seleccionada = selectPista.value;

  selectPista.replaceChildren(
    ...activas.map((p) => el('option', { value: p.id }, p.nombre))
  );
  if (activas.some((p) => String(p.id) === seleccionada)) selectPista.value = seleccionada;

  const lista = document.getElementById('lista-pistas');
  if (activas.length === 0) {
    lista.replaceChildren(el('li', { className: 'vacio', texto: 'Todavía no hay pistas disponibles' }));
  } else {
    lista.replaceChildren(...activas.map((p) =>
      el('li', {},
        el('div', {},
          el('strong', {}, p.nombre),
          el('div', { className: 'detalle' }, p.descripcion || 'Sin descripción')
        ),
        el('button', {
          className: 'boton boton-pequeno',
          onclick: () => { selectPista.value = p.id; cargarFranjas(); },
        }, 'Ver horarios')
      )
    ));
  }

  if (usuario.rol === 'admin') pintarTablaAdmin();
}

async function cargarPistas() {
  pistas = await api('/pistas');
  pintarPistas();
}

// ---------- Administración (solo admin) ----------

const formPista = document.getElementById('form-pista');
const mensajeAdmin = document.getElementById('mensaje-admin');
const campoId = document.getElementById('pista-id');
const campoNombre = document.getElementById('pista-nombre');
const campoDescripcion = document.getElementById('pista-descripcion');
const campoActiva = document.getElementById('pista-activa');
const botonCancelar = document.getElementById('cancelar-edicion');

function pintarTablaAdmin() {
  const filas = pistas.map((p) =>
    el('tr', {},
      el('td', {}, el('strong', {}, p.nombre), el('div', { className: 'detalle' }, p.descripcion || '')),
      el('td', {}, el('span', { className: p.activa ? 'etiqueta' : 'etiqueta etiqueta-gris' }, p.activa ? 'Activa' : 'Inactiva')),
      el('td', { className: 'num' },
        el('button', { className: 'boton boton-pequeno', onclick: () => editarPista(p) }, 'Editar'), ' ',
        p.activa
          ? el('button', { className: 'boton boton-pequeno boton-peligro', onclick: () => desactivarPista(p) }, 'Desactivar')
          : el('button', { className: 'boton boton-pequeno', onclick: () => activarPista(p) }, 'Activar')
      )
    )
  );
  document.getElementById('tabla-pistas').replaceChildren(...filas);
}

function editarPista(pista) {
  campoId.value = pista.id;
  campoNombre.value = pista.nombre;
  campoDescripcion.value = pista.descripcion || '';
  campoActiva.checked = pista.activa;
  document.getElementById('campo-activa').classList.remove('oculto');
  document.getElementById('titulo-form-pista').textContent = `Editar «${pista.nombre}»`;
  botonCancelar.classList.remove('oculto');
  campoNombre.focus();
}

function limpiarFormPista() {
  formPista.reset();
  campoId.value = '';
  document.getElementById('campo-activa').classList.add('oculto');
  document.getElementById('titulo-form-pista').textContent = 'Nueva pista';
  botonCancelar.classList.add('oculto');
}

botonCancelar.addEventListener('click', limpiarFormPista);

formPista.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const nombre = campoNombre.value.trim();
  if (!nombre) return mostrarMensaje(mensajeAdmin, 'El nombre es obligatorio');

  const datos = { nombre, descripcion: campoDescripcion.value.trim() };
  try {
    if (campoId.value) {
      await api(`/pistas/${campoId.value}`, { method: 'PUT', body: { ...datos, activa: campoActiva.checked } });
      mostrarMensaje(mensajeAdmin, 'Pista actualizada', 'ok');
    } else {
      await api('/pistas', { method: 'POST', body: datos });
      mostrarMensaje(mensajeAdmin, 'Pista creada', 'ok');
    }
    limpiarFormPista();
    await cargarPistas();
    await cargarFranjas();
  } catch (err) {
    mostrarMensaje(mensajeAdmin, err.message);
  }
});

async function desactivarPista(pista) {
  if (!confirm(`¿Desactivar «${pista.nombre}»? No se podrá reservar, pero se conservan sus reservas.`)) return;
  try {
    await api(`/pistas/${pista.id}`, { method: 'DELETE' });
    mostrarMensaje(mensajeAdmin, 'Pista desactivada', 'ok');
    await cargarPistas();
    await cargarFranjas();
  } catch (err) {
    mostrarMensaje(mensajeAdmin, err.message);
  }
}

async function activarPista(pista) {
  try {
    await api(`/pistas/${pista.id}`, {
      method: 'PUT',
      body: { nombre: pista.nombre, descripcion: pista.descripcion, activa: true },
    });
    mostrarMensaje(mensajeAdmin, 'Pista activada', 'ok');
    await cargarPistas();
    await cargarFranjas();
  } catch (err) {
    mostrarMensaje(mensajeAdmin, err.message);
  }
}

// ---------- Arranque ----------

(async () => {
  usuario = await iniciarPagina('pistas.html');
  inputFecha.min = hoyISO();
  inputFecha.value = hoyISO();
  if (usuario.rol === 'admin') document.getElementById('seccion-admin').classList.remove('oculto');
  try {
    await cargarPistas();
  } catch (err) {
    mostrarMensaje(mensajeReserva, err.message);
  }
  await cargarFranjas();
})();
