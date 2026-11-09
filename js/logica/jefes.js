/* =====================================================================
   JEFES FINALES (lógica). Cada escenario tiene el suyo.
   Implementado: Gigante. Preparados: Arquero Maestro, Mago Cósmico,
   Ninja Sombra (añadir su IA en IA_JEFES y quitar "pendiente" en CONFIG).
   ===================================================================== */
class Jefe extends Enemigo {
  constructor(mundo, tipo, x, y, multVida = 1) {
    const cfg = Object.assign({ ancho: 90, alto: 220, velocidad: 80, monedas: 60 }, CONFIG.jefes[tipo]);
    super(mundo, tipo, x, y, cfg);
    this.esJefe = true;
    this.nombre = cfg.nombre;
    this.vidaMax = Math.round(cfg.vida * multVida);
    this.vida = this.vidaMax;
    this.superArmadura = true;
    this.fase2 = false;
    this.tPisoton = 5;
    this.tEmbestida = 4;
    this.estado = 'entrando';
  }

  actualizar(dt) {
    const m = this.mundo;
    this.anim.flash = Math.max(0, this.anim.flash - dt * 6);
    this.enfriamientoAtaque -= dt;
    if (this.estado === 'muerto') {
      this.tiempoMuerto += dt;
      this.vx = U.aproximar(this.vx, 0, 300 * dt);
      m.moverCuerpo(this, dt);
      return; // el jefe no se borra: queda tumbado
    }
    if (this.estado === 'entrando') {
      m.moverCuerpo(this, dt);
      if (this.enSuelo) {
        this.estado = 'rugido';
        this.t = 1.1;
        m.emitir('sacudir', { fuerza: 22 });
        m.emitir('polvo', { x: this.x, y: this.y, cantidad: 24 });
        m.emitir('banner', { texto: this.nombre, sub: '¡JEFE FINAL!', color: '#ffcc33' });
      }
      return;
    }
    this.aplicarEmpuje(dt);
    if (!this.fase2 && this.vida < this.vidaMax * 0.5) {
      this.fase2 = true;
      m.emitir('banner', { texto: '¡FURIA!', sub: this.nombre, color: '#ff4d4d' });
      m.emitir('sacudir', { fuerza: 14 });
    }
    // Acciones programadas (lluvia de flechas, meteoritos...)
    if (this.pendientes) {
      for (const p of this.pendientes) { p.t -= dt; if (p.t <= 0) p.hacer(); }
      this.pendientes = this.pendientes.filter((p) => p.t > 0);
    }
    (IA_JEFES[this.tipo] || IA_JEFES.gigante)(this, dt, m);
    m.moverCuerpo(this, dt);
    if (Math.abs(this.vx) > 10) this.anim.fase += dt * Math.abs(this.vx) * 0.03;
  }

  recibirDanio(cantidad, info) {
    if (!this.vivo || this.estado === 'entrando' || this.estado === 'oculto') return false;
    this.vida -= cantidad;
    this.anim.flash = 1;
    // Mismo empujón corto que los demás enemigos (solo H3, H4 y combos); nunca queda "tieso"
    if (info.empujon && this.estado !== 'embestida' && this.estado !== 'corte') this.empujar(info.dirX || 1);
    if (this.vida <= 0) {
      this.estado = 'muerto';
      this.vida = 0;
      this.vx = (info.dirX || 1) * 200;
      this.vy = -400;
      this.mundo.soltarMonedas(this.x, this.y - this.alto / 2, this.cfg.monedas);
      this.mundo.emitir('muerteJefe', { x: this.x, y: this.y - this.alto / 2, color: this.color });
      this.mundo.emitir('sacudir', { fuerza: 30 });
    }
    return true;
  }
}

const IA_JEFES = {
  // EL GIGANTE: lento y con mucha vida.
  // Ataques: puñetazo enorme, pisotón con ondas por el suelo (hay que saltarlas)
  // y, en furia (menos de 50% de vida), embestida de lado a lado.
  gigante(e, dt, m) {
    const c = e.cfg;
    const rapidez = e.fase2 ? 1.4 : 1;
    const obj = m.jugadorMasCercano(e.x, e.y);
    e.tPisoton -= dt;
    e.tEmbestida -= dt;
    if (!obj && e.estado === 'caminar') { e.vx = U.aproximar(e.vx, 0, 400 * dt); return; }
    const dx = obj ? obj.x - e.x : 0;

    switch (e.estado) {
      case 'rugido':
      case 'descanso':
        e.vx = U.aproximar(e.vx, 0, 900 * dt);
        e.t -= dt;
        if (e.t <= 0) e.estado = 'caminar';
        break;

      case 'caminar':
        e.dir = dx > 0 ? 1 : -1;
        e.vx = U.aproximar(e.vx, Math.abs(dx) > 120 ? e.dir * c.velocidad * rapidez : 0, 500 * dt);
        if (Math.abs(dx) < 190 && e.enfriamientoAtaque <= 0) {
          e.estado = 'prepPunio'; e.t = 0.65 / rapidez;
        } else if (e.tPisoton <= 0) {
          e.estado = 'prepPisoton'; e.t = 0.95 / rapidez;
        } else if (e.fase2 && e.tEmbestida <= 0 && Math.abs(dx) > 280) {
          e.estado = 'prepEmbestida'; e.t = 0.8;
        }
        break;

      case 'prepPunio':
        e.vx = U.aproximar(e.vx, 0, 900 * dt);
        e.t -= dt;
        if (e.t <= 0) {
          e.estado = 'punio'; e.t = 0.35;
          e.vx = e.dir * 260;
          m.agregarGolpe(new Golpe({
            duenio: e, seguir: e, offX: 120, offY: -e.alto * 0.62, w: 190, h: 110,
            danio: c.danioPunio, empujeX: 560, empujeY: 380, duracion: 0.14, color: e.color,
          }));
          m.emitir('sacudir', { fuerza: 7 });
        }
        break;

      case 'punio':
        e.vx = U.aproximar(e.vx, 0, 800 * dt);
        e.t -= dt;
        if (e.t <= 0) { e.estado = 'descanso'; e.t = 0.55 / rapidez; e.enfriamientoAtaque = 1.2 / rapidez; }
        break;

      case 'prepPisoton':
        e.vx = U.aproximar(e.vx, 0, 900 * dt);
        e.t -= dt;
        if (e.t <= 0) {
          e.estado = 'pisoton'; e.t = 0.4;
          e.tPisoton = (e.fase2 ? 4.2 : 6.5) + m.rng() * 2;
          m.agregarGolpe(new Golpe({
            duenio: e, forma: 'circulo', x: e.x, y: e.y - 30, r: 150, radial: true,
            danio: c.danioPisoton, empujeX: 420, empujeY: 420, duracion: 0.1, color: e.color,
          }));
          // Ondas que recorren el suelo hacia ambos lados (saltarlas)
          const ondas = e.fase2 ? [-1, 1, -1, 1] : [-1, 1];
          ondas.forEach((d, k) => {
            m.agregarProyectil(new Proyectil({
              duenio: e, tipo: 'ondaSuelo', x: e.x + d * 60, y: m.sueloY - 22,
              vx: d * (k < 2 ? 520 : 340), radio: 24, danio: c.danioPisoton, vida: 3.2,
              perfora: true, chocaSuelo: false, empujeX: 300, empujeY: 450, color: '#b48cff',
            }));
          });
          m.emitir('onda', { x: e.x, y: e.y, radio: 220, color: '#b48cff' });
          m.emitir('sacudir', { fuerza: 18 });
        }
        break;

      case 'pisoton':
        e.t -= dt;
        if (e.t <= 0) { e.estado = 'descanso'; e.t = 0.7 / rapidez; }
        break;

      case 'prepEmbestida':
        e.dir = dx > 0 ? 1 : -1;
        e.vx = U.aproximar(e.vx, -e.dir * 60, 900 * dt);
        e.t -= dt;
        if (e.t <= 0) {
          e.estado = 'embestida'; e.t = 1.3;
          e.tEmbestida = 5 + m.rng() * 2;
          e.golpeEmbestida = new Golpe({
            duenio: e, seguir: e, offX: 40, offY: -e.alto * 0.5, w: 120, h: e.alto * 0.9,
            danio: c.danioEmbestida, empujeX: 650, empujeY: 450, duracion: 1.3, color: e.color,
          });
          m.agregarGolpe(e.golpeEmbestida);
        }
        break;

      case 'embestida':
        e.vx = e.dir * 680;
        e.t -= dt;
        if (Math.random() < 0.5) m.emitir('polvo', { x: e.x - e.dir * 30, y: e.y, cantidad: 1 });
        // Choca con la pared de la arena
        if (e.t <= 0 || e.x <= m.limiteIzq + e.ancho / 2 + 2 || e.x >= m.limiteDer - e.ancho / 2 - 2) {
          if (e.golpeEmbestida) e.golpeEmbestida.vivo = false;
          e.estado = 'descanso'; e.t = 1.3;
          m.emitir('sacudir', { fuerza: 16 });
        }
        break;

      default:
        e.estado = 'caminar';
    }
  },
};
