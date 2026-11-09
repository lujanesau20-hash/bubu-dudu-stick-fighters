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

    window.addEventListener('resize', () => this.ajustarTamano());
    this.ajustarTamano();

    // Mundo de fondo para el menú (solo para ver el escenario)
    this.mundoMenu = new Mundo({ modo: 'solo', personajes: ['bubu'], escenario: 'isla' });

    // Pantalla de carga con consejos mientras se cargan los sprites
    Menus.carga();
    requestAnimationFrame((t) => this.bucle(t));
    SPRITES.cargar(() => this.irAlMenu());
  },

  ajustarTamano() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.lienzo.width = Math.round(window.innerWidth * dpr);
    this.lienzo.height = Math.round(window.innerHeight * dpr);
  },

  irAlMenu() {
    this.estado = 'menu';
    this.mundo = null;
    this.tactil.mostrar(false);
    Menus.principal();
  },

  iniciarPartida(modo, personajes) {
    this.modo = modo;
    this.personajes = personajes;
    const c = CONFIG.controles;
    this.entrada.configurar(modo === 'solo' ? [c.solo] : [c.j1, c.j2]);
    this.mundo = new Mundo({ modo, personajes, escenario: 'isla', semilla: Math.floor(Math.random() * 1e9) });
    this.efectos.reiniciar();
    this.hud.reiniciar();
    this.camara.saltarA(this.mundo, this.render.anchoBase);
    this.acumulador = 0;
    this.finMostrado = false;
    // Pantalla de carga corta con un consejo antes de empezar el nivel
    this.estado = 'carga';
    this.tactil.mostrar(false);
    const esc = this.modo === 'versus' ? ARENAS_VERSUS.isla : ESCENARIOS.isla;
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

  reiniciar() { this.iniciarPartida(this.modo, this.personajes); },

  pausar() {
    if (this.estado !== 'jugando') return;
    this.estado = 'pausa';
    this.tactil.mostrar(false);
    Menus.pausa();
  },

  reanudar() {
    this.estado = 'jugando';
    this.ultimo = performance.now();
    this.entrada.teclasPulsadas.clear();
    Menus.ocultar();
    this.tactil.mostrar(this.esTactil);
  },

  bucle(t) {
    const dt = Math.min(0.05, (t - (this.ultimo || t)) / 1000);
    this.ultimo = t;
    this.tiempo += dt;

    if (this.estado === 'jugando') this.actualizarJuego(dt);
    else if (this.estado === 'pausa') {
      if (this.entrada.consumir(CONFIG.controles.generales.pausa)) this.reanudar();
    }

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
    if (tipo !== 'versus') { Guardado.sumarMonedas(m.monedasGanadas); m.monedasGuardadas = true; }
    if (tipo === 'derrota') Menus.gameOver(m.monedasGanadas);
    if (tipo === 'victoria') {
      if (!Guardado.datos.nivelesSuperados.includes(m.escenarioId)) {
        Guardado.datos.nivelesSuperados.push(m.escenarioId);
        Guardado.guardar();
      }
      const siguiente = ORDEN_NIVELES[ORDEN_NIVELES.indexOf(m.escenarioId) + 1];
      Menus.victoria(m.monedasGanadas, siguiente && !ESCENARIOS[siguiente].pendiente);
    }
    if (tipo === 'versus') Menus.finVersus(CONFIG.personajes[m.jugadores[m.ganador].personaje].nombre);
  },

  dibujar(dt) {
    const ctx = this.render.ctx;
    const W = this.render.W, H = this.render.H;
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (!this.mundo) {
      // Menú: escenario de fondo moviéndose despacio
      const cam = { x: 600 + this.tiempo * 40, y: 300, zoom: 1, offX: 0, offY: 0 };
      this.render.dibujarFondo('isla', cam, this.tiempo);
      ctx.fillStyle = 'rgba(20,10,40,0.25)';
      ctx.fillRect(0, 0, W, H);
      return;
    }

    const m = this.mundo;
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
  },
};

window.addEventListener('load', () => Juego.init());
