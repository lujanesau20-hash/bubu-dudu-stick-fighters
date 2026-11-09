/* =====================================================================
   JUGADOR (Bubu o Dudu) - solo lógica
   x = centro, y = pies. Los valores de animación (anim) los usa el
   dibujo para rebotar, estirar, inclinar y girar el sprite.
   ===================================================================== */
class Jugador {
  constructor(mundo, personaje, indice, x, y) {
    const cj = CONFIG.jugador;
    this.mundo = mundo;
    this.esJugador = true;
    this.personaje = personaje;        // 'bubu' | 'dudu'
    this.indice = indice;              // 0 = jugador 1, 1 = jugador 2
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.ancho = cj.ancho; this.alto = cj.alto;
    this.dir = indice === 1 ? -1 : 1;
    this.enSuelo = false;
    this.vidaMax = cj.vidaMax;
    this.vida = this.vidaMax;
    this.energia = CONFIG.energia.max * 0.5;
    this.enfriamientos = [0, 0, 0, 0];
    this.enfriamientoCombo = 0;
    this.ultimaHabilidad = null;
    this.estado = 'normal';            // 'normal' | 'caido' | 'muerto'
    this.accion = null;                // acción especial en curso (dash, combo...)
    this.invulnerable = 0;
    this.aturdido = 0;
    this.agachado = false;
    this.saltosAire = 1;
    this.coyote = 0;
    this.bufferSalto = 0;
    this.ignorarPlataformasHasta = 0;
    this.tiempoCaido = 0;
    this.progresoRevivir = 0;
    this.reviviendo = false;           // está reviviendo a su compañero
    this.ultimoDanio = -10;
    this.estela = [];                  // posiciones para la estela del dash
    this.animDisparo = null;           // animación de una vez pedida por una habilidad (solo visual)
    this.anim = { sx: 1, sy: 1, vsx: 0, vsy: 0, inclinacion: 0, rebote: 0, fase: 0, ataque: 0, giro: 0, flash: 0, volteo: 0 };
  }

  get vivo() { return this.estado === 'normal'; }
  get puedeSerGolpeado() { return this.estado === 'normal' && this.invulnerable <= 0 && !(this.accion && this.accion.invulnerable); }

  iniciarAccion(a) {
    this.accion = Object.assign({ t: 0 }, a);
  }

  actualizar(dt, c) {
    const cj = CONFIG.jugador;
    const m = this.mundo;
    const a = this.anim;

    // Temporizadores
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.aturdido = Math.max(0, this.aturdido - dt);
    this.enfriamientoCombo = Math.max(0, this.enfriamientoCombo - dt);
    for (let i = 0; i < 4; i++) this.enfriamientos[i] = Math.max(0, this.enfriamientos[i] - dt);
    a.ataque = Math.max(0, a.ataque - dt * 4);
    a.flash = Math.max(0, a.flash - dt * 5);

    if (this.estado === 'caido' || this.estado === 'muerto') {
      this.actualizarCaido(dt);
      return;
    }

    this.energia = Math.min(CONFIG.energia.max, this.energia + CONFIG.energia.regenPorSegundo * dt);
    const estabaEnSuelo = this.enSuelo;
    const vyAntes = this.vy;

    if (this.accion) {
      // Durante una acción especial solo se permiten combinaciones
      COMBOS.procesar(this, c, m, true);
      if (this.accion) {
        this.accion.t += dt;
        if (this.accion.actualizar(this, dt, m)) this.accion = null;
      }
      this.estela.push({ x: this.x, y: this.y, t: m.tiempo });
    } else if (this.reviviendo) {
      // Quieto mientras revive al compañero
      this.vx = U.aproximar(this.vx, 0, cj.aceleracion * dt);
      this.agachado = true;
    } else {
      this.controlar(dt, c);
    }
    while (this.estela.length && m.tiempo - this.estela[0].t > 0.15) this.estela.shift();

    // Altura del cuerpo (agachado = más bajo)
    const altoObj = this.agachado ? cj.altoAgachado : cj.alto;
    this.alto = altoObj;

    m.moverCuerpo(this, dt, this.accion && this.accion.sinGravedad);

    // Aterrizaje: aplastar sprite y polvo
    if (!estabaEnSuelo && this.enSuelo) {
      this.saltosAire = 1;
      if (vyAntes > 400) {
        a.sy = 0.72; a.sx = 1.25;
        m.emitir('polvo', { x: this.x, y: this.y, cantidad: vyAntes > 900 ? 10 : 5 });
      }
    }
    if (this.enSuelo) this.coyote = cj.tiempoCoyote; else this.coyote -= dt;

    this.animar(dt);
  }

  controlar(dt, c) {
    const cj = CONFIG.jugador;
    const m = this.mundo;
    this.agachado = c.abajo && this.enSuelo;

    // Movimiento horizontal
    const velObj = this.aturdido > 0 ? 0 : c.x * (this.agachado ? cj.velocidadAgachado : cj.velocidad);
    const acel = this.enSuelo ? cj.aceleracion : cj.aceleracionAire;
    this.vx = U.aproximar(this.vx, velObj, acel * dt);
    if (c.x !== 0 && this.aturdido <= 0) this.dir = c.x > 0 ? 1 : -1;

    // Salto, doble salto y bajar de plataformas
    if (c.saltoPulsado) this.bufferSalto = cj.bufferSalto;
    else this.bufferSalto -= dt;
    if (this.bufferSalto > 0 && this.aturdido <= 0) {
      if (c.abajo && this.enSuelo && this.plataforma) {
        this.ignorarPlataformasHasta = m.tiempo + 0.3;
        this.enSuelo = false;
        this.bufferSalto = 0;
      } else if (this.enSuelo || this.coyote > 0) {
        this.vy = -cj.salto;
        this.enSuelo = false; this.coyote = 0; this.bufferSalto = 0;
        this.anim.sy = 1.3; this.anim.sx = 0.8;
        m.emitir('polvo', { x: this.x, y: this.y, cantidad: 4 });
      } else if (this.saltosAire > 0 && c.saltoPulsado) {
        this.vy = -cj.dobleSalto;
        this.saltosAire--; this.bufferSalto = 0;
        this.anim.volteo = 1; // voltereta
        this.animDisparo = { nombre: 'doble_salto', t: m.tiempo };
        m.emitir('dobleSalto', { x: this.x, y: this.y });
      }
    }
    // Salto más corto si se suelta pronto
    if (!c.saltoMantenido && this.vy < -380) this.vy += 2600 * dt;

    if (this.aturdido <= 0) COMBOS.procesar(this, c, m);
  }

  actualizarCaido(dt) {
    const m = this.mundo;
    this.vx = U.aproximar(this.vx, 0, 1500 * dt);
    m.moverCuerpo(this, dt);
    this.alto = 34;
    if (this.estado === 'caido') {
      this.tiempoCaido -= dt;
      if (this.tiempoCaido <= 0) {
        this.estado = 'muerto';
        this.progresoRevivir = 0;
        m.emitir('texto', { x: this.x, y: this.y - 90, texto: 'K.O.', color: '#ff5050', grande: true });
      }
    }
    this.animar(dt);
  }

  animar(dt) {
    const a = this.anim;
    // Resorte que devuelve la escala a 1 (efecto gelatina)
    const k = 260, amort = Math.exp(-14 * dt);
    const objSy = this.agachado ? 0.72 : 1;
    const objSx = this.agachado ? 1.18 : 1;
    a.vsy = (a.vsy + (objSy - a.sy) * k * dt) * amort;
    a.vsx = (a.vsx + (objSx - a.sx) * k * dt) * amort;
    a.sy += a.vsy * dt;
    a.sx += a.vsx * dt;

    // Inclinación hacia donde se mueve
    const v = CONFIG.jugador.velocidad;
    const inclObj = U.clamp(this.vx / v, -1.6, 1.6) * 0.16 + (this.enSuelo ? 0 : U.clamp(this.vy / 1500, -0.3, 0.3) * this.dir * -0.4);
    a.inclinacion = U.lerp(a.inclinacion, inclObj, Math.min(1, dt * 12));

    // Rebote al caminar
    if (this.enSuelo && Math.abs(this.vx) > 40) {
      a.fase += dt * Math.abs(this.vx) * 0.045;
      a.rebote = Math.abs(Math.sin(a.fase)) * 9;
    } else {
      a.rebote = U.lerp(a.rebote, 0, Math.min(1, dt * 15));
      if (this.enSuelo) a.fase += dt * 3; // respiración
    }
    if (a.volteo > 0) a.volteo = Math.max(0, a.volteo - dt * 2.6);
  }

  // Devuelve true si el golpe hizo daño
  recibirDanio(cantidad, info) {
    if (!this.puedeSerGolpeado) return false;
    const m = this.mundo;
    this.vida = Math.max(0, this.vida - cantidad);
    this.ultimoDanio = m.tiempo;
    this.anim.flash = 1;
    this.anim.sx = 1.25; this.anim.sy = 0.8;
    this.invulnerable = m.modo === 'versus' ? CONFIG.versus.invulnerableTrasGolpe : CONFIG.jugador.invulnerableTrasGolpe;
    this.aturdido = CONFIG.jugador.aturdidoTrasGolpe;
    this.vx = (info.dirX || 1) * (info.empujeX || 0) * 0.9;
    this.vy = -(info.empujeY || 0) * 0.8;
    this.enSuelo = false;
    if (this.accion && !this.accion.invulnerable) this.accion = null;
    if (this.vida <= 0) this.caer();
    return true;
  }

  caer() {
    const m = this.mundo;
    this.accion = null;
    this.reviviendo = false;
    this.agachado = false;
    if (m.modo === 'pareja') {
      this.estado = 'caido';
      this.tiempoCaido = CONFIG.revivir.tiempoCaido;
      this.progresoRevivir = 0;
      m.emitir('caido', { jugador: this.indice, x: this.x, y: this.y });
    } else {
      this.estado = 'muerto';
      m.emitir('caido', { jugador: this.indice, x: this.x, y: this.y });
    }
  }

  revivir() {
    this.estado = 'normal';
    this.vida = Math.round(this.vidaMax * CONFIG.revivir.vidaAlRevivir);
    this.invulnerable = 2;
    this.alto = CONFIG.jugador.alto;
    this.vy = -500;
    this.anim.sy = 1.4; this.anim.sx = 0.75;
    this.progresoRevivir = 0;
  }
}
