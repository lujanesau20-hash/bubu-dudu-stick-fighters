/* =====================================================================
   PANEL DE DEPURACIÓN (oculto)
   Se abre/cierra con F3 o tocando 5 veces la esquina superior izquierda.
   Muestra: rol (líder/invitado), ping, ida y vuelta real de la red (WebRTC),
   snapshots por segundo, tamaño promedio de cada snapshot, FPS, tipo de
   conexión (directa en la red local / directa por el router / TURN) y si el
   canal rápido (sin reenvíos) está activo. Valores en config/red.js.
   ===================================================================== */
const Depuracion = {
  visible: false,
  fps: 0,
  snapsPorSeg: 0,
  bytesPromedio: 0,
  tipoConexion: '…',
  rttRed: null,
  _cuadros: 0, _snaps: 0, _bytes: 0, _toques: [], _tSeg: 0,

  init() {
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
  },

  alternar() { this.visible = !this.visible; if (this.visible) this.leerConexion(); },

  // Llamado en cada cuadro dibujado
  cuadro() { this._cuadros++; },

  // Llamado al enviar (líder) o recibir (invitado) un snapshot
  registrarSnapshot(bytes) { this._snaps++; this._bytes += bytes || 0; },

  cadaSegundo() {
    this.fps = this._cuadros;
    this.snapsPorSeg = this._snaps;
    this.bytesPromedio = this._snaps ? Math.round(this._bytes / this._snaps) : 0;
    this._cuadros = 0; this._snaps = 0; this._bytes = 0;
    if (this.visible) this.leerConexion();
  },

  // Tipo de conexión real con getStats de WebRTC
  async leerConexion() {
    const conn = typeof EnLinea !== 'undefined' && EnLinea.conn;
    const pc = conn && conn.peerConnection;
    if (!pc || !pc.getStats) { this.tipoConexion = EnLinea && EnLinea.activo ? 'conectando…' : 'sin partida en línea'; this.rttRed = null; return; }
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
    const rol = !EL || !EL.activo ? 'sin red (local)' : EL.esAnfitrion ? 'LÍDER (anfitrión)' : 'INVITADO';
    const canal = EL && EL.canalRapido && EL.canalRapido.readyState === 'open' ? 'sí (sin reenvíos)' : 'no (canal fiable)';
    const lineas = [
      `Rol: ${rol}`,
      `Ping (juego): ${EL && EL.ping != null ? EL.ping + ' ms' : '—'}`,
      `Ida y vuelta red (WebRTC): ${this.rttRed != null ? this.rttRed + ' ms' : '—'}`,
      `Snapshots/s ${EL && EL.esAnfitrion ? 'enviados' : 'recibidos'}: ${this.snapsPorSeg}`,
      `Tamaño promedio: ${this.bytesPromedio} bytes`,
      `FPS: ${this.fps}`,
      `Conexión: ${this.tipoConexion}`,
      `Canal rápido: ${EL && EL.activo ? canal : '—'}`,
    ];
    if (EL && EL.esAnfitrion) lineas.push(`Ritmo de envío: ${EL.estadosPorSegundoActual || RED_CONFIG.estadosPorSegundo} Hz`);
    if (EL && EL.conn && EL.conn.dataChannel) lineas.push(`En cola (fiable): ${EL.conn.dataChannel.bufferedAmount} bytes`);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = `bold ${13 * s}px Consolas, monospace`;
    ctx.textAlign = 'left';
    const alto = 17 * s, ancho = Math.max(...lineas.map((l) => ctx.measureText(l).width)) + 16 * s;
    const x = 8 * s, y = H * 0.34; // debajo de las filas de habilidades y combos
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(x, y, ancho, alto * lineas.length + 10 * s);
    ctx.fillStyle = '#b2f2bb';
    lineas.forEach((l, i) => {
      // En rojo si el snapshot promedio pasa del tamaño de aviso (no cabe en un paquete de red)
      ctx.fillStyle = i === 4 && this.bytesPromedio > RED_CONFIG.compacto.avisoBytes ? '#ff8787' : '#b2f2bb';
      ctx.fillText(l, x + 8 * s, y + alto * (i + 1));
    });
    ctx.restore();
  },
};

Depuracion.init();
