/* =====================================================================
   ATAQUES: zonas de golpe (Golpe) y proyectiles (Proyectil)
   Son solo lógica. El dibujo está en dibujo/render.js.
   ===================================================================== */

// Zona de daño temporal (rectángulo o círculo). Puede seguir a una entidad.
class Golpe {
  constructor(o) {
    this.duenio = o.duenio;
    this.forma = o.forma || 'rect';          // 'rect' | 'circulo'
    this.w = o.w || 0; this.h = o.h || 0; this.r = o.r || 0;
    this.offX = o.offX || 0; this.offY = o.offY || 0; // relativo al dueño (offX según su dirección)
    this.x = o.x ?? 0; this.y = o.y ?? 0;
    this.seguir = o.seguir || null;
    this.duracion = o.duracion ?? 0.1;
    this.retraso = o.retraso || 0;
    this.danio = o.danio || 0;
    this.empujeX = o.empujeX ?? 200;
    this.empujeY = o.empujeY ?? 150;
    this.radial = !!o.radial;                 // empuja alejando desde el centro
    this.intervalo = o.intervalo || 0;        // >0: puede volver a golpear al mismo objetivo
    this.tInterv = 0;
    this.golpeados = new Set();
    this.color = o.color || '#fff';
    this.vivo = true;
    this.actualizarPosicion();
  }

  actualizarPosicion() {
    if (!this.seguir) return;
    this.x = this.seguir.x + this.offX * this.seguir.dir;
    this.y = this.seguir.y + this.offY;
  }

  toca(rect) {
    if (this.forma === 'circulo') return U.circuloRect(this.x, this.y, this.r, rect);
    return U.rectChoca({ x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }, rect);
  }

  actualizar(dt, mundo) {
    if (this.retraso > 0) { this.retraso -= dt; return; }
    this.actualizarPosicion();
    if (this.intervalo > 0) {
      this.tInterv += dt;
      if (this.tInterv >= this.intervalo) { this.tInterv = 0; this.golpeados.clear(); }
    }
    for (const obj of mundo.objetivosDe(this.duenio)) {
      if (this.golpeados.has(obj)) continue;
      if (this.toca(U.rectDe(obj))) {
        this.golpeados.add(obj);
        const dir = this.radial || !this.seguir ? U.signo(obj.x - this.x) : this.seguir.dir;
        mundo.aplicarDanio(obj, this.danio, {
          atacante: this.duenio, dirX: dir, empujeX: this.empujeX, empujeY: this.empujeY,
          x: obj.x, y: obj.y - obj.alto * 0.6, color: this.color,
        });
      }
    }
    this.duracion -= dt;
    if (this.duracion <= 0) this.vivo = false;
  }
}

// Proyectil que vuela (cuchilla, corte volador, onda del gigante...)
class Proyectil {
  constructor(o) {
    this.duenio = o.duenio;
    this.tipo = o.tipo;                  // usado por el dibujo
    this.x = o.x; this.y = o.y;
    this.vx = o.vx || 0; this.vy = o.vy || 0;
    this.radio = o.radio || 12;
    this.danio = o.danio || 5;
    this.vida = o.vida ?? 1;
    this.vidaMax = this.vida;
    this.perfora = !!o.perfora;          // atraviesa enemigos
    this.gravedad = o.gravedad || 0;
    this.empujeX = o.empujeX ?? 150;
    this.empujeY = o.empujeY ?? 100;
    this.color = o.color || '#fff';
    this.escala = o.escala || 1;
    this.chocaSuelo = o.chocaSuelo ?? true;
    this.golpeados = new Set();
    this.rot = 0;
    this.vivo = true;
  }

  actualizar(dt, mundo) {
    this.vy += this.gravedad * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += dt * 18;
    this.vida -= dt;
    if (this.vida <= 0 || this.x < -200 || this.x > mundo.ancho + 200) { this.vivo = false; return; }
    if (this.chocaSuelo && this.y > mundo.sueloY) { this.vivo = false; mundo.emitir('chispa', { x: this.x, y: mundo.sueloY, color: this.color }); return; }

    for (const obj of mundo.objetivosDe(this.duenio)) {
      if (this.golpeados.has(obj)) continue;
      if (U.circuloRect(this.x, this.y, this.radio, U.rectDe(obj))) {
        this.golpeados.add(obj);
        mundo.aplicarDanio(obj, this.danio, {
          atacante: this.duenio, dirX: U.signo(this.vx || 1), empujeX: this.empujeX, empujeY: this.empujeY,
          x: this.x, y: this.y, color: this.color,
        });
        if (!this.perfora) { this.vivo = false; return; }
      }
    }
  }
}
