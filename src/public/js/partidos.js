const form = document.getElementById('form-partido');
const mensajeForm = document.getElementById('mensaje-form');
const mensajeLista = document.getElementById('mensaje-lista');
const filtro = document.getElementById('filtro-jugador');
const inputFecha = document.getElementById('partido-fecha');
const selectsJugadores = ['jugador-1a', 'jugador-1b', 'jugador-2a', 'jugador-2b']
  .map((id) => document.getElementById(id));

let usuario = null;

function rellenarSelects(jugadores) {
  for (const select of selectsJugadores) {
    select.replaceChildren(
      el('option', { value: '' }, '— Elige jugador —'),
      ...jugadores.map((j) => el('option', { value: j.id }, j.nombre))
    );
  }
  // Por comodidad, el usuario aparece ya como primer jugador del equipo 1
  selectsJugadores[0].value = usuario.id;

  filtro.replaceChildren(
    el('option', { value: '' }, 'Todos los partidos'),
    el('option', { value: usuario.id }, 'Mis partidos'),
    ...jugadores.filter((j) => j.id !== usuario.id).map((j) => el('option', { value: j.id }, `Partidos de ${j.nombre}`))
  );
}

function nombres(equipo) {
  return equipo.map((j) => j.nombre).join(' y ');
}

function elementoPartido(partido) {
  const puedeBorrar = partido.creado_por === usuario.id || usuario.rol === 'admin';
  return el('li', {},
    el('div', { style: 'flex:1' },
      el('div', { className: 'partido-meta' }, formatearFecha(partido.fecha)),
      el('div', { className: 'partido' },
        el('div', { className: partido.ganador === 1 ? 'equipo ganador' : 'equipo' }, nombres(partido.equipo1)),
        el('div', { className: 'marcador' }, `${partido.sets_equipo1} - ${partido.sets_equipo2}`),
        el('div', { className: partido.ganador === 2 ? 'equipo ganador' : 'equipo' }, nombres(partido.equipo2))
      )
    ),
    puedeBorrar
      ? el('button', { className: 'boton boton-pequeno boton-peligro', title: 'Borrar partido', onclick: () => borrar(partido) }, 'Borrar')
      : null
  );
}

async function cargarPartidos() {
  const lista = document.getElementById('lista-partidos');
  try {
    const ruta = filtro.value ? `/partidos?usuario_id=${encodeURIComponent(filtro.value)}` : '/partidos';
    const partidos = await api(ruta);
    if (partidos.length === 0) {
      lista.replaceChildren(el('li', { className: 'vacio', texto: 'No hay partidos registrados' }));
    } else {
      lista.replaceChildren(...partidos.map(elementoPartido));
    }
  } catch (err) {
    mostrarMensaje(mensajeLista, err.message);
  }
}

async function borrar(partido) {
  if (!confirm(`¿Borrar el partido ${nombres(partido.equipo1)} contra ${nombres(partido.equipo2)}?`)) return;
  try {
    await api(`/partidos/${partido.id}`, { method: 'DELETE' });
    mostrarMensaje(mensajeLista, 'Partido borrado', 'ok');
    await cargarPartidos();
  } catch (err) {
    mostrarMensaje(mensajeLista, err.message);
  }
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const ids = selectsJugadores.map((s) => Number(s.value));
  const sets1 = Number(document.getElementById('sets-1').value);
  const sets2 = Number(document.getElementById('sets-2').value);

  // Comprobaciones rápidas en el navegador (la API las vuelve a hacer)
  if (ids.some((id) => !id)) return mostrarMensaje(mensajeForm, 'Elige los 4 jugadores');
  if (new Set(ids).size !== 4) return mostrarMensaje(mensajeForm, 'Los 4 jugadores deben ser distintos');
  if (sets1 === sets2) return mostrarMensaje(mensajeForm, 'Un partido no puede acabar en empate');

  try {
    await api('/partidos', {
      method: 'POST',
      body: {
        fecha: inputFecha.value,
        equipo1: ids.slice(0, 2),
        equipo2: ids.slice(2),
        sets_equipo1: sets1,
        sets_equipo2: sets2,
      },
    });
    mostrarMensaje(mensajeForm, 'Partido guardado. ¡El ranking ya está actualizado!', 'ok');
    form.reset();
    inputFecha.value = hoyISO();
    selectsJugadores[0].value = usuario.id;
    await cargarPartidos();
  } catch (err) {
    mostrarMensaje(mensajeForm, err.message);
  }
});

filtro.addEventListener('change', cargarPartidos);

(async () => {
  usuario = await iniciarPagina('partidos.html');
  inputFecha.max = hoyISO();
  inputFecha.value = hoyISO();
  try {
    rellenarSelects(await api('/usuarios'));
  } catch (err) {
    mostrarMensaje(mensajeForm, err.message);
  }
  await cargarPartidos();
})();
