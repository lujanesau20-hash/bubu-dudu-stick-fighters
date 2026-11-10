/* =====================================================================
   PANTALLAS DEL JUEGO EN LÍNEA (botones grandes, aptos para celular)
   ===================================================================== */
Object.assign(Menus, {
  enLineaInicio(error = '') {
    const ok = EnLinea.disponible();
    this.mostrarHTML(`
      <div class="panel panel-enlinea">
        <h2>🌐 Jugar en línea</h2>
        <p>Juega "Niveles en pareja" con otra persona, cada una en su dispositivo.<br>Quien crea la sala es <b>Bubu</b>; quien se une es <b>Dudu</b>.</p>
        ${ok ? '' : '<p class="error-red">No se pudo cargar la conexión en línea. Revisa tu internet y recarga la página.</p>'}
        ${error ? `<p class="error-red">${error}</p>` : ''}
        <button class="btn grande" data-ir="crear" ${ok ? '' : 'disabled'}>➕ Crear sala</button>
        <button class="btn grande" data-ir="unirse" ${ok ? '' : 'disabled'}>🔑 Unirse a sala</button>
        <p class="nota-red">💡 Consejo: que cree la sala el dispositivo más potente (por ejemplo, la laptop). Ese dispositivo calcula todo el juego.</p>
        <button class="btn" data-ir="volver">Volver</button>
      </div>`);
    this.conectar({
      crear: () => { this.pantallaCompletaCelular(); EnLinea.crearSala(); },
      unirse: () => this.enLineaUnirse(),
      volver: () => this.principal(),
    });
  },

  enLineaCreando() {
    this.mostrarHTML(`<div class="panel panel-enlinea"><h2>Creando sala…</h2><div class="barra-carga"><div></div></div>
      <button class="btn" data-ir="cancelar">Cancelar</button></div>`);
    this.conectar({ cancelar: () => { EnLinea.cerrar(true); this.enLineaInicio(); } });
  },

  enLineaEsperando(codigo, nota = '') {
    const enlace = location.origin + location.pathname + '?sala=' + codigo;
    this.mostrarHTML(`
      <div class="panel panel-enlinea">
        <h2>Tu sala</h2>
        <p>Comparte este código con la otra persona:</p>
        <div class="codigo-sala">${codigo}</div>
        <div class="fila-botones">
          <button class="btn grande" data-ir="copiar">📋 Copiar código</button>
          <button class="btn grande" data-ir="compartir">🔗 Compartir enlace</button>
        </div>
        <p class="esperando">⏳ ${nota || 'Esperando al otro jugador…'}</p>
        <p class="nota-red" id="nota-red"></p>
        <button class="btn" data-ir="cancelar">Cancelar y cerrar sala</button>
      </div>`);
    this.conectar({
      copiar: () => copiarTexto(codigo).then(() => this.enLineaToast('Código copiado')),
      compartir: () => {
        if (navigator.share) navigator.share({ title: 'Bubu & Dudu', text: `¡Juega conmigo! Código de sala: ${codigo}`, url: enlace }).catch(() => {});
        else copiarTexto(enlace).then(() => this.enLineaToast('Enlace copiado'));
      },
      cancelar: () => { EnLinea.cerrar(true); this.enLineaInicio(); },
    });
  },

  enLineaUnirse(codigoInicial = '', error = '') {
    let codigo = codigoInicial.replace(/\D/g, '').slice(0, RED_CONFIG.digitosCodigo);
    const pintar = () => {
      const casillas = Array.from({ length: RED_CONFIG.digitosCodigo }, (_, i) => `<span class="digito ${codigo[i] ? 'lleno' : ''}">${codigo[i] || ''}</span>`).join('');
      this.mostrarHTML(`
        <div class="panel panel-enlinea">
          <h2>Unirse a sala</h2>
          <div class="campo-codigo">${casillas}</div>
          ${error ? `<p class="error-red">${error}</p>` : ''}
          <div class="teclado-num">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button class="tecla-num" data-n="${n}">${n}</button>`).join('')}
            <button class="tecla-num" data-borrar>⌫</button>
            <button class="tecla-num" data-n="0">0</button>
            <button class="tecla-num verde" data-ir="entrar" ${codigo.length === RED_CONFIG.digitosCodigo ? '' : 'disabled'}>✓</button>
          </div>
          <button class="btn" data-ir="volver">Volver</button>
        </div>`);
      this.cont.querySelectorAll('[data-n]').forEach((b) => b.onclick = () => {
        if (codigo.length < RED_CONFIG.digitosCodigo) { codigo += b.dataset.n; error = ''; pintar(); }
      });
      const borrar = this.cont.querySelector('[data-borrar]');
      if (borrar) borrar.onclick = () => { codigo = codigo.slice(0, -1); pintar(); };
      this.conectar({
        entrar: () => { this.pantallaCompletaCelular(); EnLinea.unirse(codigo); },
        volver: () => this.enLineaInicio(),
      });
    };
    // También con el teclado físico
    this.tecladoCodigo = (e) => {
      if (!document.querySelector('.teclado-num')) { window.removeEventListener('keydown', this.tecladoCodigo); return; }
      if (/^\d$/.test(e.key) && codigo.length < RED_CONFIG.digitosCodigo) { codigo += e.key; error = ''; pintar(); }
      else if (e.key === 'Backspace') { codigo = codigo.slice(0, -1); pintar(); }
      else if (e.key === 'Enter' && codigo.length === RED_CONFIG.digitosCodigo) EnLinea.unirse(codigo);
    };
    window.removeEventListener('keydown', this.tecladoCodigo);
    window.addEventListener('keydown', this.tecladoCodigo);
    pintar();
  },

  enLineaUniendo(codigo) {
    this.mostrarHTML(`<div class="panel panel-enlinea"><h2>Conectando a la sala ${codigo}…</h2><div class="barra-carga"><div></div></div>
      <p class="nota-red" id="nota-red"></p><button class="btn" data-ir="cancelar">Cancelar</button></div>`);
    this.conectar({ cancelar: () => { EnLinea.cerrar(true); this.enLineaUnirse(codigo); } });
  },

  // Si conectar tarda más de 15 s, sugerir un servidor TURN
  enLineaAvisoLento() {
    const nota = document.getElementById('nota-red');
    const texto = 'La conexión está tardando. Algunas redes móviles bloquean la conexión directa: prueben con Wi-Fi, o agreguen un servidor TURN en config/red.js.';
    if (nota) nota.textContent = texto; else this.enLineaToast(texto, 7000);
  },

  enLineaConectado() {
    const anfitrion = EnLinea.esAnfitrion;
    const tarjeta = (id, quien) => `<div class="tarjeta"><div class="etiqueta-j ${id === 'bubu' ? 'j1' : 'j2'}">${quien}</div>
      ${PERSONAJES.htmlRetrato(id)}<div class="nombre">${CONFIG.personajes[id].nombre}</div></div>`;
    // El anfitrión elige con la misma lista de mundos y niveles (según SU avance)
    if (!this.selRed) this.selRed = this.nuevaSeleccionNivel();
    const sel = this.selRed;
    this.mostrarHTML(`
      <div class="panel panel-enlinea">
        <h2 class="verde-txt">✔ Conectado</h2>
        <p>Sala ${EnLinea.codigo}</p>
        <div class="tarjetas">${tarjeta('bubu', anfitrion ? 'Tú' : 'Anfitrión')}${tarjeta('dudu', anfitrion ? 'Invitado' : 'Tú')}</div>
        ${anfitrion ? `<p>Elige mundo y nivel:</p>${this.htmlSelectorNiveles(sel)}
            <button class="btn grande verde" data-ir="iniciar">▶ Iniciar: ${ESCENARIOS[sel.nivel].nombre}</button>`
          : '<p class="esperando">⏳ Esperando a que el anfitrión elija el nivel…</p>'}
        <button class="btn" data-ir="salir">${anfitrion ? 'Cerrar sala' : 'Salir de la sala'}</button>
      </div>`);
    if (anfitrion) this.conectarSelectorNiveles(sel, () => this.enLineaConectado());
    this.conectar({ salir: () => EnLinea.cerrar(), iniciar: () => EnLinea.iniciar(sel.nivel) });
  },

  enLineaInvitadoDesconectado(codigo) {
    this.mostrarHTML(`
      <div class="panel panel-enlinea">
        <h2 class="rojo">Dudu se desconectó</h2>
        <p>Puedes seguir jugando solo o esperar a que vuelva a entrar con el código <b>${codigo}</b>.</p>
        <button class="btn grande" data-ir="solo">Seguir solo</button>
        <button class="btn grande" data-ir="esperar">Esperar a que vuelva</button>
        <button class="btn" data-ir="menu">Cerrar sala</button>
      </div>`);
    this.conectar({
      solo: () => EnLinea.seguirSolo(),
      esperar: () => {
        this.mostrarHTML(`<div class="panel panel-enlinea"><h2>Esperando a Dudu…</h2>
          <div class="codigo-sala">${codigo}</div><p class="esperando">⏳ El juego sigue en pausa hasta que vuelva.</p>
          <button class="btn grande" data-ir="solo">Seguir solo</button><button class="btn" data-ir="menu">Cerrar sala</button></div>`);
        this.conectar({ solo: () => EnLinea.seguirSolo(), menu: () => EnLinea.cerrar() });
      },
      menu: () => EnLinea.cerrar(),
    });
  },

  enLineaMenuInvitado() {
    this.mostrarHTML(`
      <div class="panel panel-enlinea">
        <h2>Menú</h2>
        <p class="ayuda">El juego no se detiene: solo el anfitrión puede pausar.</p>
        <button class="btn grande" data-ir="seguir">Seguir jugando</button>
        <button class="btn" data-ir="como">❓ Cómo jugar</button>
        <button class="btn" data-ir="salir">Salir de la sala</button>
      </div>`);
    const cerrar = () => { EnLinea.menuAbierto = false; if (EnLinea.pausadoPorAnfitrion) this.enLineaPausaAnfitrion(); else this.ocultar(); };
    this.conectar({
      seguir: cerrar,
      como: () => this.comoJugar(() => this.enLineaMenuInvitado()),
      salir: () => EnLinea.cerrar(),
    });
  },

  enLineaPausaAnfitrion() {
    if (EnLinea.menuAbierto) return;
    this.mostrarHTML(`<div class="panel panel-enlinea"><h2>Pausa</h2><p>⏸ El anfitrión pausó el juego. Continuará cuando lo reanude.</p>
      <button class="btn" data-ir="salir">Salir de la sala</button></div>`);
    this.conectar({ salir: () => EnLinea.cerrar() });
  },

  enLineaFinInvitado(d) {
    const gano = d.tipo === 'victoria';
    this.mostrarHTML(`
      <div class="panel panel-enlinea">
        <h2 class="${gano ? 'dorado' : 'rojo'}">${gano ? '¡NIVEL SUPERADO!' : 'GAME OVER'}</h2>
        <p>Monedas ganadas: 🪙 ${d.monedas || 0}</p>
        <p class="esperando">⏳ Esperando a que el anfitrión elija qué hacer…</p>
        <button class="btn" data-ir="salir">Salir de la sala</button>
      </div>`);
    this.conectar({ salir: () => EnLinea.cerrar() });
  },

  enLineaMensaje(texto, alAceptar) {
    this.mostrarHTML(`<div class="panel panel-enlinea"><h2>Juego en línea</h2><p>${texto}</p>
      <button class="btn grande" data-ir="ok">Aceptar</button></div>`);
    this.conectar({ ok: () => alAceptar() });
  },

  // Aviso de conexión ENCIMA del juego (el juego sigue visible detrás: nunca pantalla negra).
  // botones: { reintentar: true | función, salir: true }
  avisoRed(titulo, texto, botones = {}) {
    let a = document.getElementById('aviso-red');
    if (!a) { a = document.createElement('div'); a.id = 'aviso-red'; document.getElementById('juego').appendChild(a); }
    const clave = titulo + '|' + texto + '|' + Object.keys(botones).join(',');
    if (a.dataset.clave === clave && !a.classList.contains('oculto')) return; // ya está así (no redibujar)
    a.dataset.clave = clave;
    a.innerHTML = `<div class="caja-aviso-red"><b>${titulo}</b><p>${texto}</p><div class="fila-botones">
      ${botones.reintentar ? '<button class="btn" data-a="reintentar">Reintentar</button>' : ''}
      ${botones.salir ? '<button class="btn" data-a="salir">Salir</button>' : ''}</div></div>`;
    a.classList.remove('oculto');
    const reint = a.querySelector('[data-a="reintentar"]');
    if (reint) reint.onclick = () => {
      if (typeof botones.reintentar === 'function') botones.reintentar();
      else { EnLinea.reconectando = null; EnLinea.reconectar('botón Reintentar'); }
    };
    const salir = a.querySelector('[data-a="salir"]');
    if (salir) salir.onclick = () => { this.ocultarAvisoRed(); EnLinea.cerrar(); };
  },
  ocultarAvisoRed() {
    const a = document.getElementById('aviso-red');
    if (a) { a.classList.add('oculto'); a.dataset.clave = ''; }
  },

  enLineaToast(texto, ms = 2500) {
    let t = document.getElementById('toast-red');
    if (!t) { t = document.createElement('div'); t.id = 'toast-red'; document.getElementById('juego').appendChild(t); }
    t.textContent = texto;
    t.classList.add('visible');
    clearTimeout(this.tToast);
    this.tToast = setTimeout(() => t.classList.remove('visible'), ms);
  },

  pantallaCompletaCelular() {
    if (esDispositivoTactil() && !document.fullscreenElement) pantallaCompleta();
  },
});

// Copiar al portapapeles (con alternativa para navegadores sin permiso)
function copiarTexto(texto) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto).catch(() => copiarViejo(texto));
  copiarViejo(texto);
  return Promise.resolve();
}
function copiarViejo(texto) {
  const a = document.createElement('textarea');
  a.value = texto; a.style.position = 'fixed'; a.style.opacity = '0';
  document.body.appendChild(a); a.select();
  try { document.execCommand('copy'); } catch (e) { /* sin portapapeles */ }
  a.remove();
}
