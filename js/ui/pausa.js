/* =====================================================================
   PAUSA: botón "Pausa" (arriba a la derecha) y menús de pausa
   - Solitario y pareja local: congela todo. Continuar / Reiniciar / Salir al menú.
   - En línea, LÍDER (quien creó la sala): pausa directo. Reanudar / Reiniciar / Finalizar juego.
   - En línea, INVITADO: el botón solo PIDE la pausa al líder. Con el juego pausado:
     Reanudar / Salirse del juego, y "Esperando al líder" para reiniciar o finalizar.
   - Para reanudar en línea, cada uno toca "Reanudar" (check ✓). Con los dos, sigue el juego.
   ===================================================================== */

// Nombre que se muestra de un jugador. Hoy devuelve el personaje (Bubu o Dudu);
// más adelante se puede cambiar por un nombre de usuario sin tocar nada más.
function getNombreJugador(jugador) {
  const id = typeof jugador === 'string' ? jugador : jugador && jugador.personaje;
  return (CONFIG.personajes[id] && CONFIG.personajes[id].nombre) || 'Jugador';
}

const Pausa = {
  init(juego) {
    this.juego = juego;
    this.boton = document.getElementById('btn-pausa');
    // Funciona con dedo y mouse (pointerdown es inmediato en celular)
    this.boton.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.pulsar(); });
  },

  // Mostrar el botón solo mientras se juega
  actualizarBoton(visible) {
    if (this.boton) this.boton.classList.toggle('oculto', !visible);
  },

  // Botón "Pausa" o tecla Esc
  pulsar() {
    const juego = this.juego;
    if (juego.estado !== 'jugando') return;
    if (EnLinea.esInvitado) {
      // El invitado no pausa: envía una solicitud al líder
      EnLinea.enviar({ t: 'pedirPausa' });
      Menus.enLineaToast('Le pediste al líder pausar el juego');
      return;
    }
    juego.pausar();
  },

  // ---------- Solitario y pareja local ----------
  menuLocal() {
    Menus.mostrarHTML(`
      <div class="panel panel-pausa">
        <h2>Pausa</h2>
        <button class="btn grande verde" data-ir="seguir">Continuar</button>
        <button class="btn grande" data-ir="reiniciar">Reiniciar nivel</button>
        <button class="btn grande" data-ir="menu">Salir al menú</button>
        <button class="btn-enlace" data-ir="como">❓ Cómo jugar</button>
      </div>`);
    Menus.conectar({
      seguir: () => this.juego.reanudar(),
      reiniciar: () => this.juego.reiniciar(),
      menu: () => this.juego.irAlMenu(),
      como: () => Menus.comoJugar(() => this.menuLocal()),
    });
  },

  // Lista de jugadores con su check de "Reanudar"
  htmlChecks(listos, conectado) {
    const m = this.juego.mundo;
    if (!m) return '';
    return `<div class="checks-pausa">${m.jugadores.map((j, i) => {
      const fuera = i === 1 && !conectado;
      const marca = fuera ? '<span class="desconectado">desconectado</span>' : listos[i] ? '<b class="check">✓</b>' : '<span class="espera">…</span>';
      return `<div class="fila-check">${getNombreJugador(j)} ${marca}</div>`;
    }).join('')}</div>`;
  },

  // ---------- En línea: LÍDER ----------
  menuLider() {
    const listos = EnLinea.listos || [false, false];
    Menus.mostrarHTML(`
      <div class="panel panel-pausa">
        <h2>Pausa</h2>
        ${this.htmlChecks(listos, EnLinea.conectado)}
        <button class="btn grande verde" data-ir="reanudar" ${listos[0] ? 'disabled' : ''}>${listos[0] ? 'Esperando…' : 'Reanudar'}</button>
        <button class="btn grande" data-ir="reiniciar">Reiniciar nivel</button>
        <button class="btn grande" data-ir="finalizar">Finalizar juego</button>
        <button class="btn-enlace" data-ir="como">❓ Cómo jugar</button>
      </div>`);
    Menus.conectar({
      reanudar: () => EnLinea.marcarListo(0),
      reiniciar: () => this.juego.reiniciar(),
      finalizar: () => EnLinea.finalizar(),
      como: () => Menus.comoJugar(() => this.menuLider()),
    });
  },

  // ---------- En línea: INVITADO ----------
  menuInvitado(listos) {
    Menus.mostrarHTML(`
      <div class="panel panel-pausa">
        <h2>Pausa</h2>
        ${this.htmlChecks(listos, true)}
        <button class="btn grande verde" data-ir="reanudar" ${listos[1] ? 'disabled' : ''}>${listos[1] ? 'Esperando…' : 'Reanudar'}</button>
        <button class="btn grande" data-ir="salir">Salirse del juego</button>
        <p class="ayuda">Esperando al líder para reiniciar o finalizar.</p>
      </div>`);
    Menus.conectar({
      reanudar: () => { EnLinea.enviar({ t: 'listo' }); this.menuInvitado([listos[0], true]); },
      salir: () => EnLinea.cerrar(), // solo sale el invitado; el líder sigue jugando
    });
  },

  // ---------- Aviso al líder: "[nombre] quiere pausar" ----------
  avisoSolicitud(nombre) {
    let a = document.getElementById('aviso-pausa');
    if (!a) {
      a = document.createElement('div');
      a.id = 'aviso-pausa';
      document.getElementById('juego').appendChild(a);
    }
    a.innerHTML = `<span>${nombre} quiere pausar</span>
      <button data-r="si">Aceptar</button><button data-r="no">Ignorar</button>`;
    a.classList.add('visible');
    const cerrar = () => { a.classList.remove('visible'); clearTimeout(this.tAviso); };
    a.querySelector('[data-r="si"]').onpointerdown = (e) => { e.preventDefault(); cerrar(); if (this.juego.estado === 'jugando') this.juego.pausar(); };
    a.querySelector('[data-r="no"]').onpointerdown = (e) => { e.preventDefault(); cerrar(); };
    // Si el líder no responde, desaparece solo a los 5 segundos y NO se pausa
    clearTimeout(this.tAviso);
    this.tAviso = setTimeout(cerrar, 5000);
  },
};
