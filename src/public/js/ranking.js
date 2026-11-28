const MEDALLAS = { 1: '🥇', 2: '🥈', 3: '🥉' };

(async () => {
  const usuario = await iniciarPagina('ranking.html');
  const tabla = document.getElementById('tabla-ranking');

  try {
    const ranking = await api('/ranking');
    if (ranking.length === 0) {
      tabla.replaceChildren(
        el('tr', {}, el('td', { colspan: 8, className: 'vacio' }, 'Todavía no hay partidos. ¡Registra el primero!'))
      );
      return;
    }

    tabla.replaceChildren(...ranking.map((fila) =>
      el('tr', { className: fila.id === usuario.id ? 'yo' : null },
        el('td', { className: 'num' }, MEDALLAS[fila.posicion] ? el('span', { className: 'medalla' }, MEDALLAS[fila.posicion]) : fila.posicion),
        el('td', {}, fila.nombre),
        el('td', { className: 'num' }, fila.jugados),
        el('td', { className: 'num' }, fila.ganados),
        el('td', { className: 'num' }, fila.perdidos),
        el('td', { className: 'num' }, fila.sets_favor),
        el('td', { className: 'num' }, fila.sets_contra),
        el('td', { className: 'num' }, el('strong', {}, fila.puntos))
      )
    ));
  } catch (err) {
    mostrarMensaje(document.getElementById('mensaje'), err.message);
  }
})();
