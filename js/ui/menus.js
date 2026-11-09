/* =====================================================================
   MENÚS (HTML sobre el canvas): principal, selección de personaje,
   pausa, game over, victoria, fin de versus y tienda.
   ===================================================================== */
const Menus = {
  init(juego) {
    this.juego = juego;
    this.cont = document.getElementById('pantallas');
    this.tienda = new TiendaUI(this.cont);
  },

  ocultar() { this.cont.innerHTML = ''; this.cont.classList.add('oculto'); },
  mostrarHTML(html) { this.cont.classList.remove('oculto'); this.cont.innerHTML = html; },

  // Asigna funciones a botones con data-ir
  conectar(acciones) {
    this.cont.querySelectorAll('[data-ir]').forEach((b) => {
      b.onclick = () => acciones[b.dataset.ir] && acciones[b.dataset.ir](b);
    });
  },

  principal() {
    this.mostrarHTML(`
      <div class="panel panel-principal">
        <h1 class="titulo"><span class="t-bubu">Bubu</span> <span class="t-y">&</span> <span class="t-dudu">Dudu</span></h1>
        <p class="subtitulo">Stick Fighters</p>
        <button class="btn grande" data-ir="solo">Niveles en solitario</button>
        <button class="btn grande" data-ir="pareja">Niveles en pareja</button>
        <button class="btn grande" data-ir="versus">Versus</button>
        <div class="fila-botones">
          <button class="btn" data-ir="tienda">🛍 Tienda</button>
          <button class="btn" disabled title="Fase 2">🌐 En línea (pronto)</button>
          <button class="btn" data-ir="pantalla">⛶</button>
        </div>
        <div class="monedas-menu">🪙 ${Guardado.datos.monedas}</div>
      </div>`);
    this.conectar({
      solo: () => this.seleccion('solo'),
      pareja: () => this.seleccion('pareja'),
      versus: () => this.seleccion('versus'),
      tienda: () => this.tienda.abrir(() => this.principal()),
      pantalla: () => pantallaCompleta(),
    });
  },

  seleccion(modo) {
    const ids = Object.keys(CONFIG.personajes);
    let elegido = 'bubu';
    const titulos = { solo: 'Niveles en solitario', pareja: 'Niveles en pareja', versus: 'Versus' };
    const tactil = esDispositivoTactil();
    const ayuda = modo === 'solo'
      ? (tactil ? 'Joystick: moverse / agacharse · ▲: saltar (2 toques = doble salto) · H1–H4: habilidades · Desliza de un botón al vecino para combinar'
        : 'A/D o ←/→ moverse · W/Espacio saltar (2 veces = doble salto) · S/↓ agacharse · 1-4 o J K L I habilidades · Dos vecinas casi a la vez = combinación')
      : 'J1: A/D mover · W/Espacio saltar · S agachar · 1-4 habilidades · E revivir<br>J2: ←/→ mover · ↑ saltar · ↓ agachar · 7 8 9 0 (o teclado num. 1-4) habilidades · Shift der./Enter revivir';

    const pintar = () => {
      const tarjetas = ids.map((id) => {
        let etiqueta = '';
        if (modo !== 'solo') etiqueta = `<div class="etiqueta-j ${id === elegido ? 'j1' : 'j2'}">${id === elegido ? 'J1' : 'J2'}</div>`;
        return `<div class="tarjeta ${modo === 'solo' && id === elegido ? 'elegida' : ''}" data-id="${id}">
          ${etiqueta}<img src="${CONFIG.personajes[id].sprite}" alt="${CONFIG.personajes[id].nombre}">
          <div class="nombre">${CONFIG.personajes[id].nombre}</div></div>`;
      }).join('');
      this.mostrarHTML(`
        <div class="panel">
          <h2>${titulos[modo]}</h2>
          <p>${modo === 'solo' ? 'Elige tu personaje' : 'Toca un personaje para que sea el Jugador 1'}</p>
          <div class="tarjetas">${tarjetas}</div>
          <p class="ayuda">${ayuda}</p>
          <div class="fila-botones">
            <button class="btn" data-ir="volver">Volver</button>
            <button class="btn grande verde" data-ir="jugar">¡Jugar!</button>
          </div>
        </div>`);
      this.cont.querySelectorAll('.tarjeta').forEach((t) => t.onclick = () => { elegido = t.dataset.id; pintar(); });
      this.conectar({
        volver: () => this.principal(),
        jugar: () => {
          const otro = ids.find((i) => i !== elegido);
          const personajes = modo === 'solo' ? [elegido] : [elegido, otro];
          this.juego.iniciarPartida(modo, personajes);
        },
      });
    };
    pintar();
  },

  pausa() {
    this.mostrarHTML(`
      <div class="panel">
        <h2>Pausa</h2>
        <button class="btn grande" data-ir="seguir">Continuar</button>
        <button class="btn" data-ir="reiniciar">Reiniciar nivel</button>
        <button class="btn" data-ir="menu">Menú principal</button>
      </div>`);
    this.conectar({
      seguir: () => this.juego.reanudar(),
      reiniciar: () => this.juego.reiniciar(),
      menu: () => this.juego.irAlMenu(),
    });
  },

  gameOver(monedas) {
    this.mostrarHTML(`
      <div class="panel">
        <h2 class="rojo">GAME OVER</h2>
        <p>Monedas conseguidas: 🪙 ${monedas}</p>
        <button class="btn grande" data-ir="reintentar">Reintentar</button>
        <button class="btn" data-ir="menu">Menú principal</button>
      </div>`);
    this.conectar({ reintentar: () => this.juego.reiniciar(), menu: () => this.juego.irAlMenu() });
  },

  victoria(monedas, hayMas) {
    this.mostrarHTML(`
      <div class="panel">
        <h2 class="dorado">¡NIVEL SUPERADO!</h2>
        <p>Monedas ganadas: 🪙 ${monedas} · Total: 🪙 ${Guardado.datos.monedas}</p>
        <button class="btn grande verde" data-ir="tienda">🛍 Ir a la tienda</button>
        ${hayMas ? '' : '<p class="ayuda">Los siguientes escenarios (Cielo, Espacio y Ciudad) llegarán pronto.</p>'}
        <button class="btn" data-ir="otra">Jugar otra vez</button>
        <button class="btn" data-ir="menu">Menú principal</button>
      </div>`);
    this.conectar({
      tienda: () => this.tienda.abrir(() => this.victoria(monedas, hayMas)),
      otra: () => this.juego.reiniciar(),
      menu: () => this.juego.irAlMenu(),
    });
  },

  finVersus(nombre) {
    this.mostrarHTML(`
      <div class="panel">
        <h2 class="dorado">¡${nombre} GANA!</h2>
        <button class="btn grande" data-ir="revancha">Revancha</button>
        <button class="btn" data-ir="menu">Menú principal</button>
      </div>`);
    this.conectar({ revancha: () => this.juego.reiniciar(), menu: () => this.juego.irAlMenu() });
  },
};

function pantallaCompleta() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
  } else if (document.exitFullscreen) document.exitFullscreen();
}
