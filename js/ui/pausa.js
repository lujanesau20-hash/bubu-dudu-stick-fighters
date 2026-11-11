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
    PantallaCompleta.init();
    this.aplicarTamano();
    window.addEventListener('resize', () => this.aplicarTamano());
    window.addEventListener('touchstart', () => this.aplicarTamano(), { once: true, passive: true });
  },

  // Medidas del botón (celular o laptop) desde config/interfaz.js
  medidasBoton() {
    const cfg = CONFIG.interfaz.botonPausa;
    const celular = (this.juego && this.juego.esTactil) || esDispositivoTactil();
    return Object.assign({ margen: cfg.margen }, celular ? cfg.celular : cfg.laptop);
  },
  aplicarTamano() {
    if (!this.boton) return;
    const m = this.medidasBoton(), st = this.boton.style;
    st.height = m.alto + 'px'; st.minWidth = m.ancho + 'px'; st.fontSize = m.letra + 'px';
    st.top = m.margen + 'px'; st.right = m.margen + 'px';
    st.opacity = CONFIG.interfaz.botonPausa.opacidad;
    PantallaCompleta.aplicarTamano(m);
  },

  // Mostrar el botón solo mientras se juega
  actualizarBoton(visible) {
    this.visible = !!visible;
    if (this.boton) this.boton.classList.toggle('oculto', !visible);
    PantallaCompleta.actualizarIcono(this.visible);
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
      <div class="version-esquina">v${VERSION_VISIBLE}</div>
      <div class="panel panel-pausa">
        <h2>Pausa</h2>
        <button class="btn grande verde" data-ir="seguir">Continuar</button>
        <button class="btn grande" data-ir="reiniciar">Reiniciar nivel</button>
        <button class="btn grande" data-ir="menu">Salir al menú</button>
        ${PantallaCompleta.htmlBoton()}
        <button class="btn-enlace" data-ir="como">❓ Cómo jugar</button>
      </div>`);
    Menus.conectar({
      seguir: () => this.juego.reanudar(),
      reiniciar: () => this.juego.reiniciar(),
      menu: () => this.juego.irAlMenu(),
      pantalla: () => PantallaCompleta.alternar(),
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
      <div class="version-esquina">v${VERSION_VISIBLE}</div>
      <div class="panel panel-pausa">
        <h2>Pausa</h2>
        ${this.htmlChecks(listos, EnLinea.conectado)}
        <button class="btn grande verde" data-ir="reanudar" ${listos[0] ? 'disabled' : ''}>${listos[0] ? 'Esperando…' : 'Reanudar'}</button>
        <button class="btn grande" data-ir="reiniciar">Reiniciar nivel</button>
        <button class="btn grande" data-ir="finalizar">Finalizar juego</button>
        ${PantallaCompleta.htmlBoton()}
        <button class="btn-enlace" data-ir="como">❓ Cómo jugar</button>
      </div>`);
    Menus.conectar({
      reanudar: () => EnLinea.marcarListo(0),
      reiniciar: () => this.juego.reiniciar(),
      finalizar: () => EnLinea.finalizar(),
      pantalla: () => PantallaCompleta.alternar(),
      como: () => Menus.comoJugar(() => this.menuLider()),
    });
  },

  // ---------- En línea: INVITADO ----------
  menuInvitado(listos) {
    Menus.mostrarHTML(`
      <div class="version-esquina">v${VERSION_VISIBLE}</div>
      <div class="panel panel-pausa">
        <h2>Pausa</h2>
        ${this.htmlChecks(listos, true)}
        <button class="btn grande verde" data-ir="reanudar" ${listos[1] ? 'disabled' : ''}>${listos[1] ? 'Esperando…' : 'Reanudar'}</button>
        <button class="btn grande" data-ir="salir">Salirse del juego</button>
        ${PantallaCompleta.htmlBoton()}
        <p class="ayuda">Esperando al líder para reiniciar o finalizar.</p>
      </div>`);
    Menus.conectar({
      reanudar: () => { EnLinea.enviar({ t: 'listo' }); this.menuInvitado([listos[0], true]); },
      salir: () => EnLinea.cerrar(), // solo sale el invitado; el líder sigue jugando
      pantalla: () => PantallaCompleta.alternar(),
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
    // Color sólido y legible (config/interfaz.js)
    const ca = CONFIG.interfaz.avisoPausa;
    a.style.background = ca.fondo; a.style.opacity = ''; a.style.color = ca.texto;
    a.innerHTML = `<span>${nombre} quiere pausar</span>
      <button data-r="si" style="background:${ca.botonAceptar}">Aceptar</button><button data-r="no" style="background:${ca.botonIgnorar}">Ignorar</button>
      <div class="barra-tiempo" style="height:${ca.altoBarraTiempo}px;background:${ca.texto}"></div>`;
    a.classList.add('visible');
    a.style.opacity = ca.opacidadFondo;
    // Barra fina que se vacía en los segundos del aviso
    const barra = a.querySelector('.barra-tiempo');
    barra.style.transition = 'none'; barra.style.transform = 'scaleX(1)';
    void barra.offsetWidth; // reiniciar la animación
    barra.style.transition = `transform ${ca.segundos}s linear`; barra.style.transform = 'scaleX(0)';
    const cerrar = () => { a.classList.remove('visible'); a.style.opacity = ''; clearTimeout(this.tAviso); };
    a.querySelector('[data-r="si"]').onpointerdown = (e) => { e.preventDefault(); cerrar(); if (this.juego.estado === 'jugando') this.juego.pausar(); };
    a.querySelector('[data-r="no"]').onpointerdown = (e) => { e.preventDefault(); cerrar(); };
    // Si el líder no responde, desaparece solo a los 5 segundos y NO se pausa
    clearTimeout(this.tAviso);
    this.tAviso = setTimeout(cerrar, ca.segundos * 1000);
  },
};

/* =====================================================================
   PANTALLA COMPLETA (config/interfaz.js -> pantallaCompleta)
   - Icono pequeño debajo del botón "Pausa" (solo mientras se juega).
   - Botón "Pantalla completa" / "Salir de pantalla completa" en los menús de pausa.
   - Tecla F en laptop.
   - Si el navegador no la permite (por ejemplo, iPhone), no se muestran el icono
     ni el botón; la tecla F muestra un aviso breve.
   - En celular, al entrar intenta dejar la pantalla fija en horizontal.
   ===================================================================== */
const PantallaCompleta = {
  init() {
    this.icono = document.getElementById('btn-pantalla');
    if (this.icono) {
      this.icono.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.alternar(); });
      this.dibujarIcono();
    }
    const cambio = () => { this.dibujarIcono(); this.actualizarBotonesMenu(); };
    document.addEventListener('fullscreenchange', cambio);
    document.addEventListener('webkitfullscreenchange', cambio);
    window.addEventListener('keydown', (e) => {
      if (e.code !== CONFIG.interfaz.pantallaCompleta.tecla || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return; // escribiendo un código
      e.preventDefault();
      this.alternar();
    });
  },

  // ¿El navegador deja poner la página en pantalla completa?
  soportada() {
    const el = document.documentElement;
    return !!((el.requestFullscreen || el.webkitRequestFullscreen) && (document.fullscreenEnabled || document.webkitFullscreenEnabled));
  },
  activa() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },

  alternar() {
    if (!this.soportada()) {
      if (typeof Menus !== 'undefined' && Menus.enLineaToast) Menus.enLineaToast('Este navegador no permite pantalla completa');
      return;
    }
    if (this.activa()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return;
    }
    const el = document.documentElement;
    const r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    // Celular: fijar en horizontal si el navegador lo permite (si no, no pasa nada)
    const fijar = () => {
      const c = CONFIG.interfaz.pantallaCompleta;
      if (c.bloquearHorizontal && esDispositivoTactil() && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
    };
    if (r && r.then) r.then(fijar).catch(() => {}); else fijar();
  },

  textoBoton() { return this.activa() ? 'Salir de pantalla completa' : 'Pantalla completa'; },
  // Botón para los menús de pausa (vacío si el navegador no la permite)
  htmlBoton() { return this.soportada() ? `<button class="btn" data-ir="pantalla">${this.textoBoton()}</button>` : ''; },
  actualizarBotonesMenu() {
    document.querySelectorAll('[data-ir="pantalla"]').forEach((b) => { b.textContent = this.textoBoton(); });
  },

  // Icono: cuatro esquinas hacia afuera (entrar) o hacia adentro (salir)
  dibujarIcono() {
    if (!this.icono) return;
    const fuera = 'M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6';
    const dentro = 'M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6';
    this.icono.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${this.activa() ? dentro : fuera}"/></svg>`;
    const t = this.activa() ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)';
    this.icono.title = t; this.icono.setAttribute('aria-label', t);
  },

  // Tamaño y lugar: debajo del botón "Pausa", alineado a la derecha
  aplicarTamano(mPausa) {
    if (!this.icono) return;
    const c = CONFIG.interfaz.pantallaCompleta;
    const celular = (Pausa.juego && Pausa.juego.esTactil) || esDispositivoTactil();
    const lado = celular ? c.icono.celular : c.icono.laptop;
    const mp = mPausa || Pausa.medidasBoton();
    const st = this.icono.style;
    st.width = st.height = lado + 'px';
    st.right = mp.margen + 'px';
    st.top = (mp.margen + mp.alto + c.separacion) + 'px';
    st.opacity = c.opacidad;
  },

  // Visible solo mientras se ve el botón "Pausa" y si el navegador la permite
  actualizarIcono(visible) {
    if (!this.icono) return;
    const ver = !!visible && this.soportada();
    if (ver === this._visible) return;
    this._visible = ver;
    this.icono.classList.toggle('oculto', !ver);
  },
  iconoVisible() { return this._visible ? this.icono : null; },
};
