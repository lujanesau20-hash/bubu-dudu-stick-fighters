/* =====================================================================
   PRUEBA DE PERSONAJES: bucle, teclado y suelo plano.
   Jugador 1 = Bubu (panda blanco). Jugador 2 = Dudu (oso marrón).
   ===================================================================== */
const Prueba = {
  ancho: 1280, alto: 720,
  abajo: new Set(),
  pulsadas: new Set(),
  seleccionado: 'bubu',

  async init() {
    this.lienzo = document.getElementById('lienzo-prueba');
    this.ctx = this.lienzo.getContext('2d');
    window.addEventListener('resize', () => this.ajustar());
    this.ajustar();

    const teclas = new Set(Object.values(PRUEBA_CONFIG.controles).flatMap((v) => Array.isArray(v) ? v : Object.values(v).flat()));
    window.addEventListener('keydown', (e) => {
      if (teclas.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pulsadas.add(e.code);
      this.abajo.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.abajo.delete(e.code));
    window.addEventListener('blur', () => this.abajo.clear());

    await Cuadros.cargarTodo();
    document.getElementById('cargando').remove();
    if (Cuadros.lecturaBloqueada) document.getElementById('aviso-file').classList.remove('oculto');

    const c = PRUEBA_CONFIG.controles;
    this.jugadores = [
      new PersonajePrueba('bubu', 480, c.bubu, 'J1 · Bubu'),
      new PersonajePrueba('dudu', 800, c.dudu, 'J2 · Dudu'),
    ];
    Visor.init((p) => { this.seleccionado = p; });

    let ultimo = performance.now();
    const bucle = (t) => {
      const dt = Math.min(0.05, (t - ultimo) / 1000);
      ultimo = t;
      this.actualizar(dt);
      this.dibujar();
      requestAnimationFrame(bucle);
    };
    requestAnimationFrame(bucle);
  },

  ajustar() {
    // Lienzo fijo de 1280x720 escalado a la ventana sin deformar
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const esc = Math.min(window.innerWidth / this.ancho, window.innerHeight / this.alto);
    this.lienzo.style.width = this.ancho * esc + 'px';
    this.lienzo.style.height = this.alto * esc + 'px';
    this.lienzo.width = Math.round(this.ancho * esc * dpr);
    this.lienzo.height = Math.round(this.alto * esc * dpr);
    this.escala = esc * dpr;
  },

  algunaAbajo(l) { return l.some((k) => this.abajo.has(k)); },
  algunaPulsada(l) { return l.some((k) => this.pulsadas.has(k)); },

  actualizar(dt) {
    const c = PRUEBA_CONFIG.controles;
    const sel = this.jugadores.find((j) => j.personaje === Visor.personaje);
    if (this.algunaPulsada(c.herido)) sel.herir();
    if (this.algunaPulsada(c.caido)) sel.caer();
    if (this.algunaPulsada(c.reiniciar)) this.jugadores.forEach((j) => j.reiniciar());

    for (const j of this.jugadores) {
      const m = j.controles;
      j.actualizar(dt, {
        izq: this.algunaAbajo(m.izq), der: this.algunaAbajo(m.der),
        saltar: this.algunaPulsada(m.saltar), agachar: this.algunaAbajo(m.agachar),
        cuchilla: this.algunaPulsada(m.cuchilla), dash: this.algunaPulsada(m.dash),
        golpe: this.algunaPulsada(m.golpe), espada: this.algunaPulsada(m.espada),
      }, Visor.velocidad);
    }
    this.pulsadas.clear();
    Visor.actualizar(dt);
  },

  dibujar() {
    const ctx = this.ctx;
    ctx.setTransform(this.escala, 0, 0, this.escala, 0, 0);
    // Fondo liso y suelo plano
    ctx.fillStyle = '#f4f6f8';
    ctx.fillRect(0, 0, this.ancho, this.alto);
    const sy = PRUEBA_CONFIG.fisica.sueloY;
    ctx.fillStyle = '#c8cfd8';
    ctx.fillRect(0, sy, this.ancho, this.alto - sy);
    ctx.fillStyle = '#9aa5b1';
    ctx.fillRect(0, sy, this.ancho, 2);
    for (const j of this.jugadores) j.dibujar(ctx, Visor.debug);

    // Ayuda
    ctx.fillStyle = '#495057';
    ctx.font = '14px "Trebuchet MS", Arial';
    ctx.textAlign = 'left';
    const ayuda = [
      'J1 Bubu: A/D mover · W saltar (2 veces = doble salto) · S agacharse · J cuchilla · K dash · L golpe al suelo · I espada',
      'J2 Dudu: ←/→ mover · ↑ saltar · ↓ agacharse · 1 cuchilla · 2 dash · 3 golpe al suelo · 4 espada',
      `H herido · G caído (al personaje elegido en el visor: ${Visor.personaje === 'bubu' ? 'Bubu' : 'Dudu'}) · R reiniciar`,
    ];
    ayuda.forEach((t, i) => ctx.fillText(t, 16, sy + 40 + i * 22));
  },
};

window.addEventListener('load', () => Prueba.init());
