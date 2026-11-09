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
    this.area = !!o.area;                     // daño de área: baja con la distancia (config/balance.js -> areaDanio)
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
    // Objetivos alcanzados en este paso
    const alcanzados = [];
    for (const obj of mundo.objetivosDe(this.duenio)) {
      if (this.golpeados.has(obj)) continue;
      if (this.toca(U.rectDe(obj))) alcanzados.push(obj);
    }
    // Área: distancia del centro al borde más cercano de cada enemigo
    let masCercano = null;
    const distancias = new Map();
    if (this.area && this.forma === 'circulo' && typeof BALANCE !== 'undefined') {
      for (const obj of alcanzados) {
        const rc = U.rectDe(obj);
        const px = U.clamp(this.x, rc.x, rc.x + rc.w), py = U.clamp(this.y, rc.y, rc.y + rc.h);
        const d = Math.hypot(this.x - px, this.y - py);
        distancias.set(obj, d);
        if (!masCercano || d < distancias.get(masCercano)) masCercano = obj;
      }
    }
    for (const obj of alcanzados) {
      {
        this.golpeados.add(obj);
        const dir = this.radial || !this.seguir ? U.signo(obj.x - this.x) : this.seguir.dir;
        let danio = this.danio;
        if (distancias.has(obj)) {
          const completo = BALANCE.areaDanio.completoAlMasCercano && obj === masCercano;
          danio = this.danio * (completo ? 1 : BALANCE.factorArea(distancias.get(obj) / this.r));
        }
        mundo.aplicarDanio(obj, danio, {
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
    this.teledirigido = o.teledirigido || 0;   // >0: gira hacia el jugador más cercano (rad/s)
    this.alChocarSuelo = o.alChocarSuelo || null; // función (mundo, proyectil) al tocar el suelo
    this.golpeados = new Set();
    this.rot = 0;
    this.vivo = true;
  }

  actualizar(dt, mundo) {
    if (this.teledirigido) {
      const obj = mundo.jugadorMasCercano(this.x, this.y);
      if (obj) {
        const vel = Math.hypot(this.vx, this.vy);
        const actual = Math.atan2(this.vy, this.vx);
        const deseado = Math.atan2(obj.y - obj.alto / 2 - this.y, obj.x - this.x);
        let dif = deseado - actual;
        while (dif > Math.PI) dif -= Math.PI * 2;
        while (dif < -Math.PI) dif += Math.PI * 2;
        const nuevo = actual + U.clamp(dif, -this.teledirigido * dt, this.teledirigido * dt);
        this.vx = Math.cos(nuevo) * vel; this.vy = Math.sin(nuevo) * vel;
      }
    }
    this.vy += this.gravedad * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += dt * 18;
    this.vida -= dt;
    if (this.vida <= 0 || this.x < -200 || this.x > mundo.ancho + 200) { this.vivo = false; return; }
    if (this.chocaSuelo && this.y > mundo.sueloY) {
      this.vivo = false;
      mundo.emitir('chispa', { x: this.x, y: mundo.sueloY, color: this.color });
      if (this.alChocarSuelo) this.alChocarSuelo(mundo, this);
      return;
    }

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
