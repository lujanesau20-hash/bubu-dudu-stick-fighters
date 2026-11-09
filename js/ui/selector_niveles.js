/* =====================================================================
   SELECTOR DE MUNDOS Y NIVELES (el mismo en solitario, pareja y en línea)
   - Mundo 1 "Isla Flotante": 10 niveles que se desbloquean de a uno.
   - Mundos 2, 3 y 4: se desbloquean al terminar el mundo anterior.
   El avance se guarda en el navegador (Guardado.datos.nivelesSuperados).
   ===================================================================== */
Object.assign(Menus, {
  // Estado inicial: el primer nivel sin superar
  nuevaSeleccionNivel() {
    const nivel = PROGRESO.siguientePendiente();
    return { nivel, mundo: ESCENARIOS[nivel].mundo || nivel };
  },

  htmlSelectorNiveles(sel) {
    const mundos = BALANCE.mundos.map((mu, i) => {
      const abierto = PROGRESO.mundoDesbloqueado(mu.id);
      const ids = PROGRESO.nivelesDeMundo(mu.id);
      const hechos = ids.filter((id) => PROGRESO.superado(id)).length;
      const ant = PROGRESO.mundoAnterior(mu.id);
      const estado = !abierto ? `🔒 Termina el Mundo ${i} (${ant ? ant.nombre : ''})`
        : hechos === ids.length ? '✓ Completado'
        : ids.length > 1 ? `${hechos}/${ids.length} niveles` : 'Jefe final';
      return `<button class="btn-mundo ${sel.mundo === mu.id ? 'activo' : ''} ${abierto ? '' : 'bloqueado'}" data-mundo="${mu.id}" ${abierto ? '' : 'disabled'}>
        <span class="num-mundo">Mundo ${i + 1}</span><b>${mu.nombre}</b><small>${estado}</small></button>`;
    }).join('');

    const ids = PROGRESO.nivelesDeMundo(sel.mundo);
    let niveles = '';
    if (ids.length > 1) {
      niveles = `<div class="grilla-niveles">${ids.map((id) => {
        const e = ESCENARIOS[id];
        const abierto = PROGRESO.desbloqueado(id);
        const hecho = PROGRESO.superado(id);
        const info = `${e.oleadas.length} tramos${e.jefe ? ' + jefe' : ''}`;
        return `<button class="btn-nivel-num ${id === sel.nivel ? 'activo' : ''} ${hecho ? 'hecho' : ''}" data-nivel="${id}" ${abierto ? '' : 'disabled'} title="${info}">
          ${abierto ? e.numero : '🔒'}${hecho ? '<i>✓</i>' : ''}${e.jefe ? '<em>👑</em>' : ''}</button>`;
      }).join('')}</div>`;
      const e = ESCENARIOS[sel.nivel];
      if (e && e.mundo === sel.mundo) niveles += `<p class="info-nivel">${e.nombre}: ${e.oleadas.length} tramos${e.jefe ? ' + jefe final (El Gigante)' : ''}</p>`;
    } else if (ids.length === 1) {
      const e = ESCENARIOS[ids[0]];
      niveles = `<p class="info-nivel">${e.nombre}: ${e.oleadas.length} tramos + jefe final</p>`;
    }
    return `<div class="selector-mundos">${mundos}</div>${niveles}`;
  },

  // Conecta los botones; "repintar" vuelve a dibujar la pantalla que contiene el selector
  conectarSelectorNiveles(sel, repintar) {
    this.cont.querySelectorAll('[data-mundo]').forEach((b) => b.onclick = () => {
      sel.mundo = b.dataset.mundo;
      const ids = PROGRESO.nivelesDeMundo(sel.mundo);
      sel.nivel = ids.find((id) => PROGRESO.desbloqueado(id) && !PROGRESO.superado(id))
        || [...ids].reverse().find((id) => PROGRESO.desbloqueado(id)) || ids[0];
      repintar();
    });
    this.cont.querySelectorAll('[data-nivel]').forEach((b) => b.onclick = () => { sel.nivel = b.dataset.nivel; repintar(); });
  },
});
