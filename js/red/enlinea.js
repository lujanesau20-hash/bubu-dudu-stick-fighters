/* =====================================================================
   JUEGO EN LÍNEA PARA 2 (WebRTC con PeerJS)
   - Quien crea la sala es el ANFITRIÓN (Bubu): ejecuta toda la simulación.
   - Quien se une es el INVITADO (Dudu): envía sus controles y dibuja el
     estado que le llega (ver js/red/sincronizacion.js).
   Mensajes (JSON, campo "t"):
     anfitrión -> invitado: hola, llena, lobby, inicio, e / e2 (estado), ev (efectos), pausa, fin, cerrar
     Los snapshots compactos (e2) van por un "canal rápido" sin orden ni reenvíos;
     todo lo demás va por el canal fiable de PeerJS.
     invitado -> anfitrión: c (controles), adios
     ambos: ping / pong
   ===================================================================== */
const EnLinea = {
  rol: null,            // 'anfitrion' | 'invitado' | null
  peer: null,
  conn: null,           // conexión con la otra persona
  codigo: null,
  ping: null,
  conectado: false,
  ultimoMensaje: 0,
  enPartida: false,

  get activo() { return !!this.rol; },
  get esAnfitrion() { return this.rol === 'anfitrion'; },
  get esInvitado() { return this.rol === 'invitado'; },

  disponible() { return typeof Peer !== 'undefined'; },

  opcionesPeer() {
    return Object.assign({ debug: 1, config: { iceServers: RED_CONFIG.iceServers() } }, RED_CONFIG.servidorPeer || {});
  },

  nuevoCodigo() {
    const max = Math.pow(10, RED_CONFIG.digitosCodigo);
    return String(Math.floor(Math.random() * max)).padStart(RED_CONFIG.digitosCodigo, '0');
  },

  // ======================= ANFITRIÓN =======================
  crearSala(intento = 0) {
    this.cerrar(true);
    this.rol = 'anfitrion';
    this.codigo = this.nuevoCodigo();
    const peer = new Peer(RED_CONFIG.prefijoSala + this.codigo, this.opcionesPeer());
    this.peer = peer;
    Menus.enLineaCreando();

    peer.on('open', () => Menus.enLineaEsperando(this.codigo));
    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      if (err.type === 'unavailable-id' && intento < 6) { peer.destroy(); this.crearSala(intento + 1); return; } // código en uso: otro
      if (err.type === 'peer-unavailable') return;
      this.errorRed(err);
    });
    peer.on('disconnected', () => { if (this.peer === peer && !peer.destroyed) peer.reconnect(); }); // seguir aceptando reconexiones
    peer.on('connection', (conn) => this.alConectarInvitado(conn));
  },

  alConectarInvitado(conn) {
    // La sala admite solo 2 personas
    if (this.conn && this.conectado) {
      conn.on('open', () => { conn.send({ t: 'llena' }); setTimeout(() => conn.close(), 500); });
      return;
    }
    this.conn = conn;
    const lento = setTimeout(() => { if (!this.conectado && this.conn === conn) Menus.enLineaAvisoLento(); }, RED_CONFIG.avisoTurnSegundos * 1000);
    conn.on('open', () => {
      clearTimeout(lento);
      this.conectado = true;
      this.ultimoMensaje = performance.now();
      this.abrirCanalRapido(conn);
      Sincro.fijosEnviados = new Map(); // el invitado (nuevo o que volvió) no conoce ningún dato fijo
      this.controlRemoto = new ControlRemoto();
      this.enviar({ t: 'hola', personaje: 'dudu' });
      if (Juego.mundo && Juego.estado !== 'menu' && this.enPartida) this.reincorporarInvitado();
      else Menus.enLineaConectado();
    });
    conn.on('data', (d) => this.recibir(d));
    conn.on('close', () => { if (this.conn === conn) this.invitadoSeFue(); });
    conn.on('error', () => { if (this.conn === conn) this.invitadoSeFue(); });
  },

  // El anfitrión inicia la partida con el nivel elegido
  iniciar(escenario = 'isla') {
    this.escenario = escenario;
    this.enPartida = true;
    Juego.iniciarPartida('pareja', ['bubu', 'dudu'], escenario);
  },

  // Llamado desde Juego.iniciarPartida (anfitrión)
  alIniciarPartida(juego) {
    const m = juego.mundo;
    m.indiceLocal = 0;
    m.mapasHud = [CONFIG.controles.solo, null];
    juego.entrada.configurar([CONFIG.controles.solo]);
    juego.entrada.fuentesRemotas[1] = () => (this.controlRemoto ? this.controlRemoto.leer() : new EstadoControl());
    this.eventosPendientes = [];
    this.tEnvio = 0;
    Sincro.fijosEnviados = new Map(); Sincro.numSnap = 0;
    this.enviar({ t: 'inicio', modo: m.modo, personajes: ['bubu', 'dudu'], escenario: m.escenarioId, semilla: 1, nivel: m.nivel });
    this.mantenerPantalla();
  },

  // Llamado en cada cuadro después de simular (anfitrión)
  trasPasos(m, dt) {
    if (!this.conectado) { this.eventosPendientes = []; return; }
    for (const e of m.eventos) this.eventosPendientes.push(Object.assign({}, e));
    // Ritmo estable: se descuenta el intervalo (antes se reiniciaba a 0 y salía irregular)
    const intervalo = 1 / this.ritmoEnvio(dt);
    this.tEnvio += dt;
    if (this.tEnvio >= intervalo) {
      this.tEnvio -= intervalo;
      if (this.tEnvio > intervalo) this.tEnvio = 0;
      this.enviarEstado(m);
    }
  },

  // Si el líder va lento (celular con pocos FPS), baja la frecuencia de snapshots
  ritmoEnvio(dt) {
    const ll = RED_CONFIG.liderLento;
    this.fpsLider = this.fpsLider ? this.fpsLider * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05 : 60;
    const lento = this.fpsLider < ll.fpsMinimo;
    this.tLento = U.clamp((this.tLento || 0) + (lento ? dt : -dt), 0, ll.segundosParaCambiar * 2);
    this.estadosPorSegundoActual = this.tLento >= ll.segundosParaCambiar ? ll.estadosPorSegundo : RED_CONFIG.estadosPorSegundo;
    return this.estadosPorSegundoActual;
  },

  enviarEstado(m) {
    const eventos = this.eventosPendientes;
    this.eventosPendientes = [];
    if (!RED_CONFIG.compacto.activo) { // formato anterior (todo por el canal fiable)
      const o = { t: 'e', d: Sincro.instantanea(m, eventos) };
      this.enviar(o);
      if (typeof Depuracion !== 'undefined' && Depuracion.visible) Depuracion.registrarSnapshot(JSON.stringify(o).length);
      return;
    }
    const snap = Sincro.instantanea(m, null);
    // Efectos visuales: por el canal fiable (no se pierden), con la hora del snapshot
    if (eventos.length) this.enviar({ t: 'ev', w: snap.w, v: eventos });
    const o = { t: 'e2', d: Sincro.comprimir(snap) };
    const texto = JSON.stringify(o);
    if (typeof Depuracion !== 'undefined') Depuracion.registrarSnapshot(texto.length);
    const rc = this.canalRapido;
    if (rc && rc.readyState === 'open') {
      if (rc.bufferedAmount < 64 * 1024) { try { rc.send(texto); } catch (e) { /* se reintenta con el próximo */ } }
    } else this.enviar(o); // sin canal rápido: por el fiable
  },

  // Canal extra "negociado" sobre la misma conexión WebRTC: sin orden y sin reenvíos.
  // Los dos lados lo crean con el mismo id, así no hace falta volver a negociar.
  abrirCanalRapido(conn) {
    this.cerrarCanalRapido();
    const cfg = RED_CONFIG.canalRapido;
    const pc = conn && conn.peerConnection;
    if (!cfg.activo || !pc || !pc.createDataChannel) return;
    try {
      const dc = pc.createDataChannel('rapido', { negotiated: true, id: cfg.id, ordered: false, maxRetransmits: 0 });
      dc.onmessage = (ev) => {
        if (this.canalRapido !== dc) return;
        let d;
        try { d = JSON.parse(ev.data); } catch (e) { return; }
        this.recibir(d, ev.data.length);
      };
      this.canalRapido = dc;
    } catch (e) { console.warn('Canal rápido no disponible', e); this.canalRapido = null; }
  },
  cerrarCanalRapido() {
    const dc = this.canalRapido;
    this.canalRapido = null;
    try { if (dc) dc.close(); } catch (e) {}
  },

  invitadoSeFue() {
    if (!this.conectado) return;
    this.conectado = false;
    this.conn = null;
    if (this.controlRemoto) this.controlRemoto.soltarTodo();
    if (Juego.mundo && this.enPartida && (Juego.estado === 'jugando' || Juego.estado === 'pausa' || Juego.estado === 'carga')) {
      // El líder sigue jugando sin parar; Dudu queda fuera hasta que vuelva con el código
      this.marcarAusente();
      Menus.enLineaToast(`${getNombreJugador(Juego.mundo.jugadores[1])} salió. Puede volver con el código ${this.codigo}`, 4500);
      if (Juego.estado === 'pausa') Pausa.menuLider(); // ahora el líder puede reanudar solo
    } else if (this.esAnfitrion) {
      Menus.enLineaEsperando(this.codigo, 'Dudu salió de la sala. Esperando a que vuelva a entrar…');
    }
  },

  // Dudu queda fuera del juego (guardando su vida) hasta que vuelva
  marcarAusente() {
    const d = Juego.mundo && Juego.mundo.jugadores[1];
    if (d && !d.ausente && d.estado !== 'muerto') {
      d.vidaGuardada = d.vida; d.estadoGuardado = d.estado;
      d.estado = 'muerto'; d.ausente = true; d.accion = null;
    }
  },

  // "Seguir solo" (se mantiene por compatibilidad)
  seguirSolo() {
    this.marcarAusente();
    Juego.reanudar();
  },

  // El invitado volvió durante una partida
  reincorporarInvitado() {
    const m = Juego.mundo;
    const d = m.jugadores[1], b = m.jugadores[0];
    if (d && d.ausente) {
      // Reaparece en una esquina de la pantalla (cayendo desde arriba) con la vida que tenía al salir
      const br = BALANCE.reentrada;
      d.ausente = false;
      d.estado = 'normal';
      d.vida = d.estadoGuardado === 'caido' || !(d.vidaGuardada > 0) ? Math.round(d.vidaMax * br.vidaSiEstabaCaido) : d.vidaGuardada;
      const lado = b.x - m.limiteIzq > br.distanciaEsquina ? -1 : 1;
      d.x = U.clamp(b.x + lado * br.distanciaEsquina, m.limiteIzq + 40, m.limiteDer - 40);
      d.y = m.sueloY - br.alturaCaida; d.vx = 0; d.vy = 0;
      d.invulnerable = br.invulnerable;
      m.emitir('teletransporte', { x: d.x, y: d.y, color: '#ff8fab' });
    }
    this.enviar({ t: 'inicio', modo: m.modo, personajes: ['bubu', 'dudu'], escenario: m.escenarioId, semilla: 1, nivel: m.nivel, reingreso: true });
    // Si el juego estaba en pausa, el invitado entra a la pausa (debe dar su check)
    if (Juego.estado === 'pausa') { if (this.listos) this.listos[1] = false; this.avisarPausa(true); Pausa.menuLider(); }
    Menus.enLineaToast('¡Dudu volvió a la sala!');
  },

  // ======================= INVITADO =======================
  unirse(codigo) {
    this.cerrar(true);
    this.rol = 'invitado';
    this.codigo = codigo;
    Menus.enLineaUniendo(codigo);
    const peer = new Peer(this.opcionesPeer());
    this.peer = peer;
    const lento = setTimeout(() => { if (!this.conectado && this.peer === peer) Menus.enLineaAvisoLento(); }, RED_CONFIG.avisoTurnSegundos * 1000);
    peer.on('open', () => {
      const conn = peer.connect(RED_CONFIG.prefijoSala + codigo, { reliable: true, serialization: 'json' });
      this.conn = conn;
      conn.on('open', () => {
        clearTimeout(lento);
        this.conectado = true;
        this.ultimoMensaje = performance.now();
        this.abrirCanalRapido(conn);
        this.acumulador = new AcumuladorControl();
      });
      conn.on('data', (d) => this.recibir(d));
      conn.on('close', () => { if (this.conn === conn) this.salaCerrada(); });
      conn.on('error', () => { if (this.conn === conn) this.salaCerrada(); });
    });
    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      clearTimeout(lento);
      if (err.type === 'peer-unavailable') { this.cerrar(true); Menus.enLineaUnirse(codigo, `La sala ${codigo} no existe. Revisa el código.`); return; }
      this.errorRed(err);
    });
  },

  salaCerrada(texto = 'La sala se cerró.') {
    if (!this.esInvitado) return;
    this.cerrar(true);
    Juego.mundo = null;
    Juego.estado = 'menu';
    Juego.tactil.mostrar(false);
    Menus.enLineaMensaje(texto, () => Juego.irAlMenu());
  },

  // Datos de inicio de partida
  alInicio(d) {
    this.enPartida = true;
    const juego = Juego;
    juego.modo = d.modo;
    juego.personajes = d.personajes;
    juego.entrada.configurar([CONFIG.controles.solo]);
    const m = Sincro.crearEspejo(d, 1);
    m.mapasHud = [null, CONFIG.controles.solo];
    juego.mundo = m;
    juego.efectos.reiniciar();
    juego.hud.reiniciar();
    juego.camara.saltarA(m, juego.render.anchoBase);
    juego.finMostrado = true; // el fin lo avisa el anfitrión
    this.menuAbierto = false;
    this.pausadoPorAnfitrion = false; // al (re)iniciar un nivel ya no hay pausa
    this.tEnvio = 0;
    this.mantenerPantalla();
    if (d.reingreso) { juego.estado = 'jugando'; Menus.ocultar(); juego.tactil.mostrar(juego.esTactil); return; }
    juego.estado = 'carga';
    Menus.carga(`Nivel ${d.nivel} · ${(ESCENARIOS[d.escenario] || ESCENARIOS.isla).nombre}`);
    clearTimeout(this.tCarga);
    this.tCarga = setTimeout(() => {
      if (juego.estado !== 'carga') return;
      juego.estado = 'jugando';
      Menus.ocultar();
      juego.tactil.mostrar(juego.esTactil);
    }, 1600);
  },

  // Cada cuadro del invitado: leer controles, predecir y enviar
  actualizarInvitado(juego, dt) {
    if (juego.entrada.consumir(CONFIG.controles.generales.pausa) || juego.tactil.pausaPulsada) {
      juego.tactil.pausaPulsada = false;
      if (this.pausadoPorAnfitrion) { this.enviar({ t: 'listo' }); Pausa.menuInvitado([this.listosInvitado[0], true]); }
      else Pausa.pulsar();
    }
    let c = juego.entrada.leer(1)[0];
    if (this.menuAbierto || this.pausadoPorAnfitrion) c = new EstadoControl();
    if (!this.pausadoPorAnfitrion) Sincro.predecir(dt, c);
    this.acumulador.agregar(c);
    this.tEnvio += dt;
    // A 30 por segundo y, además, apenas cambia una tecla (sin esperar al próximo envío)
    const u = this.ultimoControl || {};
    const cambio = c.x !== u.x || c.abajo !== u.abajo || c.saltoMantenido !== u.saltoMantenido || c.revivir !== u.revivir
      || c.saltoPulsado || c.combo || c.habilidades.some(Boolean);
    this.ultimoControl = { x: c.x, abajo: c.abajo, saltoMantenido: c.saltoMantenido, revivir: c.revivir };
    if (cambio || this.tEnvio >= 1 / RED_CONFIG.controlesPorSegundo) { this.tEnvio = 0; this.enviar(Object.assign({ t: 'c' }, this.acumulador.sacar())); }

    const m = juego.mundo;
    const yo = m.jugadores[1];
    const caido = m.jugadores.find((j) => j.estado === 'caido');
    juego.tactil.actualizarVisual(yo, !!(caido && caido !== yo && yo.vivo && Math.abs(yo.x - caido.x) <= CONFIG.revivir.distancia));
  },

  // ======================= COMÚN =======================
  enviar(o) {
    if (this.conn && this.conn.open) { try { this.conn.send(o); } catch (e) { /* conexión cerrándose */ } }
  },

  recibir(d, bytes) {
    // Retraso de red simulado (solo pruebas, ver RED_CONFIG.latenciaPrueba). Mantiene el orden.
    const lp = RED_CONFIG.latenciaPrueba;
    if (lp && lp.ms > 0 && !d._retrasado) {
      const cuando = Math.max(this.ultimaEntrega || 0, performance.now() + lp.ms + (Math.random() * 2 - 1) * lp.variacion);
      this.ultimaEntrega = cuando;
      d._retrasado = true;
      setTimeout(() => this.recibir(d, bytes), cuando - performance.now());
      return;
    }
    this.ultimoMensaje = performance.now();
    switch (d.t) {
      case 'ping': this.enviar({ t: 'pong', ts: d.ts }); break;
      case 'pong': this.ping = Math.round(performance.now() - d.ts); break;
      // --- al invitado ---
      case 'hola': Menus.enLineaConectado(); break;
      case 'llena': this.cerrar(true); Menus.enLineaUnirse(this.codigo || '', 'Esa sala ya está llena (2 personas).'); break;
      case 'lobby': Juego.mundo = null; Juego.estado = 'menu'; Juego.tactil.mostrar(false); this.enPartida = false; Menus.enLineaConectado(); break;
      case 'inicio': this.alInicio(d); break;
      case 'e':
        if (this.esInvitado && Sincro.espejo) {
          if (typeof Depuracion !== 'undefined') Depuracion.registrarSnapshot(bytes || (Depuracion.visible ? JSON.stringify(d).length : 0));
          Sincro.recibirInstantanea(d.d);
        }
        break;
      case 'e2': // snapshot compacto (normalmente por el canal rápido)
        if (this.esInvitado && Sincro.espejo) {
          if (typeof Depuracion !== 'undefined') Depuracion.registrarSnapshot(bytes || (Depuracion.visible ? JSON.stringify(d).length : 0));
          Sincro.recibirInstantanea(Sincro.descomprimir(d.d));
        }
        break;
      case 'ev': if (this.esInvitado && Sincro.espejo) Sincro.recibirEventos(d.w, d.v); break;
      case 'pausa':
        this.pausadoPorAnfitrion = d.on;
        if (d.on) Menus.enLineaPausaAnfitrion(); else if (!this.menuAbierto && Juego.estado === 'jugando') Menus.ocultar();
        break;
      case 'fin': this.finInvitado(d); break;
      case 'cerrar': this.salaCerrada('El anfitrión cerró la sala.'); break;
      // --- al anfitrión ---
      case 'pausaEstado': // (al invitado) el juego se pausó o se reanudó
        this.pausadoPorAnfitrion = d.on;
        this.listosInvitado = d.listos || [false, false];
        if (d.on) { Juego.tactil.mostrar(false); Pausa.menuInvitado(this.listosInvitado); }
        else if (Juego.estado === 'jugando') { Menus.ocultar(); Juego.tactil.mostrar(Juego.esTactil); }
        break;
      case 'finalizar': // (al invitado) el líder terminó la partida
        this.cerrar(true);
        Juego.irAlMenu();
        Menus.enLineaToast('El líder finalizó el juego');
        break;
      case 'pedirPausa': // (al líder) el invitado quiere pausar
        if (this.esAnfitrion && Juego.estado === 'jugando' && Juego.mundo) Pausa.avisoSolicitud(getNombreJugador(Juego.mundo.jugadores[1]));
        break;
      case 'listo': this.marcarListo(1); break;
      case 'c': if (this.controlRemoto) this.controlRemoto.recibir(d); break;
      case 'adios': this.invitadoSeFue(); break;
    }
  },

  finInvitado(d) {
    Juego.estado = 'fin';
    Juego.tactil.mostrar(false);
    if (d.monedas && d.tipo !== 'versus') Guardado.sumarMonedas(d.monedas);
    // El invitado también guarda el nivel superado
    if (d.tipo === 'victoria' && d.escenario && !Guardado.datos.nivelesSuperados.includes(d.escenario)) {
      Guardado.datos.nivelesSuperados.push(d.escenario); Guardado.guardar();
    }
    Menus.enLineaFinInvitado(d);
  },

  // Ping cada segundo y detección de silencio
  tic() {
    if (!this.conectado) return;
    this.enviar({ t: 'ping', ts: performance.now() });
    if (performance.now() - this.ultimoMensaje > RED_CONFIG.silencioDesconexion * 1000) {
      if (this.esAnfitrion) { if (this.conn) this.conn.close(); this.invitadoSeFue(); }
      else this.salaCerrada('Se perdió la conexión con la sala.');
    }
  },

  // Avisos al otro cuando el anfitrión pausa o termina
  avisarPausa(on) {
    if (!this.esAnfitrion) return;
    this.enviar({ t: 'pausaEstado', on, listos: this.listos || [false, false] });
  },

  // ---------- Pausa en línea con checks de "Reanudar" ----------
  iniciarPausa() {
    this.listos = [false, false];
    this.avisarPausa(true);
  },
  marcarListo(i) {
    if (!this.esAnfitrion || Juego.estado !== 'pausa' || !this.listos) return;
    this.listos[i] = true;
    const invitadoPresente = this.conectado && Juego.mundo && !Juego.mundo.jugadores[1].ausente;
    if (this.listos[0] && (this.listos[1] || !invitadoPresente)) { Juego.reanudar(); return; } // reanudar() avisa al invitado
    this.avisarPausa(true);
    Pausa.menuLider();
  },
  // "Finalizar juego": manda a los dos al menú principal y cierra la sala
  finalizar() {
    this.enviar({ t: 'finalizar' });
    setTimeout(() => { this.cerrar(true); Juego.irAlMenu(); }, 200);
  },
  avisarFin(tipo, monedas) { if (this.esAnfitrion) { this.enPartida = false; this.enviar({ t: 'fin', tipo, monedas, escenario: Juego.mundo && Juego.mundo.escenarioId }); } },
  volverAlLobby() { this.enPartida = false; this.enviar({ t: 'lobby' }); Menus.enLineaConectado(); },

  errorRed(err) {
    console.warn('Error de red', err);
    const msg = err.type === 'browser-incompatible' ? 'Este navegador no permite jugar en línea.'
      : 'No se pudo conectar. Revisa tu conexión a internet e inténtalo de nuevo.';
    this.cerrar(true);
    Menus.enLineaMensaje(msg, () => Menus.enLineaInicio());
  },

  // Salir de la sala (silencio = sin avisar a la interfaz)
  cerrar(silencio = false) {
    if (this.esAnfitrion) this.enviar({ t: 'cerrar' });
    if (this.esInvitado) this.enviar({ t: 'adios' });
    const peer = this.peer;
    this.peer = null;
    const conn = this.conn;
    this.conn = null;
    setTimeout(() => { try { if (conn) conn.close(); } catch (e) {} try { if (peer) peer.destroy(); } catch (e) {} }, 150);
    this.cerrarCanalRapido();
    this.rol = null; this.conectado = false; this.ping = null; this.enPartida = false;
    this.pausadoPorAnfitrion = false; this.menuAbierto = false;
    Sincro.espejo = null;
    if (Juego.entrada) delete Juego.entrada.fuentesRemotas[1];
    this.soltarPantalla();
    if (!silencio) Juego.irAlMenu();
  },

  // ---------- Celular: no apagar la pantalla y pedir horizontal ----------
  async mantenerPantalla() {
    try { if ('wakeLock' in navigator && !this.bloqueoPantalla) this.bloqueoPantalla = await navigator.wakeLock.request('screen'); } catch (e) { /* requiere HTTPS */ }
    if (esDispositivoTactil() && screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
  },
  soltarPantalla() {
    try { if (this.bloqueoPantalla) this.bloqueoPantalla.release(); } catch (e) {}
    this.bloqueoPantalla = null;
  },
};

setInterval(() => EnLinea.tic(), RED_CONFIG.pingCadaSegundos * 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && EnLinea.activo && EnLinea.enPartida) { EnLinea.bloqueoPantalla = null; EnLinea.mantenerPantalla(); }
});
