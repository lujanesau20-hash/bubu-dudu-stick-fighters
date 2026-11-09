/* =====================================================================
   MAIN: arranque, bucle del juego y cambios de pantalla.
   La lógica corre a paso fijo (60 por segundo) para que sea estable y
   se pueda sincronizar por red; el dibujo va a la velocidad de la pantalla.
   ===================================================================== */
const PASO = 1 / 60;

const Juego = {
  estado: 'cargando',   // cargando | menu | jugando | pausa | fin
  modo: null,
  personajes: null,
  mundo: null,
  acumulador: 0,
  ultimo: 0,
  tiempo: 0,

  init() {
    this.lienzo = document.getElementById('lienzo');
    this.render = new Render(this.lienzo);
    this.camara = new Camara();
    this.efectos = new Efectos(this.camara);
    this.hud = new HUD();
    this.entrada = new Entrada();
    this.tactil = new ControlesTactiles(document.getElementById('tactil'));
    this.entrada.tactil = this.tactil;
    this.esTactil = esDispositivoTactil();
    window.addEventListener('touchstart', () => { this.esTactil = true; }, { once: true, passive: true });
    Guardado.cargar();
    Menus.init(this);
    Pausa.init(this);

    window.addEventListener('resize', () => this.ajustarTamano());
    this.ajustarTamano();

    // Mundo de fondo para el menú (solo para ver el escenario)
    this.mundoMenu = new Mundo({ modo: 'solo', personajes: ['bubu'], escenario: 'isla' });

    // Pantalla de carga con consejos mientras se cargan los sprites
    Menus.carga();
    requestAnimationFrame((t) => this.bucle(t));
    SPRITES.cargar(() => {
      this.irAlMenu();
      // Enlace compartido ?sala=1234: ir directo a unirse a esa sala
      const sala = new URLSearchParams(location.search).get('sala');
      if (sala && /^\d+$/.test(sala) && typeof EnLinea !== 'undefined') {
        history.replaceState(null, '', location.pathname);
        if (EnLinea.disponible()) EnLinea.unirse(sala); else Menus.enLineaInicio();
      }
    });
  },

  ajustarTamano() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.lienzo.width = Math.round(window.innerWidth * dpr);
    this.lienzo.height = Math.round(window.innerHeight * dpr);
  },

  irAlMenu() {
    // En línea, el anfitrión vuelve a la sala (no al menú principal)
    if (typeof EnLinea !== 'undefined' && EnLinea.esAnfitrion) {
      this.estado = 'menu'; this.mundo = null; this.tactil.mostrar(false);
      if (EnLinea.conectado) EnLinea.volverAlLobby(); else Menus.enLineaEsperando(EnLinea.codigo);
      return;
    }
    this.estado = 'menu';
    this.mundo = null;
    this.tactil.mostrar(false);
    Menus.principal();
  },

  iniciarPartida(modo, personajes, escenario = this.escenario || ORDEN_NIVELES[0]) {
    this.modo = modo;
    this.personajes = personajes;
    // Nivel elegido (versus siempre usa la arena de la isla)
    this.escenario = ESCENARIOS[escenario] && !ESCENARIOS[escenario].pendiente ? escenario : ORDEN_NIVELES[0];
    const c = CONFIG.controles;
    this.entrada.configurar(modo === 'solo' ? [c.solo] : [c.j1, c.j2]);
    this.mundo = new Mundo({ modo, personajes, escenario: modo === 'versus' ? 'isla' : this.escenario, semilla: Math.floor(Math.random() * 1e9) });
    this.efectos.reiniciar();
    this.hud.reiniciar();
    this.camara.saltarA(this.mundo, this.render.anchoBase);
    if (typeof EnLinea !== 'undefined' && EnLinea.esAnfitrion) EnLinea.alIniciarPartida(this); // controles del invitado por la red
    this.acumulador = 0;
    this.finMostrado = false;
    // Pantalla de carga corta con un consejo antes de empezar el nivel
    this.estado = 'carga';
    this.tactil.mostrar(false);
    const esc = this.modo === 'versus' ? ARENAS_VERSUS.isla : ESCENARIOS[this.escenario];
    Menus.carga(this.modo === 'versus' ? esc.nombre : `Nivel ${this.mundo.nivel} · ${esc.nombre}`);
    clearTimeout(this.tCarga);
    this.tCarga = setTimeout(() => {
      if (this.estado !== 'carga') return;
      this.estado = 'jugando';
      this.ultimo = performance.now();
      this.entrada.teclasPulsadas.clear();
      Menus.ocultar();
      this.tactil.mostrar(this.esTactil);
    }, 1600);
  },

  reiniciar() { this.iniciarPartida(this.modo, this.personajes, this.escenario); },

  // Pasar al siguiente nivel de la campaña
  siguienteNivel() {
    const sig = ORDEN_NIVELES[ORDEN_NIVELES.indexOf(this.escenario) + 1];
    if (sig) this.iniciarPartida(this.modo, this.personajes, sig);
  },

  pausar() {
    if (this.estado !== 'jugando') return;
    this.estado = 'pausa';
    this.tactil.mostrar(false);
    // En línea, el líder pausa a los dos y espera los checks de "Reanudar"
    if (typeof EnLinea !== 'undefined' && EnLinea.esAnfitrion) { EnLinea.iniciarPausa(); Pausa.menuLider(); }
    else Pausa.menuLocal();
  },

  reanudar() {
    this.estado = 'jugando';
    this.ultimo = performance.now();
    this.entrada.teclasPulsadas.clear();
    Menus.ocultar();
    this.tactil.mostrar(this.esTactil);
    if (typeof EnLinea !== 'undefined' && EnLinea.esAnfitrion) EnLinea.avisarPausa(false);
  },

  bucle(t) {
    const dt = Math.min(0.05, (t - (this.ultimo || t)) / 1000);
    this.ultimo = t;
    this.tiempo += dt;

    if (this.estado === 'jugando') {
      if (typeof EnLinea !== 'undefined' && EnLinea.esInvitado) EnLinea.actualizarInvitado(this, dt); // el invitado no simula
      else this.actualizarJuego(dt);
    }
    else if (this.estado === 'pausa') {
      if (this.entrada.consumir(CONFIG.controles.generales.pausa)) {
        if (typeof EnLinea !== 'undefined' && EnLinea.esAnfitrion) EnLinea.marcarListo(0); // en línea: Esc = mi check de "Reanudar"
        else this.reanudar();
      }
    }
    // Botón "Pausa" visible solo mientras se juega
    Pausa.actualizarBoton(this.estado === 'jugando' && !!this.mundo && !(typeof EnLinea !== 'undefined' && EnLinea.esInvitado && EnLinea.pausadoPorAnfitrion));

    this.dibujar(dt);
    requestAnimationFrame((tt) => this.bucle(tt));
  },

  actualizarJuego(dt) {
    const m = this.mundo;
    if (this.entrada.consumir(CONFIG.controles.generales.pausa) || this.tactil.pausaPulsada) {
      this.tactil.pausaPulsada = false;
      this.pausar();
      return;
    }

    this.acumulador += dt * m.escalaTiempo;
    let pasos = 0;
    while (this.acumulador >= PASO && pasos < 5) {
      const controles = this.entrada.leer(m.jugadores.length);
      m.actualizar(PASO, controles);
      this.acumulador -= PASO;
      pasos++;
    }
    if (typeof EnLinea !== 'undefined' && EnLinea.esAnfitrion) EnLinea.trasPasos(m, dt); // enviar estado al invitado
    this.efectos.procesar(m.eventos, m);
    m.eventos.length = 0;

    // Botón de revivir en el táctil
    const j1 = m.jugadores[0];
    const caido = m.jugadores.find((j) => j.estado === 'caido');
    const mostrarRevivir = !!(caido && caido !== j1 && j1.vivo && Math.abs(j1.x - caido.x) <= CONFIG.revivir.distancia);
    this.tactil.actualizarVisual(j1, mostrarRevivir);

    // Fin de partida
    if (!this.finMostrado) {
      if (m.estado === 'derrota' && m.tiempoFin > 2) this.terminar('derrota');
      if (m.estado === 'victoria' && m.tiempoFin > 2.5) this.terminar('victoria');
      if (m.estado === 'finVersus' && m.tiempoFin > 0.5) this.terminar('versus');
    }
  },

  terminar(tipo) {
    this.finMostrado = true;
    this.estado = 'fin';
    this.tactil.mostrar(false);
    const m = this.mundo;
    if (typeof EnLinea !== 'undefined' && EnLinea.esAnfitrion) EnLinea.avisarFin(tipo, m.monedasGanadas);
    if (tipo !== 'versus') { Guardado.sumarMonedas(m.monedasGanadas); m.monedasGuardadas = true; }
    if (tipo === 'derrota') Menus.gameOver(m.monedasGanadas);
    if (tipo === 'victoria') {
      if (!Guardado.datos.nivelesSuperados.includes(m.escenarioId)) {
        Guardado.datos.nivelesSuperados.push(m.escenarioId);
        Guardado.guardar();
      }
      const siguiente = ORDEN_NIVELES[ORDEN_NIVELES.indexOf(m.escenarioId) + 1];
      Menus.victoria(m.monedasGanadas, siguiente && !ESCENARIOS[siguiente].pendiente ? siguiente : null);
    }
    if (tipo === 'versus') Menus.finVersus(CONFIG.personajes[m.jugadores[m.ganador].personaje].nombre);
  },

  dibujar(dt) {
    const ctx = this.render.ctx;
    const W = this.render.W, H = this.render.H;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (typeof Depuracion !== 'undefined') Depuracion.cuadro();
    this.aplicarSombras();

    if (!this.mundo) {
      // Menú: escenario de fondo moviéndose despacio
      const cam = { x: 600 + this.tiempo * 40, y: 300, zoom: 1, offX: 0, offY: 0 };
      this.render.dibujarFondo('isla', cam, this.tiempo);
      ctx.fillStyle = 'rgba(20,10,40,0.25)';
      ctx.fillRect(0, 0, W, H);
      if (typeof Depuracion !== 'undefined') Depuracion.dibujar(ctx, W, H);
      return;
    }

    const m = this.mundo;
    // Invitado: interpolar el estado recibido antes de dibujar
    if (typeof EnLinea !== 'undefined' && EnLinea.esInvitado && Sincro.espejo === m) Sincro.prepararDibujo(performance.now(), this.efectos);
    if (this.estado !== 'pausa') {
      this.efectos.actualizar(dt);
      this.camara.actualizar(dt, m, this.render.anchoBase);
      this.hud.actualizar(dt, m);
    }
    const equipos = {};
    for (const id of Object.keys(CONFIG.personajes)) equipos[id] = Guardado.equipo(id);
    this.render.dibujarMundo(m, this.camara, this.efectos, this.tiempo, equipos);
    this.efectos.dibujarPantalla(ctx, W, H);
    this.hud.dibujar(ctx, m, W, H, this.efectos, this.tactil.activo);
    if (typeof EnLinea !== 'undefined' && EnLinea.activo) this.dibujarPing(ctx, W, H);
    if (typeof Depuracion !== 'undefined') Depuracion.dibujar(ctx, W, H); // panel oculto (F3)
  },

  // En celular se quita el brillo borroso (shadowBlur), lo más caro de dibujar.
  // Solo cambia el brillo de algunos efectos; config/interfaz.js -> efectos.*.sinSombras
  aplicarSombras() {
    const cfg = CONFIG.interfaz.efectos;
    const sin = !!(this.esTactil ? cfg.celular.sinSombras : cfg.laptop.sinSombras);
    if (sin === this._sinSombras) return;
    this._sinSombras = sin;
    const ctx = this.render.ctx;
    if (sin) Object.defineProperty(ctx, 'shadowBlur', { configurable: true, get: () => 0, set: () => {} });
    else delete ctx.shadowBlur;
  },

  // Indicador pequeño de calidad de conexión (ping)
  dibujarPing(ctx, W, H) {
    const p = EnLinea.ping, s = U.clamp(H / 720, 0.6, 1.3);
    const color = !EnLinea.conectado ? '#ff6b6b' : p == null ? '#cccccc' : p < 100 ? '#69db7c' : p < 200 ? '#ffd43b' : '#ff6b6b';
    const texto = !EnLinea.conectado ? 'sin conexión' : p == null ? '… ms' : p + ' ms';
    ctx.font = `bold ${12 * s}px "Trebuchet MS", Arial`;
    ctx.textAlign = 'left';
    const x = 8 * s, y = H - 8 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(x - 4, y - 14 * s, ctx.measureText('📶 ' + texto).width + 10, 18 * s);
    ctx.fillStyle = color;
    ctx.fillText('📶 ' + texto, x, y);
  },
};

window.addEventListener('load', () => Juego.init());
