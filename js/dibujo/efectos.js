/* =====================================================================
   EFECTOS VISUALES: partículas, textos flotantes, anillos, explosiones,
   carteles grandes (combos, jefe, rondas) y destellos de pantalla.
   Se alimenta de los eventos que emite el Mundo.
   Rendimiento (config/interfaz.js -> efectos y calidad):
   - Tope de efectos a la vez según el dispositivo; al llegar, se descartan
     primero las partículas más viejas y los textos menos importantes.
   - Calidad automática (alta, media, baja) según los FPS de este dispositivo.
   - Números de daño juntos: uno por enemigo con el total de ~150 ms.
   - Partículas, textos y anillos se reutilizan (pool): no se crean objetos nuevos.
   ===================================================================== */

// ---------- Calidad automática (cada dispositivo decide la suya) ----------
const Calidad = {
  orden: ['alta', 'media', 'baja'],
  nivel: null,
  cambios: 0,      // cuántas veces cambió en esta sesión (para el panel)
  _malos: 0,       // segundos seguidos con FPS bajo
  _buenos: 0,      // segundos seguidos con FPS alto
  cfg() { return CONFIG.interfaz.calidad; },
  nombre() { if (!this.nivel) this.nivel = this.cfg().inicial; return this.nivel; },
  actual() { return this.cfg().niveles[this.nombre()]; },

  // Se llama una vez por segundo con los cuadros dibujados en ese segundo
  registrarFps(fps, jugando) {
    const c = this.cfg();
    this.nombre();
    if (!c.automatica || !jugando || document.hidden) { this._malos = 0; this._buenos = 0; return; }
    if (fps < c.bajarSiFpsMenorA) { this._malos++; this._buenos = 0; }
    else if (fps > c.subirSiFpsMayorA) { this._buenos++; this._malos = 0; }
    else { this._malos = 0; this._buenos = 0; }
    const i = this.orden.indexOf(this.nivel);
    if (this._malos >= c.segundosParaBajar && i < this.orden.length - 1) {
      this.nivel = this.orden[i + 1]; this._malos = 0; this.cambios++;
    } else if (this._buenos >= c.segundosParaSubir && i > 0) {
      this.nivel = this.orden[i - 1]; this._buenos = 0; this.cambios++;
    }
  },
};

class Efectos {
  constructor(camara) {
    this.camara = camara;
    this.reiniciar();
  }

  reiniciar() {
    // Objetos usados que se vuelven a usar (no se crean nuevos)
    this.pool = this.pool || [];
    this.poolTextos = this.poolTextos || [];
    this.poolAnillos = this.poolAnillos || [];
    this.danioPorQuien = this.danioPorQuien || new Map(); // enemigo -> su número de daño que se está juntando
    if (this.particulas) for (const p of this.particulas) this.devolver(p);
    if (this.textos) for (const t of this.textos) this.devolverTexto(t);
    if (this.anillos) for (const a of this.anillos) this.devolverAnillo(a);
    this.danioPorQuien.clear();
    this.particulas = [];
    this.textos = [];
    this.anillos = [];
    this.arcos = [];
    this.banners = [];
    this.descartados = 0;     // efectos quitados por el tope (para el panel)
    this.destello = 0;
    this.colorDestello = '#fff';
    this.alertasEnergia = {}; // jugador -> tiempo (la barra tiembla)
    this.monedasHud = 0;      // pulso del contador de monedas
  }

  // ---------- Rendimiento: límites (config/interfaz.js -> efectos y calidad) ----------
  limites() {
    const cfg = CONFIG.interfaz.efectos;
    return (typeof Juego !== 'undefined' && Juego.esTactil) ? cfg.celular : cfg.laptop;
  }
  calidad() { return Calidad.actual(); }
  // ¿Se dibujan los efectos secundarios (polvo, chispas pequeñas, "¡PUM!")?
  menores() { return this.calidad().efectosMenores; }
  // Máximo de efectos a la vez para este dispositivo y esta calidad
  tope() { return Math.max(20, Math.round(this.limites().topeTotal * this.calidad().factorTope)); }
  // Efectos visuales vivos ahora (lo que cuenta para el tope)
  total() { return this.particulas.length + this.textos.length + this.anillos.length + this.arcos.length + this.banners.length; }
  // Cantidad de partículas de un evento, ajustada al dispositivo y a la calidad
  cant(n) { return Math.max(1, Math.round(n * this.limites().factorParticulas * this.calidad().factorParticulas)); }

  // Desglose para el panel de depuración
  desglose(d = {}) {
    let numeros = 0;
    for (const t of this.textos) if (t.quien != null) numeros++;
    d.particulas = this.particulas.length; d.numerosDanio = numeros; d.otrosTextos = this.textos.length - numeros;
    d.area = this.anillos.length + this.arcos.length; d.carteles = this.banners.length;
    return d;
  }

  // Partícula nueva (reutiliza una del pool). En el tope, se descarta la partícula más vieja.
  particula(x, y, vx, vy, dur, color, tam, grav = 0, tipo = null) {
    if (this.particulas.length >= this.limites().maxParticulas || this.total() >= this.tope()) {
      if (!this.particulas.length) { this.descartados++; return; } // el tope lo llenan efectos más importantes
      this.devolver(this.particulas.shift());
      this.descartados++;
    }
    const p = this.pool.pop() || {};
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.t = 0; p.dur = dur; p.color = color; p.tam = tam; p.grav = grav; p.tipo = tipo;
    this.particulas.push(p);
  }
  devolver(p) { if (this.pool.length < 800) this.pool.push(p); }
  devolverTexto(t) {
    if (t.quien != null && this.danioPorQuien.get(t.quien) === t) this.danioPorQuien.delete(t.quien);
    t.quien = null;
    if (this.poolTextos.length < 100) this.poolTextos.push(t);
  }
  devolverAnillo(a) { if (this.poolAnillos.length < 60) this.poolAnillos.push(a); }

  // Hace lugar para un efecto principal (anillo, arco, cartel): nunca se descarta,
  // se quitan antes partículas viejas y textos de poca importancia.
  hacerEspacio() {
    while (this.total() >= this.tope()) {
      if (this.particulas.length) { this.devolver(this.particulas.shift()); this.descartados++; continue; }
      const k = this.textos.findIndex((t) => t.prioridad === 0);
      if (k < 0) break;
      this.devolverTexto(this.textos.splice(k, 1)[0]);
      this.descartados++;
    }
  }

  // Anillo (onda, explosión, aviso en el suelo...) reutilizando objetos
  anillo(x, y, r, rMax, dur, color, ancho, plano = false, aviso = false, t = 0) {
    this.hacerEspacio();
    const a = this.poolAnillos.pop() || {};
    a.x = x; a.y = y; a.r = r; a.rMax = rMax; a.t = t; a.dur = dur; a.color = color; a.ancho = ancho; a.plano = plano; a.aviso = aviso;
    this.anillos.push(a);
  }
  arco(datos) { this.hacerEspacio(); this.arcos.push(datos); }
  banner(datos) { this.hacerEspacio(); this.banners.push(datos); }

  // Quita de la lista lo que terminó, sin crear una lista nueva
  compactar(lista, alQuitar) {
    let k = 0;
    for (let i = 0; i < lista.length; i++) {
      const o = lista[i];
      if (o.t < o.dur) lista[k++] = o;
      else if (alQuitar) alQuitar(o);
    }
    lista.length = k;
  }

  procesar(eventos, mundo) {
    for (const e of eventos) {
      switch (e.tipo) {
        case 'impacto':
          this.chispas(e.x, e.y, e.color || '#fff', 8 + Math.min(14, e.danio / 3));
          this.numeroDanio(e);
          break;
        case 'chispa': if (this.menores()) this.chispas(e.x, e.y, e.color, 5); break;
        case 'polvo': this.polvo(e.x, e.y, e.cantidad || 5); break;
        case 'dobleSalto':
          if (this.menores()) this.anillo(e.x, e.y, 10, 50, 0.3, '#ffffff', 4, true);
          break;
        case 'lanzar': if (this.menores()) this.chispas(e.x, e.y, '#dfe9f5', 3); break;
        case 'arco': this.arco({ jugador: e.jugador, dir: e.dir, radio: e.radio, color: e.color, t: 0, dur: 0.22, tipo: 'arco' }); break;
        case 'dash':
          for (let i = 0, n = this.cant(10); i < n; i++) this.particula(e.x, e.y + (Math.random() - 0.5) * 60, -e.dir * (200 + Math.random() * 300), 0, 0.3, '#ffe066', 3, 0, 'linea');
          break;
        case 'torbellino': this.arco({ jugador: e.jugador, radio: e.radio, color: e.color, t: 0, dur: e.duracion, tipo: 'torbellino' }); break;
        case 'onda':
          this.anillo(e.x, e.y, 20, e.radio, 0.4, e.color, 10, true);
          this.polvo(e.x, e.y, 14);
          break;
        case 'explosion':
          // Cataclismo: los anillos y el destello (lo principal) siempre se ven; las partículas bajan con la calidad
          this.anillo(e.x, e.y, 30, e.radio, 0.55, e.color, 26);
          this.anillo(e.x, e.y, 10, e.radio * 0.7, 0.4, '#fff3b0', 14);
          for (let i = 0, n = this.cant(60); i < n; i++) {
            const a = Math.random() * Math.PI, v = 300 + Math.random() * 900;
            this.particula(e.x, e.y, Math.cos(a) * v * (Math.random() < 0.5 ? 1 : -1), -Math.sin(a) * v, 0.6 + Math.random() * 0.6, Math.random() < 0.5 ? e.color : '#ffd36b', 4 + Math.random() * 6, 1400);
          }
          this.polvo(e.x, e.y, 30);
          this.flash('#ffb37a', 0.7);
          break;
        case 'combo':
          this.banner({ texto: e.nombre, sub: 'COMBINACIÓN', color: e.color, t: 0, dur: 1.4, combo: true });
          this.anillo(e.x, e.y, 10, 160, 0.35, e.color, 8);
          this.flash(e.color, 0.35);
          break;
        case 'banner': this.banner({ texto: e.texto, sub: e.sub, color: e.color, t: 0, dur: 2.2 }); break;
        case 'sacudir': this.camara.sacudir(e.fuerza); break;
        case 'muerteEnemigo':
          this.chispas(e.x, e.y, e.color, 18);
          if (this.menores()) this.texto(e.x, e.y - 50, '¡PUM!', '#ffd84d', false, false, 0);
          break;
        case 'muerteJefe':
          for (let k = 0; k < 4; k++) this.anillo(e.x + (Math.random() - 0.5) * 80, e.y + (Math.random() - 0.5) * 120, 10, 220, 0.5, '#ffd84d', 16, false, false, -k * 0.2);
          this.chispas(e.x, e.y, e.color, 50);
          this.flash('#ffffff', 0.8);
          break;
        case 'moneda': this.texto(e.x, e.y - 10, '+' + e.valor, '#ffd84d', false, true, 0); this.monedasHud = 1; break;
        case 'texto': this.texto(e.x, e.y, e.texto, e.color, e.grande); break;
        case 'sinEnergia': {
          // Aviso pequeño sobre el jugador (sin repetirlo mientras tiembla la barra)
          const j = mundo && mundo.jugadores[e.jugador];
          if (j && !(this.alertasEnergia[e.jugador] > 0)) this.texto(j.x, j.y - j.alto - 30, 'Sin maná', '#74c0fc', false, true);
          this.alertasEnergia[e.jugador] = 0.4;
          break;
        }
        case 'curar':
          this.texto(e.x, e.y - 30, '+' + e.cantidad + ' ♥', '#7dff9b', true);
          this.anillo(e.x, e.y, 10, 80, 0.4, '#ff6b8a', 6);
          this.chispas(e.x, e.y, '#ff8fab', 14);
          break;
        case 'caido': this.chispas(e.x, e.y - 40, '#ff6b6b', 20); this.camara.sacudir(10); break;
        case 'revivido':
          this.anillo(e.x, e.y - 40, 20, 140, 0.5, '#7dff9b', 10);
          this.texto(e.x, e.y - 110, '¡REVIVIDO!', '#7dff9b', true);
          break;
        // Aviso en el suelo antes de un ataque de área (lluvia de flechas, meteoritos)
        case 'avisoSuelo':
          this.anillo(e.x, e.y, e.radio, e.radio, e.duracion, e.color, 5, true, true);
          break;
        case 'teletransporte':
          this.anillo(e.x, e.y, 10, 70, 0.35, e.color || '#b197fc', 6);
          for (let i = 0, n = this.cant(14); i < n; i++) this.particula(e.x + (Math.random() - 0.5) * 40, e.y + (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 120, -60 - Math.random() * 160, 0.5, e.color || '#b197fc', 4);
          break;
        case 'oleada': this.banner({ texto: e.tramo ? `OLEADA ${e.numero}/${e.total}` : `OLEADA ${e.numero}`, sub: '', color: '#ffffff', t: 0, dur: 1.2, pequeno: true }); break;
        case 'tramo': this.banner({ texto: `TRAMO ${e.numero}/${e.total}`, sub: '', color: '#ffe066', t: 0, dur: 1.4, pequeno: true }); break;
        case 'refuerzo': this.texto(e.x, 120, '¡REFUERZO!', '#ff8787', false, true); break;
      }
    }
  }

  // Número de daño: los golpes al mismo enemigo en ~150 ms se suman en un solo número
  numeroDanio(e) {
    const color = e.aJugador ? '#ff6b6b' : '#ffffff';
    const juntar = (CONFIG.interfaz.efectos.juntarDanioMs || 0) / 1000;
    if (e.quien != null && juntar > 0) {
      const t = this.danioPorQuien.get(e.quien);
      if (t && t.t <= juntar && t.aJugador === !!e.aJugador) {
        t.valor += e.danio;
        t.texto = String(t.valor);
        if (!t.grande && t.valor >= 40) { t.grande = true; t.dur = 1.1; t.prioridad = 2; }
        return;
      }
    }
    const t = this.texto(e.x, e.y - 20, String(e.danio), color, e.danio >= 40);
    if (t && e.quien != null) {
      t.quien = e.quien; t.valor = e.danio; t.aJugador = !!e.aJugador;
      this.danioPorQuien.set(e.quien, t);
    }
  }

  chispas(x, y, color, n) {
    n = this.cant(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 150 + Math.random() * 450;
      this.particula(x, y, Math.cos(a) * v, Math.sin(a) * v - 100, 0.25 + Math.random() * 0.3, color, 2 + Math.random() * 4, 900);
    }
  }

  // Polvo: efecto secundario (no se dibuja en calidad baja)
  polvo(x, y, n) {
    if (!this.menores()) return;
    n = this.cant(n);
    for (let i = 0; i < n; i++) {
      this.particula(x + (Math.random() - 0.5) * 30, y - 4, (Math.random() - 0.5) * 300, -Math.random() * 120, 0.4 + Math.random() * 0.3, 'rgba(240,235,220,0.8)', 6 + Math.random() * 8, 0, 'humo');
    }
  }

  // Texto flotante. prioridad: 0 = menor ("¡PUM!", "+1"), 1 = normal (daño), 2 = importante (grande).
  // Con el máximo, se quita el más viejo de menor (o igual) importancia; si no hay, no se agrega.
  texto(x, y, texto, color, grande = false, chico = false, prioridad = grande ? 2 : 1) {
    const max = this.limites().maxTextos;
    // En el tope total, primero se quitan partículas viejas
    while (this.total() >= this.tope() && this.particulas.length && this.textos.length < max) {
      this.devolver(this.particulas.shift()); this.descartados++;
    }
    if (this.textos.length >= max || this.total() >= this.tope()) {
      let k = -1;
      for (let i = 0; i < this.textos.length; i++) {
        if (this.textos[i].prioridad <= prioridad && (k < 0 || this.textos[i].prioridad < this.textos[k].prioridad)) k = i;
      }
      this.descartados++;
      if (k < 0) return null;
      this.devolverTexto(this.textos.splice(k, 1)[0]);
    }
    const t = this.poolTextos.pop() || {};
    t.x = x + (Math.random() - 0.5) * 16; t.y = y; t.texto = texto; t.color = color; t.t = 0;
    t.dur = grande ? 1.1 : 0.75; t.grande = grande; t.chico = chico; t.prioridad = prioridad;
    t.quien = null; t.valor = 0; t.aJugador = false;
    this.textos.push(t);
    return t;
  }

  flash(color, intensidad) { this.destello = Math.max(this.destello, intensidad); this.colorDestello = color; }

  actualizar(dt) {
    for (const p of this.particulas) {
      p.t += dt;
      p.vy += (p.grav || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.tipo === 'humo') { p.vx *= 0.92; p.vy *= 0.92; }
    }
    // Se quitan los terminados sin crear listas nuevas (vuelven a su pool)
    if (!this._devolver) {
      this._devolver = (p) => this.devolver(p);
      this._devolverTexto = (t) => this.devolverTexto(t);
      this._devolverAnillo = (a) => this.devolverAnillo(a);
    }
    this.compactar(this.particulas, this._devolver);
    for (const t of this.textos) { t.t += dt; t.y -= dt * (t.grande ? 50 : 80); }
    this.compactar(this.textos, this._devolverTexto);
    for (const a of this.anillos) a.t += dt;
    this.compactar(this.anillos, this._devolverAnillo);
    for (const a of this.arcos) a.t += dt;
    this.compactar(this.arcos);
    for (const b of this.banners) b.t += dt;
    this.compactar(this.banners);
    this.destello = Math.max(0, this.destello - dt * 2.5);
    this.monedasHud = Math.max(0, this.monedasHud - dt * 4);
    for (const k in this.alertasEnergia) this.alertasEnergia[k] = Math.max(0, this.alertasEnergia[k] - dt);
  }

  // Dibujo dentro del mundo (con la cámara aplicada)
  dibujarMundo(ctx, mundo) {
    for (const a of this.anillos) {
      if (a.t < 0) continue;
      const k = a.t / a.dur;
      const r = a.r + (a.rMax - a.r) * U.easeOutCubic(k);
      ctx.save();
      ctx.globalAlpha = a.aviso ? 0.45 + Math.abs(Math.sin(a.t * 14)) * 0.5 : 1 - k;
      if (a.aviso) { ctx.fillStyle = a.color; ctx.globalAlpha *= 0.35; ctx.beginPath(); ctx.ellipse(a.x, a.y, r * k, r * k * 0.28, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha /= 0.35; }
      ctx.strokeStyle = a.color;
      ctx.lineWidth = a.ancho * (1 - k) + 1;
      ctx.beginPath();
      if (a.plano) ctx.ellipse(a.x, a.y, r, r * 0.28, 0, 0, Math.PI * 2);
      else ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (const a of this.arcos) {
      const j = mundo.jugadores[a.jugador];
      if (!j) continue;
      const k = a.t / a.dur;
      ctx.save();
      ctx.translate(j.x, j.y - j.alto * 0.5);
      if (a.tipo === 'arco') {
        ctx.scale(a.dir, 1);
        ctx.globalAlpha = 1 - k;
        const ini = -1.3 + k * 0.4, fin = ini + 2.4 * U.easeOutCubic(Math.min(1, k * 2.2));
        ctx.lineCap = 'round';
        ctx.strokeStyle = a.color; ctx.lineWidth = 16 * (1 - k) + 2;
        ctx.shadowColor = a.color; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(10, 0, a.radio, ini, fin); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(10, 0, a.radio - 4, ini, fin); ctx.stroke();
      } else {
        // Torbellino: varios arcos girando alrededor
        ctx.globalAlpha = 0.85 * (1 - k * 0.5);
        ctx.shadowColor = a.color; ctx.shadowBlur = 20;
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const ang = a.t * 26 + (i * Math.PI * 2) / 3;
          ctx.strokeStyle = i === 0 ? '#ffffff' : a.color;
          ctx.lineWidth = 10;
          ctx.beginPath(); ctx.arc(0, 0, a.radio * (0.75 + i * 0.1), ang, ang + 1.5); ctx.stroke();
        }
      }
      ctx.restore();
    }
    const v = U.rangoVisibleX(ctx, 40);
    for (const p of this.particulas) {
      if (p.x < v.izq || p.x > v.der || p.y < v.arriba || p.y > v.abajo) continue; // fuera de pantalla
      const k = p.t / p.dur;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = p.color;
      if (p.tipo === 'linea') {
        ctx.fillRect(p.x, p.y, -p.vx * 0.05, 3);
      } else if (p.tipo === 'humo') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.tam * (1 + k), 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillRect(p.x - p.tam / 2, p.y - p.tam / 2, p.tam * (1 - k * 0.5), p.tam * (1 - k * 0.5));
      }
    }
    ctx.globalAlpha = 1;
    for (const t of this.textos) {
      if (t.x < v.izq || t.x > v.der || t.y < v.arriba - 40 || t.y > v.abajo + 40) continue;
      const k = t.t / t.dur;
      const esc = t.t < 0.1 ? 0.6 + t.t * 6 : 1;
      ctx.save();
      ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
      ctx.translate(t.x, t.y);
      ctx.scale(esc, esc);
      ctx.font = `900 ${t.grande ? 38 : t.chico ? 18 : 24}px "Trebuchet MS", Arial`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 5; ctx.strokeStyle = '#1a1a2e';
      ctx.strokeText(t.texto, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.texto, 0, 0);
      ctx.restore();
    }
  }

  // Dibujo en pantalla (sin cámara): destellos y carteles
  dibujarPantalla(ctx, W, H) {
    if (this.destello > 0) {
      ctx.globalAlpha = Math.min(0.6, this.destello * 0.6);
      ctx.fillStyle = this.colorDestello;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    let desplaz = 0;
    for (const b of this.banners) {
      const k = b.t / b.dur;
      const entrada = Math.min(1, b.t / 0.25);
      const salida = k > 0.8 ? (1 - k) / 0.2 : 1;
      const esc = U.easeOutBack(entrada) * (b.combo ? 1 + Math.sin(b.t * 20) * 0.02 : 1);
      const tam = Math.min(W / 12, b.pequeno ? 40 : b.combo ? 64 : 76);
      ctx.save();
      ctx.globalAlpha = salida;
      ctx.translate(W / 2, H * (b.combo ? 0.3 : 0.38) + desplaz);
      ctx.scale(esc, esc);
      if (b.combo) {
        // Franja detrás del nombre del combo
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(-W, -tam * 0.95, W * 2, tam * 1.5);
        ctx.fillStyle = b.color;
        ctx.fillRect(-W, -tam * 0.95, W * 2, 4);
        ctx.fillRect(-W, tam * 0.55, W * 2, 4);
      }
      ctx.textAlign = 'center';
      ctx.font = `italic 900 ${tam}px "Trebuchet MS", Arial`;
      ctx.lineWidth = tam / 6;
      ctx.strokeStyle = '#1a1a2e';
      ctx.strokeText(b.texto, 0, 0);
      ctx.shadowColor = b.color; ctx.shadowBlur = 25;
      ctx.fillStyle = b.color;
      ctx.fillText(b.texto, 0, 0);
      ctx.shadowBlur = 0;
      if (b.sub) {
        ctx.font = `bold ${tam * 0.35}px "Trebuchet MS", Arial`;
        ctx.lineWidth = 4;
        ctx.strokeText(b.sub, 0, tam * 0.5 + (b.combo ? -tam * 1.0 - 4 : 6));
        ctx.fillStyle = '#ffffff';
        ctx.fillText(b.sub, 0, tam * 0.5 + (b.combo ? -tam * 1.0 - 4 : 6));
      }
      ctx.restore();
      desplaz += tam * 1.6;
    }
  }
}
