/* =====================================================================
   JUEGO EN LÍNEA PARA 2 (WebRTC con PeerJS)
   - Quien crea la sala es el ANFITRIÓN (Bubu): ejecuta toda la simulación.
   - Quien se une es el INVITADO (Dudu): envía sus controles y dibuja el
     estado que le llega (ver js/red/sincronizacion.js).
   Mensajes (JSON, campo "t"):
     anfitrión -> invitado: hola, llena, lobby, inicio, e (estado), pausa, fin, cerrar
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
    this.enviar({ t: 'inicio', modo: m.modo, personajes: ['bubu', 'dudu'], escenario: m.escenarioId, semilla: 1, nivel: m.nivel });
    this.mantenerPantalla();
  },

  // Llamado en cada cuadro después de simular (anfitrión)
  trasPasos(m, dt) {
    if (!this.conectado) { this.eventosPendientes = []; return; }
    for (const e of m.eventos) this.eventosPendientes.push(Object.assign({}, e));
    this.tEnvio += dt;
    if (this.tEnvio >= 1 / RED_CONFIG.estadosPorSegundo) {
      this.tEnvio = 0;
      this.enviar({ t: 'e', d: Sincro.instantanea(m, this.eventosPendientes) });
      this.eventosPendientes = [];
    }
  },

  invitadoSeFue() {
    if (!this.conectado) return;
    this.conectado = false;
    this.conn = null;
    if (this.controlRemoto) this.controlRemoto.soltarTodo();
    if (Juego.mundo && this.enPartida && (Juego.estado === 'jugando' || Juego.estado === 'pausa' || Juego.estado === 'carga')) {
      Juego.estado = 'pausa';
      Juego.tactil.mostrar(false);
      Menus.enLineaInvitadoDesconectado(this.codigo);
    } else if (this.esAnfitrion) {
      Menus.enLineaEsperando(this.codigo, 'Dudu salió de la sala. Esperando a que vuelva a entrar…');
    }
  },

  // "Seguir solo": Dudu queda fuera del juego hasta que vuelva
  seguirSolo() {
    const d = Juego.mundo && Juego.mundo.jugadores[1];
    if (d && d.estado !== 'muerto') {
      d.vidaGuardada = d.vida; d.estadoGuardado = d.estado;
      d.estado = 'muerto'; d.ausente = true; d.accion = null;
    }
    Juego.reanudar();
  },

  // El invitado volvió durante una partida
  reincorporarInvitado() {
    const m = Juego.mundo;
    const d = m.jugadores[1], b = m.jugadores[0];
    if (d && d.ausente) {
      d.ausente = false;
      d.estado = d.estadoGuardado === 'caido' ? 'caido' : 'normal';
      d.vida = Math.max(1, d.vidaGuardada || d.vidaMax * 0.5);
      d.x = b.x - 60 * b.dir; d.y = b.y - 200; d.vy = 0; d.invulnerable = 2;
    }
    this.enviar({ t: 'inicio', modo: m.modo, personajes: ['bubu', 'dudu'], escenario: m.escenarioId, semilla: 1, nivel: m.nivel, reingreso: true });
    if (Juego.estado === 'pausa') Juego.reanudar();
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
      if (!this.menuAbierto) { this.menuAbierto = true; Menus.enLineaMenuInvitado(); }
    }
    let c = juego.entrada.leer(1)[0];
    if (this.menuAbierto || this.pausadoPorAnfitrion) c = new EstadoControl();
    if (!this.pausadoPorAnfitrion) Sincro.predecir(dt, c);
    this.acumulador.agregar(c);
    this.tEnvio += dt;
    if (this.tEnvio >= 1 / RED_CONFIG.controlesPorSegundo) { this.tEnvio = 0; this.enviar(Object.assign({ t: 'c' }, this.acumulador.sacar())); }

    const m = juego.mundo;
    const yo = m.jugadores[1];
    const caido = m.jugadores.find((j) => j.estado === 'caido');
    juego.tactil.actualizarVisual(yo, !!(caido && caido !== yo && yo.vivo && Math.abs(yo.x - caido.x) <= CONFIG.revivir.distancia));
  },

  // ======================= COMÚN =======================
  enviar(o) {
    if (this.conn && this.conn.open) { try { this.conn.send(o); } catch (e) { /* conexión cerrándose */ } }
  },

  recibir(d) {
    // Retraso de red simulado (solo pruebas, ver RED_CONFIG.latenciaPrueba). Mantiene el orden.
    const lp = RED_CONFIG.latenciaPrueba;
    if (lp && lp.ms > 0 && !d._retrasado) {
      const cuando = Math.max(this.ultimaEntrega || 0, performance.now() + lp.ms + (Math.random() * 2 - 1) * lp.variacion);
      this.ultimaEntrega = cuando;
      d._retrasado = true;
      setTimeout(() => this.recibir(d), cuando - performance.now());
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
      case 'e': if (this.esInvitado && Sincro.espejo) Sincro.recibirInstantanea(d.d); break;
      case 'pausa':
        this.pausadoPorAnfitrion = d.on;
        if (d.on) Menus.enLineaPausaAnfitrion(); else if (!this.menuAbierto && Juego.estado === 'jugando') Menus.ocultar();
        break;
      case 'fin': this.finInvitado(d); break;
      case 'cerrar': this.salaCerrada('El anfitrión cerró la sala.'); break;
      // --- al anfitrión ---
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
  avisarPausa(on) { if (this.esAnfitrion) this.enviar({ t: 'pausa', on }); },
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
