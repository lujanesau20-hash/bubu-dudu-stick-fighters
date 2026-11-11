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

  // SOLO PRUEBAS (consola): simula que este dispositivo pierde la red durante "ms":
  // no entra ni sale ningún mensaje del juego. Ej.: EnLinea.simularCorte(10000)
  simularCorte(ms) { this.cortadoHasta = performance.now() + ms; this.registrarRed(`Prueba: corte de red simulado de ${ms} ms`); },
  get cortado() { return !!this.cortadoHasta && performance.now() < this.cortadoHasta; },

  // Evento de conexión para "Copiar registro" (ver Depuracion.eventoRed)
  registrarRed(texto) { if (typeof Depuracion !== 'undefined' && Depuracion.eventoRed) Depuracion.eventoRed(texto); },

  // Estados ICE, de la conexión WebRTC y del canal fiable (para el registro)
  vigilarConexion(conn) {
    const pc = conn && conn.peerConnection;
    if (pc && !pc._vigilada) {
      pc._vigilada = true;
      this.registrarRed(`ICE: ${pc.iceConnectionState} · WebRTC: ${pc.connectionState || '?'}`);
      pc.addEventListener('iceconnectionstatechange', () => {
        const st = pc.iceConnectionState;
        this.registrarRed('ICE: ' + st);
        // "disconnected" suele ser un corte de segundos: NO se expulsa a nadie.
        // El invitado ve "Reconectando…"; si en silencioInvitadoSegundos no vuelve, reconecta solo.
        if (this.conn !== conn || !this.esInvitado) return;
        if (st === 'disconnected') {
          this.iceCaida = true;
          if (!this.reconectando) Menus.avisoRed('Reconectando…', `La conexión con el líder se cortó un momento. Esperando que vuelva (hasta ${RED_CONFIG.conexion.silencioInvitadoSegundos} s)…`, { salir: true });
        } else if ((st === 'connected' || st === 'completed') && this.iceCaida) {
          this.iceCaida = false;
          this.registrarRed('Invitado: la conexión volvió sola');
          if (!this.reconectando && !this.avisoSinDatos) Menus.ocultarAvisoRed();
        }
      });
      pc.addEventListener('connectionstatechange', () => this.registrarRed('Conexión WebRTC: ' + pc.connectionState));
    }
    const dc = conn && conn.dataChannel;
    if (dc && !dc._vigilado) {
      dc._vigilado = true;
      dc.addEventListener('close', () => this.registrarRed('DataChannel fiable: cerrado'));
      dc.addEventListener('error', () => this.registrarRed('DataChannel fiable: error'));
    }
  },
  vigilarPeer(peer, quien) {
    peer.on('open', () => this.registrarRed(`${quien}: conectado al servidor de emparejamiento`));
    peer.on('disconnected', () => this.registrarRed(`${quien}: se perdió el servidor de emparejamiento`));
    peer.on('error', (err) => this.registrarRed(`${quien}: error ${err.type || ''} ${err.message || ''}`.trim()));
  },

  // Errores del SERVIDOR DE EMPAREJAMIENTO (0.peerjs.com). Ese servidor solo sirve para
  // encontrarse; una vez conectados, la partida va directa entre los dos dispositivos.
  // Antes estos errores (p. ej. "network: Lost connection to server" cuando el internet
  // parpadea) cerraban la conexión del invitado: esa era la causa de las expulsiones.
  esErrorServidor(err) {
    return ['network', 'socket-error', 'socket-closed', 'server-error', 'disconnected'].includes(err && err.type);
  },
  // Volver a conectarse al servidor de emparejamiento cada pocos segundos (sin tocar la partida)
  reconectarServidor(peer, quien) {
    if (!peer || peer.destroyed) return;
    clearTimeout(this.tServidor);
    this.tServidor = setTimeout(() => {
      if (this.peer !== peer || peer.destroyed || !peer.disconnected) return;
      this.registrarRed(`${quien}: reintentando el servidor de emparejamiento`);
      try { peer.reconnect(); } catch (e) { this.reconectarServidor(peer, quien); }
    }, RED_CONFIG.conexion.esperaServidorSegundos * 1000);
  },

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
    Menus.enLineaCreando();
    // Primero las credenciales TURN (máximo unos segundos); si fallan, sigue solo con STUN
    const turno = this.turnoSala;
    this.prepararIce().then(() => { if (turno === this.turnoSala && this.esAnfitrion) this.abrirSalaAnfitrion(intento); });
  },

  abrirSalaAnfitrion(intento) {
    this.codigo = this.nuevoCodigo();
    const peer = new Peer(RED_CONFIG.prefijoSala + this.codigo, this.opcionesPeer());
    this.peer = peer;
    this.registrarRed(`Líder: creando sala ${this.codigo}`);
    this.vigilarPeer(peer, 'Líder');

    peer.on('open', () => {
      if (peer._abrio) return; // al volver al servidor no se redibuja la sala
      peer._abrio = true;
      Menus.enLineaEsperando(this.codigo);
    });
    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      if (err.type === 'unavailable-id' && intento < 6) { peer.destroy(); this.crearSala(intento + 1); return; } // código en uso: otro
      if (err.type === 'peer-unavailable') return;
      // Sala ya abierta: un corte del servidor de emparejamiento NO cierra la sala ni expulsa al invitado
      if (peer._abrio && this.esErrorServidor(err)) {
        this.registrarRed('Líder: sin servidor de emparejamiento (' + err.type + '); la sala y la partida siguen');
        this.reconectarServidor(peer, 'Líder');
        return;
      }
      this.errorRed(err);
    });
    peer.on('disconnected', () => { if (this.peer === peer) this.reconectarServidor(peer, 'Líder'); }); // seguir aceptando reconexiones
    peer.on('connection', (conn) => this.alConectarInvitado(conn));
  },

  alConectarInvitado(conn) {
    // La sala admite solo 2 personas. Pero si es el MISMO invitado que vuelve tras una caída
    // (misma marca de sesión) o la conexión vieja ya está callada, se cambia por la nueva.
    if (this.conn && this.conectado) {
      const token = conn.metadata && conn.metadata.token;
      const mismo = !!token && token === this.tokenInvitado;
      const callada = performance.now() - this.ultimoMensaje > RED_CONFIG.conexion.liderAceptaTrasMs;
      if (!mismo && !callada) {
        this.registrarRed('Líder: rechazada una tercera persona (sala llena)');
        conn.on('open', () => { conn.send({ t: 'llena' }); setTimeout(() => conn.close(), 500); });
        return;
      }
      this.registrarRed(`Líder: el invitado volvió con una conexión nueva (${mismo ? 'misma sesión' : 'la vieja estaba callada'})`);
      const vieja = this.conn;
      this.invitadoSeFue('cambio por la conexión nueva del invitado', true);
      try { vieja.close(); } catch (e) {}
    }
    this.tokenInvitado = conn.metadata && conn.metadata.token;
    this.registrarRed('Líder: llega una conexión del invitado');
    this.conn = conn;
    const lento = setTimeout(() => { if (!this.conectado && this.conn === conn) Menus.enLineaAvisoLento(); }, RED_CONFIG.avisoTurnSegundos * 1000);
    conn.on('open', () => {
      clearTimeout(lento);
      this.conectado = true;
      this.ultimoMensaje = performance.now();
      this.registrarRed('Líder: canal con el invitado abierto');
      this.vigilarConexion(conn);
      this.abrirCanalRapido(conn);
      Sincro.reiniciarDelta(); // el invitado (nuevo o que volvió) no conoce ningún dato: todo se manda completo
      this.controlRemoto = new ControlRemoto();
      this.enviar({ t: 'hola', personaje: 'dudu', version: VERSION_JUEGO, vv: VERSION_VISIBLE });
      if (Juego.mundo && Juego.estado !== 'menu' && this.enPartida) this.reincorporarInvitado();
      else { Menus.enLineaConectado(); this.enviar({ t: 'lobby' }); } // si volvía de una partida que ya terminó, va a la sala
    });
    conn.on('data', (d) => this.recibir(d));
    conn.on('close', () => { if (this.conn === conn) this.invitadoSeFue('se cerró la conexión con el invitado'); });
    conn.on('error', (e) => { if (this.conn === conn) this.invitadoSeFue('error en la conexión del invitado ' + (e && e.type ? e.type : '')); });
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
    Sincro.reiniciarDelta();
    this.iniciarRelojEnvio();
    this.enviar({ t: 'inicio', modo: m.modo, personajes: ['bubu', 'dudu'], escenario: m.escenarioId, semilla: 1, nivel: m.nivel });
    this.mantenerPantalla();
  },

  // ---------- Reloj de envío del líder (20 Hz estables, separado del dibujo) ----------
  // Un temporizador propio avanza la simulación hasta "ahora" y manda el snapshot.
  // Así el envío no depende de cuándo se dibuja: si el líder se atrasa, se omiten
  // cuadros de dibujo (ver Juego.bucle), no snapshots.
  iniciarRelojEnvio() {
    clearTimeout(this.tReloj);
    if (!RED_CONFIG.relojEnvio.activo || !this.esAnfitrion) return;
    const intervalo = 1000 / RED_CONFIG.estadosPorSegundo;
    let proximo = performance.now() + intervalo;
    const tic = () => {
      if (!this.esAnfitrion) return;
      const juego = Juego;
      // Con la pestaña del líder oculta el juego queda quieto, como antes (no avanza a escondidas)
      if (juego.estado === 'jugando' && juego.mundo && this.conectado && !document.hidden) {
        juego.avanzarSimulacion(performance.now());
        const t0 = performance.now();
        this.enviarEstado(juego.mundo);
        if (typeof Depuracion !== 'undefined') Depuracion.medir('red', performance.now() - t0);
      }
      proximo += intervalo;
      const ahora = performance.now();
      if (proximo < ahora - intervalo) proximo = ahora + intervalo; // muy atrasado: sin ráfagas
      this.tReloj = setTimeout(tic, Math.max(0, proximo - ahora));
    };
    this.tReloj = setTimeout(tic, intervalo);
  },

  // Guarda los efectos del paso para mandarlos con el próximo snapshot, en formato corto.
  // Las sacudidas de cámara se juntan en una sola (la más fuerte) por envío.
  recogerEventos(m) {
    if (!this.conectado) { this.eventosPendientes = []; this.sacudidaPendiente = null; return; }
    for (const e of m.eventos) {
      if (e.tipo === 'sacudir') {
        if (!this.sacudidaPendiente || e.fuerza > this.sacudidaPendiente.fuerza) this.sacudidaPendiente = { tipo: 'sacudir', fuerza: e.fuerza };
        continue;
      }
      this.eventosPendientes.push(Sincro.efectoCorto(e));
    }
  },

  // Llamado en cada cuadro después de simular (anfitrión, sin reloj de envío)
  trasPasos(m, dt) {
    if (!this.conectado) { this.eventosPendientes = []; return; }
    for (const e of m.eventos) this.eventosPendientes.push(Object.assign({}, e));
    // Ritmo estable: se descuenta el intervalo (antes se reiniciaba a 0 y salía irregular)
    // Si este cuadro se pasó de tiempo, el líder está "atrasado" por un momento:
    // baja la frecuencia y el envío de este cuadro pasa al siguiente (la simulación no espera al envío)
    const ra = RED_CONFIG.liderAtrasado;
    const lento = dt * 1000 > ra.cuadroMs;
    if (lento) this.atrasadoHasta = performance.now() + ra.segundos * 1000;
    const intervalo = 1 / this.ritmoEnvio(dt);
    this.tEnvio += dt;
    if (this.tEnvio >= intervalo) {
      if (lento && !this.envioAplazado) { this.envioAplazado = true; return; }
      this.envioAplazado = false;
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
    let hz = this.tLento >= ll.segundosParaCambiar ? ll.estadosPorSegundo : RED_CONFIG.estadosPorSegundo;
    // Atrasado solo por un momento (un pico de efectos): frecuencia más baja solo mientras dura
    this.atrasado = performance.now() < (this.atrasadoHasta || 0);
    if (this.atrasado) hz = Math.min(hz, RED_CONFIG.liderAtrasado.estadosPorSegundo);
    this.estadosPorSegundoActual = hz;
    return hz;
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
    if (this.sacudidaPendiente) { eventos.push(Sincro.efectoCorto(this.sacudidaPendiente)); this.sacudidaPendiente = null; }
    // Efectos visuales: por el canal fiable (no se pierden), con la hora del snapshot
    if (eventos.length) this.enviar({ t: 'ev', w: snap.w, v: eventos });
    const o = { t: 'e2', d: Sincro.comprimir(snap) };
    if (this.cortado) return; // prueba de corte de red
    const texto = JSON.stringify(o);
    if (typeof Depuracion !== 'undefined') Depuracion.registrarSnapshot(texto.length);
    const rc = this.canalRapido;
    if (rc && rc.readyState === 'open') {
      // Si la cola crece, este snapshot se descarta: cuando baje sale el más reciente
      if (rc.bufferedAmount > RED_CONFIG.cola.maxRapidoBytes) { this.snapsDescartados = (this.snapsDescartados || 0) + 1; return; }
      try { rc.send(texto); } catch (e) { /* se reintenta con el próximo */ }
    } else {
      // Sin canal rápido: por el fiable, pero sin dejar que se acumule
      const dc = this.conn && this.conn.dataChannel;
      if (dc && dc.bufferedAmount > RED_CONFIG.cola.maxFiableBytes) { this.snapsDescartados = (this.snapsDescartados || 0) + 1; return; }
      this.enviar(o);
    }
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
      // Canal solo para ping/pong: mensajes pequeños que no esperan detrás de los snapshots
      const dp = pc.createDataChannel('ping', { negotiated: true, id: cfg.idPing, ordered: false, maxRetransmits: 0 });
      dp.onmessage = (ev) => {
        if (this.canalPing !== dp) return;
        let d;
        try { d = JSON.parse(ev.data); } catch (e) { return; }
        this.recibir(d, ev.data.length, dp);
      };
      this.canalPing = dp;
      dc.onclose = () => { if (this.canalRapido === dc) this.registrarRed('DataChannel rápido: cerrado'); };
      dc.onopen = () => this.registrarRed('DataChannel rápido: abierto');
    } catch (e) { console.warn('Canal rápido no disponible', e); this.canalRapido = null; this.canalPing = null; }
  },
  cerrarCanalRapido() {
    const dc = this.canalRapido, dp = this.canalPing;
    this.canalRapido = null; this.canalPing = null;
    try { if (dc) dc.close(); } catch (e) {}
    try { if (dp) dp.close(); } catch (e) {}
  },

  // Enviar por el canal rápido (sin orden ni reenvíos); si no está abierto, por el fiable
  enviarRapido(o) {
    if (this.cortado) return false; // prueba de corte de red
    const rc = this.canalRapido;
    if (rc && rc.readyState === 'open') {
      if (rc.bufferedAmount > RED_CONFIG.cola.maxRapidoBytes) return false; // cola llena: se descarta
      try { rc.send(JSON.stringify(o)); return true; } catch (e) { return false; }
    }
    this.enviar(o);
    return true;
  },

  // ---------- Credenciales TURN del Worker de Cloudflare ----------
  async prepararIce() {
    const cfg = RED_CONFIG.turnWorker;
    if (!cfg || !cfg.url) { RED_CONFIG.iceExtra = []; this.estadoTurn = 'sin configurar (solo STUN)'; return; }
    const c = this.iceCache;
    if (c && Date.now() < c.hasta) { RED_CONFIG.iceExtra = c.lista; this.estadoTurn = 'listo (Cloudflare)'; return; }
    this.estadoTurn = 'pidiendo credenciales…';
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const espera = setTimeout(() => { if (ctrl) ctrl.abort(); }, cfg.esperaMs);
    try {
      const r = await fetch(cfg.url, { method: 'GET', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
      if (!r.ok) {
        let motivo = 'respuesta ' + r.status;
        try { const j = await r.json(); if (j && j.error) motivo = j.error; } catch (e) {}
        throw new Error(motivo);
      }
      const lista = await r.json();
      if (!Array.isArray(lista) || !lista.length) throw new Error('respuesta vacía');
      RED_CONFIG.iceExtra = lista;
      this.iceCache = { lista, hasta: Date.now() + cfg.reusarMinutos * 60000 };
      this.estadoTurn = 'listo (Cloudflare)';
    } catch (e) {
      RED_CONFIG.iceExtra = [];
      this.estadoTurn = 'no disponible: ' + (e.name === 'AbortError' ? 'sin respuesta' : e.message) + ' (solo STUN)';
      console.warn('TURN no disponible, se usa solo STUN:', e.message || e);
    } finally { clearTimeout(espera); }
  },

  // motivo: se muestra en pantalla y queda en "Copiar registro". cambio: el mismo invitado vuelve enseguida (sin aviso)
  invitadoSeFue(motivo = 'el invitado salió', cambio = false) {
    if (!this.conectado) return;
    this.registrarRed('Líder: el invitado quedó fuera — motivo: ' + motivo);
    this.conectado = false;
    this.conn = null;
    if (this.controlRemoto) this.controlRemoto.soltarTodo();
    if (cambio) { if (Juego.mundo && this.enPartida) this.marcarAusente(); return; }
    if (Juego.mundo && this.enPartida && (Juego.estado === 'jugando' || Juego.estado === 'pausa' || Juego.estado === 'carga')) {
      // El líder sigue jugando sin parar; Dudu queda fuera hasta que vuelva con el código
      this.marcarAusente();
      Menus.enLineaToast(`${getNombreJugador(Juego.mundo.jugadores[1])} salió (${motivo}). Puede volver con el código ${this.codigo}`, 5000);
      if (Juego.estado === 'pausa') Pausa.menuLider(); // ahora el líder puede reanudar solo
    } else if (this.esAnfitrion) {
      Menus.enLineaEsperando(this.codigo, `Dudu salió de la sala (${motivo}). Esperando a que vuelva a entrar…`);
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
    // Marca de esta sesión: así el líder reconoce que es el mismo invitado si vuelve tras una caída
    this.tokenInvitado = this.tokenInvitado || Math.random().toString(36).slice(2, 10);
    this.registrarRed(`Invitado: uniéndose a la sala ${codigo}`);
    Menus.enLineaUniendo(codigo);
    // Si no conecta en "tiempoConectarSegundos": aviso con Reintentar y Salir
    clearTimeout(this.tConectar);
    const turnoJ = this.turnoSala;
    this.tConectar = setTimeout(() => {
      if (turnoJ !== this.turnoSala || !this.esInvitado || this.conectado || this.reconectando) return;
      this.registrarRed(`Invitado: no se pudo conectar en ${RED_CONFIG.conexion.tiempoConectarSegundos} s`);
      this.fallaUnirse(codigo, 'No se pudo conectar a la sala (sin respuesta). Revisa el internet de los dos dispositivos.');
    }, RED_CONFIG.conexion.tiempoConectarSegundos * 1000);
    const turno = this.turnoSala;
    this.prepararIce().then(() => { if (turno === this.turnoSala && this.esInvitado) this.abrirConexionInvitado(codigo); });
  },

  abrirConexionInvitado(codigo) {
    const peer = new Peer(this.opcionesPeer());
    this.peer = peer;
    this.vigilarPeer(peer, 'Invitado');
    const lento = setTimeout(() => { if (!this.conectado && this.peer === peer && !this.reconectando) Menus.enLineaAvisoLento(); }, RED_CONFIG.avisoTurnSegundos * 1000);
    peer.on('open', () => {
      if (this.peer !== peer) return;
      const conn = peer.connect(RED_CONFIG.prefijoSala + codigo, { reliable: true, serialization: 'json', metadata: { token: this.tokenInvitado } });
      this.conn = conn;
      conn.on('open', () => {
        if (this.conn !== conn) return;
        clearTimeout(lento); clearTimeout(this.tConectar);
        this.conectado = true;
        this.ultimoMensaje = performance.now();
        this.registrarRed('Invitado: canal con el líder abierto' + (this.reconectando ? ` (reconexión, intento ${this.reconectando.intento})` : ''));
        this.vigilarConexion(conn);
        if (this.reconectando) {
          // Volvimos: el líder manda "inicio" con reingreso y el estado completo
          clearTimeout(this.tReintento);
          this.reconectando = null;
          Menus.avisoRed('Conectando…', 'Volviendo a la partida, esperando el estado del líder…', { salir: true });
        }
        this.abrirCanalRapido(conn);
        this.acumulador = new AcumuladorControl();
        this.enviar({ t: 'version', version: VERSION_JUEGO, vv: VERSION_VISIBLE }); // el líder compara su versión con la nuestra
      });
      conn.on('data', (d) => this.recibir(d));
      // Una caída que no pidió nadie: intentar volver a la sala (no ir al menú)
      conn.on('close', () => { if (this.conn === conn) this.reconectar('el canal con el líder se cerró'); });
      conn.on('error', (e) => { if (this.conn === conn) this.reconectar('error en el canal: ' + (e && e.type ? e.type : '?')); });
    });
    peer.on('error', (err) => {
      if (this.peer !== peer) return;
      clearTimeout(lento);
      if (err.type === 'peer-unavailable') {
        if (this.reconectando || this.enPartida) { this.finReconexion('La sala ya no existe: el líder la cerró o perdió su conexión.'); return; }
        this.cerrar(true); Menus.enLineaUnirse(codigo, `La sala ${codigo} no existe. Revisa el código.`); return;
      }
      if (this.reconectando) return; // el próximo intento lo vuelve a probar
      // Ya conectado con el líder: perder el servidor de emparejamiento NO corta la partida
      // (antes esto cerraba la conexión directa y el invitado quedaba expulsado)
      if (this.esErrorServidor(err) && (this.conectado || this.enPartida)) {
        this.registrarRed('Invitado: sin servidor de emparejamiento (' + err.type + '); la partida sigue por la conexión directa');
        return;
      }
      this.errorRed(err);
    });
  },

  // Cierra la conexión del invitado SIN salir de la sala (para reconectar)
  cerrarConexionInvitado() {
    const peer = this.peer, conn = this.conn;
    this.peer = null; this.conn = null; this.conectado = false;
    this.cerrarCanalRapido();
    setTimeout(() => { try { if (conn) conn.close(); } catch (e) {} try { if (peer) peer.destroy(); } catch (e) {} }, 0);
  },

  // ---------- Reconexión automática del invitado (config/red.js -> conexion) ----------
  reconectar(motivo) {
    if (!this.esInvitado) return;
    if (this.reconectando) { this.cerrarConexionInvitado(); this.intentarReconexion(); return; }
    this.registrarRed('Invitado: conexión perdida (' + motivo + ')');
    this.reconectando = { intento: 0, motivo };
    this.cerrarConexionInvitado();
    this.intentarReconexion();
  },
  intentarReconexion() {
    const r = this.reconectando, cc = RED_CONFIG.conexion;
    if (!r || !this.esInvitado) return;
    r.intento++;
    if (r.intento > cc.reintentos) { this.finReconexion(`No se pudo volver a la sala después de ${cc.reintentos} intentos.`); return; }
    this.registrarRed(`Invitado: intento de reconexión ${r.intento} de ${cc.reintentos}`);
    Menus.avisoRed('Reconectando…', `Se perdió la conexión. Intento ${r.intento} de ${cc.reintentos}…`, { salir: true });
    clearTimeout(this.tReintento);
    const espera = r.intento === 1 ? 0 : cc.esperaEntreIntentosSegundos * 1000;
    this.tReintento = setTimeout(() => {
      if (this.reconectando !== r) return;
      this.abrirConexionInvitado(this.codigo);
      this.tReintento = setTimeout(() => {
        if (this.reconectando !== r || this.conectado) return;
        this.registrarRed(`Invitado: el intento ${r.intento} no conectó en ${cc.tiempoIntentoSegundos} s`);
        this.cerrarConexionInvitado();
        this.intentarReconexion();
      }, cc.tiempoIntentoSegundos * 1000);
    }, espera);
  },
  finReconexion(texto) {
    clearTimeout(this.tReintento);
    this.reconectando = null;
    this.cerrarConexionInvitado();
    this.registrarRed('Invitado: ' + texto);
    Menus.avisoRed('No se pudo conectar', texto, { reintentar: true, salir: true });
  },
  // Al unirse (antes de entrar a una partida) no se pudo conectar
  fallaUnirse(codigo, texto) {
    this.registrarRed('Invitado: no se pudo conectar — motivo: ' + texto);
    this.cerrarConexionInvitado();
    Menus.avisoRed('No se pudo conectar', texto, {
      reintentar: () => { Menus.ocultarAvisoRed(); this.unirse(codigo); },
      salir: true,
    });
  },

  // Cada 250 ms (invitado): si en partida no llegan snapshots en ~2 s, aviso claro (nunca pantalla negra)
  vigilarDatos() {
    if (!this.esInvitado || this.reconectando) return;
    const cc = RED_CONFIG.conexion, ahora = performance.now();
    const enJuego = this.enPartida && (Juego.estado === 'jugando' || Juego.estado === 'carga') && !this.pausadoPorAnfitrion;
    const ult = Math.max(Sincro.ultimaLlegada || 0, this.tInicioPartida || 0);
    if (enJuego && this.conectado && ahora - ult > cc.sinDatosSegundos * 1000) {
      if (!this.avisoSinDatos) {
        this.avisoSinDatos = true;
        const nunca = !Sincro.ultimaLlegada;
        this.registrarRed(nunca ? `Invitado: no llegó ningún snapshot ${cc.sinDatosSegundos} s después de entrar` : `Invitado: sin snapshots hace ${cc.sinDatosSegundos} s`);
      }
      const pingVivo = ahora - this.ultimoMensaje < 1500;
      Menus.avisoRed(pingVivo ? 'Esperando datos del líder…' : 'Reconectando…',
        pingVivo ? 'La conexión sigue, pero no llega el juego (¿el líder tiene el juego en segundo plano?).' : 'No llegan datos del líder.',
        { reintentar: () => this.reconectar('botón Reintentar'), salir: true });
    } else if (this.avisoSinDatos && Sincro.ultimaLlegada && ahora - Sincro.ultimaLlegada < 300) {
      this.avisoSinDatos = false;
      this.registrarRed('Invitado: volvieron los snapshots');
      Menus.ocultarAvisoRed();
    }
  },

  salaCerrada(texto = 'La sala se cerró.') {
    if (!this.esInvitado) return;
    this.registrarRed('Invitado: fuera de la sala — motivo: ' + texto);
    this.cerrar(true);
    Juego.mundo = null;
    Juego.estado = 'menu';
    Juego.tactil.mostrar(false);
    Menus.enLineaMensaje(texto, () => Juego.irAlMenu());
  },

  // Datos de inicio de partida
  alInicio(d) {
    this.enPartida = true;
    this.tInicioPartida = performance.now();
    this.avisoSinDatos = false;
    this.registrarRed(d.reingreso ? 'Invitado: volvió a la partida (estado completo del líder)' : 'Invitado: empieza la partida');
    const juego = Juego;
    juego.modo = d.modo;
    juego.personajes = d.personajes;
    juego.entrada.configurar([CONFIG.controles.solo]);
    const m = Sincro.crearEspejo(d, 1);
    m.mapasHud = [null, CONFIG.controles.solo];
    juego.mundo = m;
    juego.efectos.reiniciar();
    juego.hud.reiniciar();
    juego.camara.saltarA(m, juego.render.anchoBase, juego.render.altoVista, juego.render.encuadreCelular);
    juego.finMostrado = true; // el fin lo avisa el anfitrión
    this.menuAbierto = false;
    this.pausadoPorAnfitrion = false; // al (re)iniciar un nivel ya no hay pausa
    this.tEnvio = 0;
    this.mantenerPantalla();
    juego.estado = 'carga';
    Menus.carga(d.reingreso ? 'Volviendo a la partida…' : `Nivel ${d.nivel} · ${(ESCENARIOS[d.escenario] || ESCENARIOS.isla).nombre}`);
    clearTimeout(this.tCarga);
    // El juego aparece solo cuando ya llegó el primer estado del líder (nunca un mundo vacío)
    const empezar = () => {
      if (juego.estado !== 'carga' || juego.mundo !== m) return;
      if (!Sincro.buffer.length) { this.tCarga = setTimeout(empezar, 150); return; }
      juego.estado = 'jugando';
      Menus.ocultar(); Menus.ocultarAvisoRed();
      juego.tactil.mostrar(juego.esTactil);
    };
    this.tCarga = setTimeout(empezar, d.reingreso ? 0 : 1600);
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
    const xq = Math.round(c.x * 10); // el joystick es analógico: solo cuenta un cambio de 10%
    const cambio = xq !== u.x || c.abajo !== u.abajo || c.saltoMantenido !== u.saltoMantenido || c.revivir !== u.revivir
      || c.saltoPulsado || c.combo || c.habilidades.some(Boolean);
    this.ultimoControl = { x: xq, abajo: c.abajo, saltoMantenido: c.saltoMantenido, revivir: c.revivir };
    // Por el canal rápido (sin reenvíos): cada mensaje lleva las pulsaciones acumuladas
    if (cambio || this.tEnvio >= 1 / RED_CONFIG.controlesPorSegundo) { this.tEnvio = 0; this.enviarRapido(Object.assign({ t: 'c' }, this.acumulador.sacar())); }

    const m = juego.mundo;
    const yo = m.jugadores[1];
    const caido = m.jugadores.find((j) => j.estado === 'caido');
    juego.tactil.actualizarVisual(yo, !!(caido && caido !== yo && yo.vivo && Math.abs(yo.x - caido.x) <= CONFIG.revivir.distancia));
  },

  // ======================= MEDICIÓN Y VERSIONES =======================
  // Ping: se guardan las muestras para mostrar el PROMEDIO de los últimos segundos y la variación (jitter)
  registrarPing(ms) {
    const cfg = CONFIG.interfaz.medicion;
    const ahora = performance.now();
    const m = this.muestrasPing || (this.muestrasPing = []);
    m.push({ t: ahora, ms });
    while (m.length > 60) m.shift();
    const recientes = m.filter((x) => ahora - x.t <= cfg.promedioPingSegundos * 1000 + 50);
    this.pingPromedio = recientes.length ? Math.round(recientes.reduce((a, x) => a + x.ms, 0) / recientes.length) : ms;
    const ult = m.slice(-cfg.muestrasJitter);
    let suma = 0;
    for (let i = 1; i < ult.length; i++) suma += Math.abs(ult[i].ms - ult[i - 1].ms);
    this.jitter = ult.length > 1 ? Math.round(suma / (ult.length - 1)) : 0;
  },
  // Snapshots enviados (líder) y recibidos (invitado) por segundo, desde este lado
  snapsEnviadosRecibidos() {
    const propio = typeof Depuracion !== 'undefined' ? Depuracion.snapsPorSeg : 0;
    return this.esAnfitrion ? { env: propio, rec: this.snapsOtro } : { env: this.snapsOtro, rec: propio };
  },
  // ¿Conexión inestable? (ping alto, mucha variación o muchos snapshots perdidos)
  conexionInestable() {
    if (!this.conectado || !this.enPartida) return false;
    const c = CONFIG.interfaz.medicion.inestable;
    const { env, rec } = this.snapsEnviadosRecibidos();
    const perdida = env > 0 && rec != null ? Math.max(0, (env - rec) / env) * 100 : 0;
    this.perdidaPorcentaje = Math.round(perdida);
    return (this.pingPromedio || 0) > c.pingMs || (this.jitter || 0) > c.jitterMs || perdida > c.perdidaPorcentaje;
  },
  // Versión de la otra persona. Distinta = NO se expulsa: aviso claro con botón para recargar sin caché.
  // v: versión técnica (VERSION_JUEGO) · vv: número visible (v1.00). Versiones viejas no mandan vv.
  compararVersion(v, vv) {
    this.versionOtro = v || '(desconocida)';
    this.versionOtroVisible = vv ? 'v' + vv : this.versionOtro;
    this.versionDistinta = this.versionOtro !== VERSION_JUEGO;
    this.registrarRed(`Versiones: mía v${VERSION_VISIBLE} · ${this.esInvitado ? 'sala' : 'invitado'} ${this.versionOtroVisible}` + (this.versionDistinta ? ' (DISTINTAS)' : ''));
    if (typeof Menus !== 'undefined' && Menus.actualizarVersionesSala) Menus.actualizarVersionesSala();
    if (!this.versionDistinta) return;
    const texto = this.esInvitado
      ? `Versión distinta (tuya v${VERSION_VISIBLE}, sala ${this.versionOtroVisible}). Recarga la página.`
      : `Versión distinta (tuya v${VERSION_VISIBLE}, invitado ${this.versionOtroVisible}). Que recargue la página quien tenga la versión vieja.`;
    Menus.avisoRed('Versión distinta', texto, { recargar: true, seguir: true });
  },

  // ======================= COMÚN =======================
  enviar(o) {
    if (this.cortado) return; // prueba de corte de red
    if (this.conn && this.conn.open) { try { this.conn.send(o); } catch (e) { /* conexión cerrándose */ } }
  },

  recibir(d, bytes, canal) {
    if (this.cortado) return; // prueba de corte de red
    // Retraso de red simulado (solo pruebas, ver RED_CONFIG.latenciaPrueba). Mantiene el orden.
    const lp = RED_CONFIG.latenciaPrueba;
    if (lp && lp.ms > 0 && !d._retrasado) {
      const cuando = Math.max(this.ultimaEntrega || 0, performance.now() + lp.ms + (Math.random() * 2 - 1) * lp.variacion);
      this.ultimaEntrega = cuando;
      d._retrasado = true;
      setTimeout(() => this.recibir(d, bytes, canal), cuando - performance.now());
      return;
    }
    this.ultimoMensaje = performance.now();
    switch (d.t) {
      case 'ping': { // se responde enseguida, aquí mismo (no en el bucle del juego), por el mismo canal
        // "b": cuánto se atrasó nuestro hilo principal en el último segundo (eso también suma al ping)
        // También mandamos nuestros snapshots enviados (líder) o recibidos (invitado) por segundo
        const D = typeof Depuracion !== 'undefined' ? Depuracion : null;
        const r = { t: 'pong', ts: d.ts, b: D ? D.bloqueoSeg : 0, s: D ? D.snapsPorSeg : 0 };
        if (canal && canal.readyState === 'open') { try { canal.send(JSON.stringify(r)); } catch (e) {} }
        else this.enviar(r);
        break;
      }
      case 'pong':
        this.ping = Math.round(performance.now() - d.ts); this.pingCanal = canal ? 'propio' : 'fiable'; this.bloqueoOtro = d.b || 0;
        this.snapsOtro = d.s; // líder: recibidos/s del invitado · invitado: enviados/s del líder
        this.registrarPing(this.ping);
        break;
      case 'version': this.compararVersion(d.version, d.vv); break;
      // --- al invitado ---
      case 'hola': if (!this.enPartida) { Menus.ocultarAvisoRed(); Menus.enLineaConectado(); } this.compararVersion(d.version, d.vv); break;
      case 'llena':
        this.registrarRed('Invitado: el líder rechazó la entrada — motivo: sala llena (ya hay 2 personas)');
        this.cerrar(true); Menus.enLineaUnirse(this.codigo || '', 'Esa sala ya está llena (2 personas).'); break;
      case 'lobby': Juego.mundo = null; Juego.estado = 'menu'; Juego.tactil.mostrar(false); this.enPartida = false; Menus.ocultarAvisoRed(); Menus.enLineaConectado(); break;
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
      case 'cerrar': this.salaCerrada('El anfitrión cerró la sala' + (d.motivo ? ` (${d.motivo}).` : '.')); break;
      // --- al anfitrión ---
      case 'pausaEstado': // (al invitado) el juego se pausó o se reanudó
        this.pausadoPorAnfitrion = d.on;
        this.listosInvitado = d.listos || [false, false];
        if (d.on) { Juego.tactil.mostrar(false); Pausa.menuInvitado(this.listosInvitado); }
        else if (Juego.estado === 'jugando') { Menus.ocultar(); Juego.tactil.mostrar(Juego.esTactil); }
        break;
      case 'finalizar': // (al invitado) el líder terminó la partida
        this.registrarRed('Invitado: fuera de la sala — motivo: el líder finalizó el juego');
        this.cerrar(true);
        Juego.irAlMenu();
        Menus.enLineaToast('El líder finalizó el juego');
        break;
      case 'pedirPausa': // (al líder) el invitado quiere pausar
        if (this.esAnfitrion && Juego.estado === 'jugando' && Juego.mundo) Pausa.avisoSolicitud(getNombreJugador(Juego.mundo.jugadores[1]));
        break;
      case 'listo': this.marcarListo(1); break;
      case 'c': if (this.controlRemoto) this.controlRemoto.recibir(d); break;
      case 'adios': this.invitadoSeFue('el invitado salió de la sala'); break;
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
    const dp = this.canalPing;
    if (this.cortado) { /* prueba de corte de red: no sale el ping */ }
    else if (dp && dp.readyState === 'open') { try { dp.send(JSON.stringify({ t: 'ping', ts: performance.now() })); } catch (e) {} }
    else this.enviar({ t: 'ping', ts: performance.now() });
    // Tolerante: un corte corto solo muestra "Reconectando…" (ver config/red.js -> conexion)
    const cc = RED_CONFIG.conexion;
    const limite = (this.esAnfitrion ? cc.silencioLiderSegundos : cc.silencioInvitadoSegundos);
    if (performance.now() - this.ultimoMensaje > limite * 1000) {
      if (this.esAnfitrion) { const c = this.conn; this.invitadoSeFue(`${limite} s sin mensajes del invitado`); if (c) c.close(); }
      else this.reconectar(`${limite} s sin mensajes del líder`);
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
    this.registrarRed('Error de red: ' + (err && err.type ? err.type : '') + ' ' + (err && err.message ? err.message : ''));
    const msg = err.type === 'browser-incompatible' ? 'Este navegador no permite jugar en línea.'
      : 'No se pudo conectar. Revisa tu conexión a internet e inténtalo de nuevo.';
    if (this.esInvitado && this.codigo && err.type !== 'browser-incompatible') { this.fallaUnirse(this.codigo, msg + ` (motivo: ${err.type || 'desconocido'})`); return; }
    this.cerrar(true, 'error de red del líder: ' + (err.type || 'desconocido'));
    Menus.enLineaMensaje(msg, () => Menus.enLineaInicio());
  },

  // Salir de la sala (silencio = sin avisar a la interfaz)
  cerrar(silencio = false, motivo = '') {
    if (this.esAnfitrion) this.enviar({ t: 'cerrar', motivo });
    if (this.rol) this.registrarRed(`${this.esAnfitrion ? 'Líder' : 'Invitado'}: sale de la sala` + (motivo ? ' — motivo: ' + motivo : ''));
    if (this.esInvitado) this.enviar({ t: 'adios' });
    const peer = this.peer;
    this.peer = null;
    const conn = this.conn;
    this.conn = null;
    setTimeout(() => { try { if (conn) conn.close(); } catch (e) {} try { if (peer) peer.destroy(); } catch (e) {} }, 150);
    this.cerrarCanalRapido();
    clearTimeout(this.tReloj);
    this.turnoSala = (this.turnoSala || 0) + 1; // anula una sala que aún esperaba credenciales TURN
    this.rol = null; this.conectado = false; this.ping = null; this.enPartida = false;
    this.pingPromedio = null; this.jitter = 0; this.muestrasPing = []; this.snapsOtro = null; this.versionOtro = null; this.versionDistinta = false;
    this.pausadoPorAnfitrion = false; this.menuAbierto = false;
    this.reconectando = null; this.avisoSinDatos = false; this.iceCaida = false; this.versionOtroVisible = null;
    clearTimeout(this.tReintento); clearTimeout(this.tConectar); clearTimeout(this.tServidor);
    if (typeof Menus !== 'undefined' && Menus.ocultarAvisoRed) Menus.ocultarAvisoRed();
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
setInterval(() => EnLinea.vigilarDatos(), 250);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && EnLinea.activo && EnLinea.enPartida) { EnLinea.bloqueoPantalla = null; EnLinea.mantenerPantalla(); }
});
