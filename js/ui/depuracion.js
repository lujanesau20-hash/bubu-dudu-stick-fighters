/* =====================================================================
   PANEL DE DEPURACIÓN (oculto)
   Se abre/cierra con F3 o tocando 5 veces la esquina superior izquierda.
   Columna izquierda (RED): rol, ping de los mensajes, ida y vuelta real de la
   red (WebRTC), snapshots enviados (líder) o recibidos (invitado) por segundo,
   tamaño, conexión (directa / TURN), canal rápido, TURN y colas.
   Columna derecha (RENDIMIENTO): FPS, tiempo por cuadro de simulación, dibujo
   y armado/envío de snapshots, bloqueo del hilo principal, cuadros sin
   dibujar, enemigos y efectos, y el PEOR MOMENTO de la partida.
   También: versión del juego, errores de las hojas de sprites y el botón
   "Copiar registro" (últimos 5 minutos, segundo a segundo, en texto simple).
   Valores en config/red.js y config/interfaz.js (medicion).
   ===================================================================== */
const Depuracion = {
  visible: false,
  fps: 0,
  snapsPorSeg: 0,
  bytesPromedio: 0,
  tipoConexion: '…',
  rttRed: null,
  bloqueoSeg: 0,            // cuánto se atrasó el hilo principal en el último segundo (ms)
  omitidosPorSeg: 0,        // cuadros de dibujo omitidos por el líder en el último segundo
  med: {},                  // tiempos por cuadro del último segundo: { sim, dibujo, red } -> { prom, max }
  _cuadros: 0, _snaps: 0, _bytes: 0, _toques: [], _omitidos: 0, _bloq: 0, _med: {},
  peor: null,               // el peor momento de la partida actual (se reinicia con cada partida)
  registro: [],             // una fila por segundo (últimos minutos) para "Copiar registro"
  _inicio: performance.now(),

  init() {
    this.crearBotonCopiar();
    this.observarAtrasos();
    const cfg = RED_CONFIG.depuracion;
    window.addEventListener('keydown', (e) => {
      if (e.code === cfg.tecla) { e.preventDefault(); this.alternar(); }
    });
    // 5 toques seguidos en la esquina superior izquierda (dedo o mouse)
    window.addEventListener('pointerdown', (e) => {
      if (e.clientX > cfg.esquinaPx || e.clientY > cfg.esquinaPx) return;
      const ahora = performance.now();
      this._toques = this._toques.filter((t) => ahora - t < cfg.segundosToques * 1000);
      this._toques.push(ahora);
      if (this._toques.length >= cfg.toques) { this._toques = []; this.alternar(); }
    }, { capture: true, passive: true });
    setInterval(() => this.cadaSegundo(), 1000);
    // Bloqueo del hilo principal: un temporizador cada 50 ms mide cuánto llega tarde.
    // Si el juego ocupa el hilo, los mensajes (y el ping) también esperan ese tiempo.
    let esperado = performance.now() + 50;
    setInterval(() => {
      const ahora = performance.now();
      const tarde = ahora - esperado;
      this._bloq = Math.max(this._bloq, tarde);
      // Sin PerformanceObserver de "longtask" (por ejemplo iPhone): se usa este temporizador
      if (!this.fuenteAtrasos && tarde >= CONFIG.interfaz.rendimiento.umbralAtrasoMs && !document.hidden) this.registrarAtraso(esperado - 50, tarde + 50, 'temporizador');
      esperado = ahora + 50;
    }, 50);
  },

  // ---------- Registro de atrasos (bloqueos de más de 50 ms) ----------
  // Cada uno con su hora, la memoria de JavaScript (si el navegador la da) y si en ese
  // momento se dibujó por primera vez una imagen o un destello.
  observarAtrasos() {
    this.atrasos = [];
    this._primeras = [];
    try {
      if (window.PerformanceObserver && (PerformanceObserver.supportedEntryTypes || []).includes('longtask')) {
        new PerformanceObserver((lista) => {
          for (const e of lista.getEntries()) this.registrarAtraso(e.startTime, e.duration, 'longtask');
        }).observe({ type: 'longtask', buffered: true });
        this.fuenteAtrasos = 'longtask';
      }
    } catch (e) { this.fuenteAtrasos = null; }
  },
  // Lo llaman las hojas y los destellos al dibujarse por primera vez
  primeraVez(nombre) {
    this._primeras.push({ t: performance.now(), nombre });
    if (this._primeras.length > 40) this._primeras.shift();
  },
  registrarAtraso(inicio, ms, fuente) {
    const c = CONFIG.interfaz.rendimiento;
    const seg = Math.max(0, (inicio - this._inicio) / 1000);
    const hora = `${String(Math.floor(seg / 60)).padStart(2, '0')}:${(seg % 60).toFixed(1).padStart(4, '0')}`;
    const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
    const primeras = this._primeras.filter((p) => p.t >= inicio - c.ventanaPrimeraVezMs && p.t <= inicio + ms + c.ventanaPrimeraVezMs).map((p) => p.nombre);
    const a = { hora, ms: Math.round(ms), fuente, memoriaMB: mem, primeraVez: primeras.join(', '), jugando: this.jugando() };
    this.atrasos.push(a);
    if (this.atrasos.length > c.maxAtrasos) this.atrasos.shift();
    if (this.peor && a.jugando && this.peor.mundo === Juego.mundo) {
      const p = this.peor;
      p.atrasos = (p.atrasos || 0) + 1;
      if (!p.atrasoMax || a.ms > p.atrasoMax.ms) p.atrasoMax = a;
    }
  },
  textoAtraso(a) {
    return `${a.hora} · ${a.ms} ms (${a.fuente})` + (a.memoriaMB != null ? ` · memoria ${a.memoriaMB} MB` : '') + (a.primeraVez ? ` · primera vez: ${a.primeraVez}` : '');
  },
  // Tamaño del lienzo y de la pantalla (para el panel y el registro)
  textoLienzo() {
    const l = document.getElementById('lienzo');
    return `Lienzo ${l ? l.width + '×' + l.height : '?'} · pantalla ${window.innerWidth}×${window.innerHeight} · devicePixelRatio ${Math.round((window.devicePixelRatio || 1) * 100) / 100}`;
  },

  alternar() {
    this.visible = !this.visible;
    if (this.visible) this.leerConexion();
    if (this.botonCopiar) this.botonCopiar.classList.toggle('oculto', !this.visible);
  },

  // ---------- Registro segundo a segundo y botón "Copiar registro" ----------
  crearBotonCopiar() {
    const b = document.createElement('button');
    b.id = 'btn-copiar-registro';
    b.className = 'oculto';
    b.textContent = 'Copiar registro';
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.copiarRegistro(); });
    (document.getElementById('juego') || document.body).appendChild(b);
    this.botonCopiar = b;
  },
  agregarFilaRegistro() {
    const EL = typeof EnLinea !== 'undefined' ? EnLinea : null;
    const enLinea = !!(EL && EL.activo);
    const er = enLinea ? EL.snapsEnviadosRecibidos() : { env: null, rec: null };
    const seg = Math.round((performance.now() - this._inicio) / 1000);
    const hora = `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`;
    this.registro.push([hora, enLinea ? (EL.esAnfitrion ? 'lider' : 'invitado') : 'local',
      enLinea && EL.pingPromedio != null ? EL.pingPromedio : '', enLinea && EL.jitter != null ? EL.jitter : '',
      this.rttRed != null ? this.rttRed : '', er.env != null ? er.env : '', er.rec != null ? er.rec : '',
      this.bytesPromedio, this.fps, this.colaActual(), enLinea ? this.tipoConexion : '', this.bloqueoSeg]);
    const max = CONFIG.interfaz.medicion.registroMinutos * 60;
    while (this.registro.length > max) this.registro.shift();
  },
  textoRegistro() {
    const EL = typeof EnLinea !== 'undefined' ? EnLinea : null;
    const cab = ['hora', 'rol', 'ping_ms', 'jitter_ms', 'ida_vuelta_red_ms', 'snaps_enviados_s', 'snaps_recibidos_s',
      'bytes_por_snapshot', 'fps', 'cola_bytes', 'conexion', 'bloqueo_hilo_ms'];
    const lineas = [
      `Bubu & Dudu - registro de conexion - version ${VERSION_JUEGO}` + (EL && EL.versionOtro ? ` (la otra persona: ${EL.versionOtro})` : ''),
      `Equipo: ${PERSONAJES.esCelular() ? 'celular' : 'laptop/PC'} · ${navigator.userAgent}`,
      this.textoLienzo() + (typeof Calidad !== 'undefined' ? ` · calidad ${Calidad.nombre()}` : ''),
      cab.join('\t'),
      ...this.registro.map((f) => f.join('\t')),
      '',
      `Atrasos de ${CONFIG.interfaz.rendimiento.umbralAtrasoMs} ms o más (fuente: ${this.fuenteAtrasos || 'temporizador'}; "cuadro" = tiempo entre dos cuadros dibujados):`,
      ...(this.atrasos.length ? this.atrasos.map((a) => this.textoAtraso(a)) : ['(ninguno)']),
    ];
    return lineas.join('\n');
  },
  async copiarRegistro() {
    const texto = this.textoRegistro();
    let ok = false;
    try { await navigator.clipboard.writeText(texto); ok = true; } catch (e) {
      // Respaldo para navegadores sin portapapeles moderno (o sin HTTPS)
      const t = document.createElement('textarea');
      t.value = texto; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      t.remove();
    }
    if (typeof Menus !== 'undefined' && Menus.enLineaToast) {
      Menus.enLineaToast(ok ? `Registro copiado (${this.registro.length} segundos)` : 'No se pudo copiar el registro', 3500);
    }
  },

  // Tiempo (ms) de una parte del trabajo: 'sim', 'dibujo' o 'red' (armado y envío de snapshots)
  medir(etq, ms) {
    const m = this._med[etq] || (this._med[etq] = { suma: 0, n: 0, max: 0 });
    m.suma += ms; m.n++; if (ms > m.max) m.max = ms;
    this.ultimo = this.ultimo || {};
    this.ultimo[etq] = ms;
  },
  cuadroOmitido() { this._omitidos++; },

  // ---------- Peor momento de la partida ----------
  reiniciarPeor(mundo) {
    this.peor = { mundo, fpsMin: null, cuadroMaxMs: 0, enemigos: 0, efectos: 0, sim: 0, dibujo: 0, red: 0,
      bloqueoMax: 0, snapMaxBytes: 0, snapsMinPorSeg: null, colaMax: 0, segundos: 0 };
  },
  jugando() { return typeof Juego !== 'undefined' && Juego.estado === 'jugando' && !!Juego.mundo; },
  efectosVivos() {
    const ef = typeof Juego !== 'undefined' && Juego.efectos;
    return ef ? ef.total() : 0;
  },
  // Animaciones activas por tipo: { particulas, numerosDanio, otrosTextos, area, carteles, monedas, proyectiles, enemigos, total }
  animaciones() {
    const ef = typeof Juego !== 'undefined' && Juego.efectos, m = typeof Juego !== 'undefined' && Juego.mundo;
    const d = ef ? ef.desglose(this._desglose || (this._desglose = {})) : { particulas: 0, numerosDanio: 0, otrosTextos: 0, area: 0, carteles: 0 };
    d.monedas = m ? m.monedas.length : 0;
    d.corazones = m && m.corazones ? m.corazones.length : 0;
    d.proyectiles = m ? m.proyectiles.length : 0;
    d.enemigos = m ? m.enemigos.length + (m.jefe ? 1 : 0) : 0;
    d.total = d.particulas + d.numerosDanio + d.otrosTextos + d.area + d.carteles + d.monedas + d.corazones + d.proyectiles + d.enemigos;
    return d;
  },
  colaActual() {
    const EL = typeof EnLinea !== 'undefined' ? EnLinea : null;
    if (!EL || !EL.activo) return 0;
    return (EL.canalRapido ? EL.canalRapido.bufferedAmount : 0) + (EL.conn && EL.conn.dataChannel ? EL.conn.dataChannel.bufferedAmount : 0);
  },

  // Llamado en cada cuadro dibujado
  cuadro() {
    this._cuadros++;
    const ahora = performance.now();
    const dt = this._ultimoCuadro ? ahora - this._ultimoCuadro : 0;
    this._ultimoCuadro = ahora;
    if (!this.jugando()) { this._seguido = false; return; }
    if (!this.peor || this.peor.mundo !== Juego.mundo) this.reiniciarPeor(Juego.mundo);
    const p = this.peor;
    // El primer cuadro después de una pausa o carga no cuenta (su tiempo incluye la espera)
    if (this._seguido && dt > p.cuadroMaxMs) {
      const u = this.ultimo || {};
      p.cuadroMaxMs = Math.round(dt);
      p.enemigos = Juego.mundo.enemigos.length + (Juego.mundo.jefe ? 1 : 0);
      p.efectos = this.efectosVivos();
      p.sim = u.sim || 0; p.dibujo = u.dibujo || 0; p.red = u.red || 0;
    }
    // Pico de animaciones activas en esta partida (con su desglose)
    const a = this.animaciones();
    if (a.total > (p.animMax ? p.animMax.total : 0)) p.animMax = Object.assign({}, a); // copia solo al haber un máximo nuevo
    p.colaMax = Math.max(p.colaMax, this.colaActual());
    if (this._seguido && dt >= CONFIG.interfaz.rendimiento.cuadroLargoMs && !document.hidden) this.registrarAtraso(ahora - dt, dt, 'cuadro');
    this._seguido = true;
  },

  // Llamado al enviar (líder) o recibir (invitado) un snapshot
  registrarSnapshot(bytes) {
    this._snaps++; this._bytes += bytes || 0;
    if (this.peor && this.jugando()) this.peor.snapMaxBytes = Math.max(this.peor.snapMaxBytes, bytes || 0);
  },

  cadaSegundo() {
    this.fps = this._cuadros;
    // Calidad automática de los efectos según los FPS de este dispositivo
    if (typeof Calidad !== 'undefined') Calidad.registrarFps(this.fps, this.jugando());
    this.snapsPorSeg = this._snaps;
    this.omitidosPorSeg = this._omitidos;
    this.bloqueoSeg = Math.round(this._bloq);
    const med = {};
    for (const k in this._med) { const m = this._med[k]; med[k] = { prom: m.n ? m.suma / m.n : 0, max: m.max }; }
    this.med = med;
    this._med = {};
    const EL = typeof EnLinea !== 'undefined' ? EnLinea : null;
    this.descartadosPorSeg = EL ? (EL.snapsDescartados || 0) - (this._descartadosAntes || 0) : 0;
    this._descartadosAntes = EL ? EL.snapsDescartados || 0 : 0;
    this.bytesPromedio = this._snaps ? Math.round(this._bytes / this._snaps) : 0;
    // Peor momento: solo segundos completos jugando (el primero se descarta)
    if (this.peor && this.jugando() && this.peor.mundo === Juego.mundo) {
      const p = this.peor;
      p.segundos++;
      if (p.segundos >= 2) {
        p.fpsMin = p.fpsMin == null ? this.fps : Math.min(p.fpsMin, this.fps);
        p.bloqueoMax = Math.max(p.bloqueoMax, this.bloqueoSeg);
        if (EL && EL.activo && EL.conectado) p.snapsMinPorSeg = p.snapsMinPorSeg == null ? this.snapsPorSeg : Math.min(p.snapsMinPorSeg, this.snapsPorSeg);
      }
    }
    this.agregarFilaRegistro();
    this._cuadros = 0; this._snaps = 0; this._bytes = 0; this._omitidos = 0; this._bloq = 0;
    // El tipo de conexión se lee también con el panel cerrado (para el registro)
    if (this.visible || (typeof EnLinea !== 'undefined' && EnLinea.activo)) this.leerConexion();
  },

  // Tipo de conexión real con getStats de WebRTC
  async leerConexion() {
    const conn = typeof EnLinea !== 'undefined' && EnLinea.conn;
    const pc = conn && conn.peerConnection;
    if (!pc || !pc.getStats) { this.tipoConexion = typeof EnLinea !== 'undefined' && EnLinea.activo ? 'conectando…' : 'sin partida en línea'; this.rttRed = null; return; }
    try {
      const stats = await pc.getStats();
      let par = null;
      stats.forEach((s) => {
        if (s.type === 'transport' && s.selectedCandidatePairId) par = stats.get(s.selectedCandidatePairId);
      });
      if (!par) stats.forEach((s) => { if (s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded') par = s; });
      if (!par) { this.tipoConexion = 'negociando…'; return; }
      const local = stats.get(par.localCandidateId) || {}, remoto = stats.get(par.remoteCandidateId) || {};
      const tipos = [local.candidateType, remoto.candidateType];
      const proto = (local.protocol || '').toUpperCase();
      if (tipos.includes('relay')) this.tipoConexion = `TURN (relevo) · ${proto}`;
      else if (tipos[0] === 'host' && tipos[1] === 'host') this.tipoConexion = `directa (red local) · ${proto}`;
      else this.tipoConexion = `directa (por el router: ${tipos[0]}/${tipos[1]}) · ${proto}`;
      this.rttRed = par.currentRoundTripTime != null ? Math.round(par.currentRoundTripTime * 1000) : null;
    } catch (e) { this.tipoConexion = 'no disponible'; }
  },

  dibujar(ctx, W, H) {
    if (!this.visible) return;
    const s = U.clamp(H / 720, 0.7, 1.6);
    const EL = typeof EnLinea !== 'undefined' ? EnLinea : null;
    const lider = EL && EL.esAnfitrion;
    const rol = !EL || !EL.activo ? 'sin red (local)' : lider ? 'LÍDER (anfitrión)' : 'INVITADO';
    const canal = EL && EL.canalRapido && EL.canalRapido.readyState === 'open' ? 'sí (sin reenvíos)' : 'no (canal fiable)';
    const f1 = (v) => (v == null ? '—' : (Math.round(v * 10) / 10).toFixed(1));
    const avisoBytes = RED_CONFIG.compacto.avisoBytes;

    // ---- Columna RED ----
    const en = EL && EL.activo;
    const er = en ? EL.snapsEnviadosRecibidos() : { env: null, rec: null };
    const inestable = en && EL.conexionInestable();
    const red = [
      [`— RED — versión ${VERSION_JUEGO}`],
      [`Rol: ${rol}`],
    ];
    if (en && EL.versionOtro) red.push([`Versión de la otra persona: ${EL.versionOtro}`, EL.versionDistinta]);
    if (en && EL.versionDistinta) red.push([EL.esInvitado ? 'Tu versión es distinta a la del líder, recarga la página' : 'El invitado tiene otra versión: que recargue', true]);
    if (inestable) red.push(['¡Conexión inestable!', true]);
    red.push(
      [`Ping (promedio 2 s): ${en && EL.pingPromedio != null ? EL.pingPromedio + ' ms' : '—'} · variación ${en ? (EL.jitter || 0) + ' ms' : '—'}`],
      [`Snapshots/s: enviados ${er.env != null ? er.env : '—'} · recibidos ${er.rec != null ? er.rec : '—'}${en && EL.perdidaPorcentaje ? ` (−${EL.perdidaPorcentaje}%)` : ''}`],
      [`Ida y vuelta red (WebRTC): ${this.rttRed != null ? this.rttRed + ' ms' : '—'}`],
      [`Bloqueo del hilo del otro: ${EL && EL.activo && EL.bloqueoOtro != null ? EL.bloqueoOtro + ' ms' : '—'}`],
      [`Tamaño promedio: ${this.bytesPromedio} bytes`, this.bytesPromedio > avisoBytes],
      [`Conexión: ${this.tipoConexion}`],
      [`Canal rápido: ${EL && EL.activo ? canal : '—'}`],
      [`TURN: ${EL && EL.estadoTurn ? EL.estadoTurn : '—'}`, !!(EL && EL.estadoTurn && EL.estadoTurn.startsWith('no disponible'))],
    );
    // Errores al cargar las hojas de sprites (nunca se usa una imagen vieja en silencio)
    const errs = typeof PERSONAJES !== 'undefined' ? PERSONAJES.errores : [];
    red.push([`Hojas de sprites: ${errs.length ? errs.length + ' con error' : 'todas bien'}${typeof PERSONAJES !== 'undefined' && PERSONAJES.usaMovil ? ' (versión celular)' : ''}`, errs.length > 0]);
    errs.slice(0, 4).forEach((e) => red.push(['  ' + e, true]));
    if (EL && EL.canalRapido) red.push([`Cola rápida: ${EL.canalRapido.bufferedAmount} bytes`]);
    if (EL && EL.conn && EL.conn.dataChannel) red.push([`Cola fiable: ${EL.conn.dataChannel.bufferedAmount} bytes`]);
    if (lider) {
      red.push([`Snapshots descartados/s: ${this.descartadosPorSeg || 0}`, this.descartadosPorSeg > 0]);
      red.push([`Envío: ${RED_CONFIG.relojEnvio.activo ? `reloj propio ${RED_CONFIG.estadosPorSegundo} Hz` : `${EL.estadosPorSegundoActual || RED_CONFIG.estadosPorSegundo} Hz con el dibujo`}`]);
    }

    // ---- Columna RENDIMIENTO ----
    const m = this.med;
    const t = (k) => (m[k] ? `${f1(m[k].prom)} / ${f1(m[k].max)}` : '—');
    const rend = [
      ['— RENDIMIENTO (prom / máx por cuadro) —'],
      [`FPS: ${this.fps}`],
      [this.textoLienzo()],
      [`Simulación: ${t('sim')} ms`],
      [`Dibujo: ${t('dibujo')} ms`],
      [`Armado y envío de snapshots: ${t('red')} ms`],
      [`Bloqueo del hilo (este equipo): ${this.bloqueoSeg} ms`, this.bloqueoSeg > 100],
      [`Cuadros sin dibujar/s: ${this.omitidosPorSeg}`],
    ];
    // Calidad y animaciones activas por tipo
    const ef = Juego.efectos, an = this.animaciones();
    // Dos renglones: efectos visuales y cosas del juego
    const lineas = (d) => [[`  partículas ${d.particulas} · números de daño ${d.numerosDanio} · otros textos ${d.otrosTextos}`],
      [`  área ${d.area} · carteles ${d.carteles} · monedas ${d.monedas} · corazones ${d.corazones} · proyectiles ${d.proyectiles} · enemigos ${d.enemigos}`]];
    rend.push(
      [`Calidad: ${typeof Calidad !== 'undefined' ? Calidad.nombre() : '—'}${CONFIG.interfaz.calidad.automatica ? ' (automática)' : ''}` +
        ` · tope de efectos ${ef ? ef.tope() : '—'} (${Juego.esTactil ? 'celular' : 'laptop'})`],
      [`Animaciones activas: ${an.total} (efectos ${ef ? ef.total() : 0}, descartados ${ef ? ef.descartados : 0})`],
      ...lineas(an),
      ['— PEOR MOMENTO (esta partida) —'],
    );
    const p = this.peor && Juego.mundo && this.peor.mundo === Juego.mundo ? this.peor : null;
    if (p) {
      rend.push([`FPS mínimo: ${p.fpsMin != null ? p.fpsMin : '…'}`]);
      rend.push([`Cuadro más largo: ${p.cuadroMaxMs} ms`]);
      rend.push([`  en ese cuadro: sim ${f1(p.sim)} · dibujo ${f1(p.dibujo)} · red ${f1(p.red)} ms`]);
      rend.push([`  ${p.enemigos} enemigos, ${p.efectos} efectos`]);
      if (p.animMax) {
        rend.push([`Máximo de animaciones: ${p.animMax.total}`]);
        rend.push(...lineas(p.animMax));
      }
      rend.push([`Bloqueo máximo del hilo: ${p.bloqueoMax} ms`]);
      rend.push([`Atrasos ≥${CONFIG.interfaz.rendimiento.umbralAtrasoMs} ms: ${p.atrasos || 0} (${this.fuenteAtrasos || 'temporizador'})`, (p.atrasos || 0) > 0]);
      if (p.atrasoMax) rend.push(['  mayor: ' + this.textoAtraso(p.atrasoMax), true]);
      rend.push([`Snapshot más grande: ${p.snapMaxBytes} bytes`, p.snapMaxBytes > avisoBytes]);
      rend.push([`Mínimo snapshots/s: ${p.snapsMinPorSeg != null ? p.snapsMinPorSeg : '—'}`]);
      rend.push([`Cola máxima: ${p.colaMax} bytes`]);
    } else rend.push(['(empieza al jugar un nivel)']);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = `bold ${12 * s}px Consolas, monospace`;
    ctx.textAlign = 'left';
    const alto = 15 * s;
    const caja = (lineas, x, y) => {
      const ancho = Math.max(...lineas.map((l) => ctx.measureText(l[0]).width)) + 14 * s;
      ctx.fillStyle = 'rgba(0,0,0,0.74)';
      ctx.fillRect(x, y, ancho, alto * lineas.length + 8 * s);
      lineas.forEach(([texto, alerta], i) => {
        ctx.fillStyle = alerta ? '#ff8787' : texto.startsWith('—') ? '#ffe066' : '#b2f2bb';
        ctx.fillText(texto, x + 7 * s, y + alto * (i + 1));
      });
      return ancho;
    };
    const x = 8 * s;
    const y = Math.max(8 * s, Math.min(H * 0.3, H - alto * Math.max(red.length, rend.length) - 12 * s));
    const ancho = caja(red, x, y);
    caja(rend, x + ancho + 6 * s, y);
    ctx.restore();
    // Botón "Copiar registro" (HTML) justo debajo de la columna RED
    if (this.botonCopiar) {
      const k = W / Math.max(1, window.innerWidth); // píxeles del lienzo por píxel de pantalla
      const top = Math.round((y + alto * red.length + 12 * s) / k), left = Math.round(x / k);
      if (top !== this._topBoton || left !== this._leftBoton) {
        this._topBoton = top; this._leftBoton = left;
        this.botonCopiar.style.top = Math.min(top, window.innerHeight - 40) + 'px';
        this.botonCopiar.style.left = left + 'px';
      }
    }
  },
};

Depuracion.init();
