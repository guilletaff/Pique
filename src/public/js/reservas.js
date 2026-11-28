const mensaje = document.getElementById('mensaje');

function elementoReserva(reserva, cancelable) {
  return el('li', {},
    el('div', {},
      el('strong', {}, reserva.pista),
      el('div', { className: 'detalle' },
        `${formatearFecha(reserva.inicio)} · de ${formatearHora(reserva.inicio)} a ${formatearHora(reserva.fin)}`
      )
    ),
    cancelable
      ? el('button', { className: 'boton boton-pequeno boton-peligro', onclick: () => cancelar(reserva) }, 'Cancelar')
      : null
  );
}

function pintarLista(id, reservas, cancelable, textoVacio) {
  const lista = document.getElementById(id);
  if (reservas.length === 0) {
    lista.replaceChildren(el('li', { className: 'vacio', texto: textoVacio }));
  } else {
    lista.replaceChildren(...reservas.map((r) => elementoReserva(r, cancelable)));
  }
}

async function cargar() {
  try {
    const reservas = await api('/reservas/mias'); // vienen ordenadas por fecha
    const ahora = new Date();
    const proximas = reservas.filter((r) => new Date(r.fin) > ahora);
    const pasadas = reservas.filter((r) => new Date(r.fin) <= ahora).reverse();
    pintarLista('lista-proximas', proximas, true, 'No tienes reservas próximas. ¡Reserva una pista!');
    pintarLista('lista-pasadas', pasadas, false, 'Todavía no hay reservas pasadas');
  } catch (err) {
    mostrarMensaje(mensaje, err.message);
  }
}

async function cancelar(reserva) {
  const texto = `${reserva.pista}, ${formatearFecha(reserva.inicio)} a las ${formatearHora(reserva.inicio)}`;
  if (!confirm(`¿Cancelar la reserva de ${texto}?`)) return;
  try {
    await api(`/reservas/${reserva.id}`, { method: 'DELETE' });
    mostrarMensaje(mensaje, 'Reserva cancelada', 'ok');
    await cargar();
  } catch (err) {
    mostrarMensaje(mensaje, err.message);
  }
}

(async () => {
  await iniciarPagina('reservas.html');
  await cargar();
})();
