/* =====================================================================
   PERSONAJE DE PRUEBA: reproductor de animaciones + máquina de estados
   Estados: normal (reposo/caminar/agacharse/aire) | accion | herido | caido
   - Un ataque no interrumpe a otro.
   - El doble salto funciona en el aire.
   - Herido sí interrumpe un ataque. Caído se queda en el último cuadro.
   ===================================================================== */

// Reproduce una animación de un personaje
class Animador {
  constructor(personaje) {
    this.personaje = personaje;
    this.nombre = null;
    this.t = 0;
  }

  poner(nombre, reiniciar = false) {
    if (this.nombre === nombre && !reiniciar) return;
    this.nombre = nombre;
    this.t = 0;
  }

  actualizar(dt) { this.t += dt; }

  get datos() { return Cuadros.datos[this.personaje][this.nombre]; }
  get def() { return PRUEBA_CONFIG.animaciones[this.nombre]; }

  // Número de cuadros reales (0 si falta la hoja)
  get total() { const d = this.datos; return d && d.cuadros ? d.cuadros.length : 0; }

  get indice() {
    const n = this.total;
    if (!n) return 0;
    const k = Math.floor(this.t * this.def.fps);
    return this.def.modo === 'bucle' ? k % n : Math.min(k, n - 1);
  }

  // Terminó (para unaVez/mantener): se mostró el último cuadro su tiempo completo
  get terminado() {
    const n = Math.max(1, this.total);
    const dur = Math.max(n / this.def.fps, this.def.duracionMinima || 0);
    return this.def.modo !== 'bucle' && this.t >= dur;
  }
}

class PersonajePrueba {
  constructor(personaje, x, controles, etiqueta) {
    this.personaje = personaje;
    this.etiqueta = etiqueta;
    this.controles = controles;
    this.xInicial = x;
    this.anim = new Animador(personaje);
    this.reiniciar();
  }

  reiniciar() {
    const f = PRUEBA_CONFIG.fisica;
    this.x = this.xInicial;
    this.y = f.sueloY;
    this.vx = 0; this.vy = 0;
    this.dir = this.personaje === 'dudu' ? -1 : 1;
    this.enSuelo = true;
    this.estado = 'normal';
    this.accion = null;
    this.agachado = false;
    this.saltosAire = 1;
    this.dobleSalto = false;
    this.estira = { sx: 1, sy: 1, vx: 0, vy: 0 }; // solo para el salto hecho por código
    this.inclinacion = 0;
    this.tiempo = 0;
    this.anim.poner('reposo', true);
  }

  // ¿Este personaje tiene hoja para la animación?
  tiene(anim) { const d = Cuadros.datos[this.personaje][anim]; return d && d.cuadros.length > 0; }
  get saltoPorCodigo() { return !this.tiene('saltar'); }

  // e = { izq, der, saltar (pulsado), agachar, cuchilla, dash, golpe, espada (pulsados) }
  actualizar(dt, e, velAnim) {
    const f = PRUEBA_CONFIG.fisica;
    this.tiempo += dt;
    const estabaEnSuelo = this.enSuelo;

    if (this.estado === 'caido') {
      this.vx *= 0.85;
    } else if (this.estado === 'herido') {
      this.vx *= 0.9;
      if (this.anim.terminado) this.estado = 'normal';
    } else if (this.estado === 'accion') {
      if (this.accion === 'dash') { this.vx = this.dir * f.velocidadDash; this.vy = 0; }
      else this.vx *= 0.8;
      // Mientras dura el ataque no se aceptan otros ataques ni saltos
      if (this.anim.terminado) {
        if (this.accion === 'dash') this.vx = this.dir * 120;
        this.estado = 'normal'; this.accion = null;
      }
    }

    if (this.estado === 'normal') this.controlar(e);

    // Física: gravedad y suelo plano
    if (!(this.estado === 'accion' && this.accion === 'dash')) this.vy += f.gravedad * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = Math.max(60, Math.min(1220, this.x));
    if (this.y >= f.sueloY) {
      this.y = f.sueloY; this.vy = 0; this.enSuelo = true;
    } else this.enSuelo = false;

    if (!estabaEnSuelo && this.enSuelo) {
      this.saltosAire = 1;
      this.dobleSalto = false;
      if (this.saltoPorCodigo) { this.estira.sy = 0.8; this.estira.sx = 1.18; } // aplastamiento al aterrizar
    }

    this.elegirAnimacion();
    this.anim.actualizar(dt * velAnim);
    this.animarVida(dt);
  }

  controlar(e) {
    const f = PRUEBA_CONFIG.fisica;
    const mover = (e.der ? 1 : 0) - (e.izq ? 1 : 0);
    this.agachado = e.agachar && this.enSuelo;
    this.vx = this.agachado ? 0 : mover * f.velocidad;
    if (mover) this.dir = mover;

    // Ataques (no se interrumpen entre sí)
    const ataque = e.cuchilla ? 'lanzar_cuchilla' : e.dash ? 'dash' : e.golpe ? 'golpe_suelo' : e.espada ? 'espada' : null;
    if (ataque) {
      this.estado = 'accion';
      this.accion = ataque;
      this.agachado = false;
      this.anim.poner(ataque, true);
      if (ataque === 'golpe_suelo' && !this.enSuelo) this.vy = 1200; // cae rápido al suelo
      return;
    }

    if (e.saltar && !this.agachado) {
      if (this.enSuelo) {
        this.vy = -f.salto; this.enSuelo = false;
        if (this.saltoPorCodigo) { this.estira.sy = 1.2; this.estira.sx = 0.85; } // estiramiento al despegar
        this.anim.poner('saltar', true);
      } else if (this.saltosAire > 0) {
        this.vy = -f.dobleSalto;
        this.saltosAire--;
        this.dobleSalto = true;
        this.anim.poner('doble_salto', true);
      }
    }
  }

  elegirAnimacion() {
    if (this.estado === 'caido') return this.anim.poner('caido');
    if (this.estado === 'herido') return this.anim.poner('herido');
    if (this.estado === 'accion') return this.anim.poner(this.accion);
    if (!this.enSuelo) {
      if (this.dobleSalto && !(this.anim.nombre === 'doble_salto' && this.anim.terminado)) return this.anim.poner('doble_salto');
      this.dobleSalto = false;
      return this.anim.poner('saltar');
    }
    if (this.agachado) return this.anim.poner('agacharse');
    if (Math.abs(this.vx) > 20) return this.anim.poner('caminar');
    this.anim.poner('reposo');
  }

  // Vida por código: inclinación al caminar/saltar y resorte del estiramiento
  animarVida(dt) {
    let obj = 0;
    if (this.estado === 'normal') {
      if (!this.enSuelo) obj = this.dir * (this.vy < 0 ? 0.08 : -0.05);
      else if (Math.abs(this.vx) > 20) obj = this.dir * 0.06;
    }
    this.inclinacion += (obj - this.inclinacion) * Math.min(1, dt * 10);
    const s = this.estira, k = 300, am = Math.exp(-16 * dt);
    s.vx = (s.vx + (1 - s.sx) * k * dt) * am;
    s.vy = (s.vy + (1 - s.sy) * k * dt) * am;
    s.sx += s.vx * dt; s.sy += s.vy * dt;
  }

  herir() {
    if (this.estado === 'caido') return;
    this.estado = 'herido';
    this.accion = null;
    this.vx = -this.dir * 250;
    this.vy = this.enSuelo ? -250 : this.vy;
    this.anim.poner('herido', true);
  }

  caer() {
    this.estado = 'caido';
    this.accion = null;
    this.anim.poner('caido', true);
  }

  // Qué cuadro dibujar. Si falta la hoja, se usa el 1er cuadro de reposo.
  cuadroParaDibujar() {
    const nombre = this.anim.nombre;
    if (this.tiene(nombre)) {
      const d = Cuadros.datos[this.personaje][nombre];
      return { hoja: d, cuadro: d.cuadros[this.anim.indice], nombre, indice: this.anim.indice, total: d.cuadros.length, sustituto: false };
    }
    const r = Cuadros.datos[this.personaje].reposo;
    return { hoja: r, cuadro: r.cuadros[0], nombre, indice: 0, total: 0, sustituto: true };
  }

  dibujar(ctx, debug) {
    const info = this.cuadroParaDibujar();
    if (!info.cuadro) return;
    const cfgHoja = info.hoja.cfg;
    const escala = PRUEBA_CONFIG.escalaBase * PRUEBA_CONFIG.escalaPersonaje[this.personaje] * cfgHoja.escala;

    // Rebote leve en reposo (solo se mueve, no se deforma)
    const rebote = this.anim.nombre === 'reposo' && this.estado === 'normal' ? Math.sin(this.tiempo * 3) * 2 : 0;
    // Temblor del dash cuando la hoja tiene un solo cuadro
    const temblor = this.accion === 'dash' && info.total === 1 ? Math.sin(this.tiempo * 90) * 1.5 : 0;
    // Estirar/aplastar SOLO en el salto hecho por código
    const usarEstira = this.saltoPorCodigo && this.estado === 'normal';
    const sx = usarEstira ? this.estira.sx : 1, sy = usarEstira ? this.estira.sy : 1;

    ctx.save();
    ctx.translate(this.x, this.y + rebote + temblor);
    ctx.rotate(this.inclinacion);
    dibujarCuadro(ctx, info.hoja.img, info.cuadro, escala, this.dir, sx, sy, debug);
    ctx.restore();

    if (debug.pies) {
      ctx.strokeStyle = '#ff2d55'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(this.x - 90, this.y + 0.5); ctx.lineTo(this.x + 90, this.y + 0.5); ctx.stroke();
      ctx.fillStyle = '#ff2d55'; ctx.fillRect(this.x - 3, this.y - 3, 6, 6);
    }

    // Etiqueta sobre la cabeza
    const alto = info.cuadro.h * escala;
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px "Trebuchet MS", Arial';
    ctx.fillStyle = this.personaje === 'bubu' ? '#1c7ed6' : '#a0522d';
    ctx.fillText(this.etiqueta, this.x, this.y - alto - 22);
    ctx.font = '12px "Trebuchet MS", Arial';
    ctx.fillStyle = '#333';
    let txt = `${info.nombre} ${info.total ? (info.indice + 1) + '/' + info.total : ''}`;
    if (info.sustituto) txt += cfgFalta(this.personaje, info.nombre);
    ctx.fillText(txt, this.x, this.y - alto - 8);
  }
}

function cfgFalta(personaje, anim) {
  const c = PRUEBA_CONFIG.hojas[personaje][anim];
  if (c && c.codigo) return ' (por código)';
  return ' (FALTA)';
}

// Dibuja un cuadro con los pies en (0,0). Una sola escala; voltear = espejo.
function dibujarCuadro(ctx, img, c, escala, dir, sx = 1, sy = 1, debug = {}) {
  ctx.save();
  ctx.scale(dir * escala * sx, escala * sy);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, c.x, c.y, c.w, c.h, c.x - c.pieX, c.y - c.pieY, c.w, c.h);
  if (debug.cajas) {
    ctx.strokeStyle = '#00b3ff';
    ctx.lineWidth = 1.5 / escala;
    ctx.strokeRect(c.x - c.pieX, c.y - c.pieY, c.w, c.h);
  }
  ctx.restore();
}
