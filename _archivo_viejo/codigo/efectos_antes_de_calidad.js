/* =====================================================================
   EFECTOS VISUALES: partículas, textos flotantes, anillos, explosiones,
   carteles grandes (combos, jefe, rondas) y destellos de pantalla.
   Se alimenta de los eventos que emite el Mundo.
   ===================================================================== */
class Efectos {
  constructor(camara) {
    this.camara = camara;
    this.reiniciar();
  }

  reiniciar() {
    if (this.particulas) for (const p of this.particulas) this.devolver(p);
    this.pool = this.pool || [];   // partículas usadas que se vuelven a usar (no se crean nuevas)
    this.particulas = [];
    this.textos = [];
    this.anillos = [];
    this.arcos = [];
    this.banners = [];
    this.destello = 0;
    this.colorDestello = '#fff';
    this.alertasEnergia = {}; // jugador -> tiempo (la barra tiembla)
    this.monedasHud = 0;      // pulso del contador de monedas
  }

  // ---------- Rendimiento: límites (config/interfaz.js -> efectos) ----------
  limites() {
    const cfg = CONFIG.interfaz.efectos;
    return (typeof Juego !== 'undefined' && Juego.esTactil) ? cfg.celular : cfg.laptop;
  }
  // Cantidad de partículas de un evento, ajustada al dispositivo
  cant(n) { return Math.max(1, Math.round(n * this.limites().factorParticulas)); }

  // Partícula nueva (reutiliza una del pool). Si ya hay el máximo, no se agrega.
  particula(x, y, vx, vy, dur, color, tam, grav = 0, tipo = null) {
    if (this.particulas.length >= this.limites().maxParticulas) return;
    const p = this.pool.pop() || {};
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.t = 0; p.dur = dur; p.color = color; p.tam = tam; p.grav = grav; p.tipo = tipo;
    this.particulas.push(p);
  }
  devolver(p) { if (this.pool && this.pool.length < 800) this.pool.push(p); }

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
          this.texto(e.x, e.y - 20, String(e.danio), e.aJugador ? '#ff6b6b' : '#ffffff', e.danio >= 40);
          break;
        case 'chispa': this.chispas(e.x, e.y, e.color, 5); break;
        case 'polvo': this.polvo(e.x, e.y, e.cantidad || 5); break;
        case 'dobleSalto':
          this.anillos.push({ x: e.x, y: e.y, r: 10, rMax: 50, t: 0, dur: 0.3, color: '#ffffff', ancho: 4, plano: true });
          break;
        case 'lanzar': this.chispas(e.x, e.y, '#dfe9f5', 3); break;
        case 'arco': this.arcos.push({ jugador: e.jugador, dir: e.dir, radio: e.radio, color: e.color, t: 0, dur: 0.22, tipo: 'arco' }); break;
        case 'dash':
          for (let i = 0, n = this.cant(10); i < n; i++) this.particula(e.x, e.y + (Math.random() - 0.5) * 60, -e.dir * (200 + Math.random() * 300), 0, 0.3, '#ffe066', 3, 0, 'linea');
          break;
        case 'torbellino': this.arcos.push({ jugador: e.jugador, radio: e.radio, color: e.color, t: 0, dur: e.duracion, tipo: 'torbellino' }); break;
        case 'onda':
          this.anillos.push({ x: e.x, y: e.y, r: 20, rMax: e.radio, t: 0, dur: 0.4, color: e.color, ancho: 10, plano: true });
          this.polvo(e.x, e.y, 14);
          break;
        case 'explosion':
          this.anillos.push({ x: e.x, y: e.y, r: 30, rMax: e.radio, t: 0, dur: 0.55, color: e.color, ancho: 26 });
          this.anillos.push({ x: e.x, y: e.y, r: 10, rMax: e.radio * 0.7, t: 0, dur: 0.4, color: '#fff3b0', ancho: 14 });
          for (let i = 0, n = this.cant(60); i < n; i++) {
            const a = Math.random() * Math.PI, v = 300 + Math.random() * 900;
            this.particula(e.x, e.y, Math.cos(a) * v * (Math.random() < 0.5 ? 1 : -1), -Math.sin(a) * v, 0.6 + Math.random() * 0.6, Math.random() < 0.5 ? e.color : '#ffd36b', 4 + Math.random() * 6, 1400);
          }
          this.polvo(e.x, e.y, 30);
          this.flash('#ffb37a', 0.7);
          break;
        case 'combo':
          this.banners.push({ texto: e.nombre, sub: 'COMBINACIÓN', color: e.color, t: 0, dur: 1.4, combo: true });
          this.anillos.push({ x: e.x, y: e.y, r: 10, rMax: 160, t: 0, dur: 0.35, color: e.color, ancho: 8 });
          this.flash(e.color, 0.35);
          break;
        case 'banner': this.banners.push({ texto: e.texto, sub: e.sub, color: e.color, t: 0, dur: 2.2 }); break;
        case 'sacudir': this.camara.sacudir(e.fuerza); break;
        case 'muerteEnemigo':
          this.chispas(e.x, e.y, e.color, 18);
          this.texto(e.x, e.y - 50, '¡PUM!', '#ffd84d', false);
          break;
        case 'muerteJefe':
          for (let k = 0; k < 4; k++) this.anillos.push({ x: e.x + (Math.random() - 0.5) * 80, y: e.y + (Math.random() - 0.5) * 120, r: 10, rMax: 220, t: -k * 0.2, dur: 0.5, color: '#ffd84d', ancho: 16 });
          this.chispas(e.x, e.y, e.color, 50);
          this.flash('#ffffff', 0.8);
          break;
        case 'moneda': this.texto(e.x, e.y - 10, '+' + e.valor, '#ffd84d', false, true); this.monedasHud = 1; break;
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
          this.anillos.push({ x: e.x, y: e.y, r: 10, rMax: 80, t: 0, dur: 0.4, color: '#ff6b8a', ancho: 6 });
          this.chispas(e.x, e.y, '#ff8fab', 14);
          break;
        case 'caido': this.chispas(e.x, e.y - 40, '#ff6b6b', 20); this.camara.sacudir(10); break;
        case 'revivido':
          this.anillos.push({ x: e.x, y: e.y - 40, r: 20, rMax: 140, t: 0, dur: 0.5, color: '#7dff9b', ancho: 10 });
          this.texto(e.x, e.y - 110, '¡REVIVIDO!', '#7dff9b', true);
          break;
        case 'avanzar': break;
        // Aviso en el suelo antes de un ataque de área (lluvia de flechas, meteoritos)
        case 'avisoSuelo':
          this.anillos.push({ x: e.x, y: e.y, r: e.radio, rMax: e.radio, t: 0, dur: e.duracion, color: e.color, ancho: 5, plano: true, aviso: true });
          break;
        case 'teletransporte':
          this.anillos.push({ x: e.x, y: e.y, r: 10, rMax: 70, t: 0, dur: 0.35, color: e.color || '#b197fc', ancho: 6 });
          for (let i = 0, n = this.cant(14); i < n; i++) this.particula(e.x + (Math.random() - 0.5) * 40, e.y + (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 120, -60 - Math.random() * 160, 0.5, e.color || '#b197fc', 4);
          break;
        case 'oleada': this.banners.push({ texto: e.tramo ? `OLEADA ${e.numero}/${e.total}` : `OLEADA ${e.numero}`, sub: '', color: '#ffffff', t: 0, dur: 1.2, pequeno: true }); break;
        case 'tramo': this.banners.push({ texto: `TRAMO ${e.numero}/${e.total}`, sub: '', color: '#ffe066', t: 0, dur: 1.4, pequeno: true }); break;
        case 'refuerzo': this.texto(e.x, 120, '¡REFUERZO!', '#ff8787', false, true); break;
      }
    }
  }

  chispas(x, y, color, n) {
    n = this.cant(n);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 150 + Math.random() * 450;
      this.particula(x, y, Math.cos(a) * v, Math.sin(a) * v - 100, 0.25 + Math.random() * 0.3, color, 2 + Math.random() * 4, 900);
    }
  }

  polvo(x, y, n) {
    n = this.cant(n);
    for (let i = 0; i < n; i++) {
      this.particula(x + (Math.random() - 0.5) * 30, y - 4, (Math.random() - 0.5) * 300, -Math.random() * 120, 0.4 + Math.random() * 0.3, 'rgba(240,235,220,0.8)', 6 + Math.random() * 8, 0, 'humo');
    }
  }

  texto(x, y, texto, color, grande = false, chico = false) {
    // Muchos números de daño a la vez no se leen y cuestan: con el máximo, se reemplaza el más viejo
    if (this.textos.length >= this.limites().maxTextos) {
      if (!grande) return;
      this.textos.shift();
    }
    this.textos.push({ x: x + (Math.random() - 0.5) * 16, y, texto, color, t: 0, dur: grande ? 1.1 : 0.75, grande, chico });
  }

  flash(color, intensidad) { this.destello = Math.max(this.destello, intensidad); this.colorDestello = color; }

  actualizar(dt) {
    for (const p of this.particulas) {
      p.t += dt;
      p.vy += (p.grav || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.tipo === 'humo') { p.vx *= 0.92; p.vy *= 0.92; }
    }
    // Se quitan los terminados sin crear listas nuevas (las partículas vuelven al pool)
    if (!this._devolver) this._devolver = (p) => this.devolver(p);
    this.compactar(this.particulas, this._devolver);
    for (const t of this.textos) { t.t += dt; t.y -= dt * (t.grande ? 50 : 80); }
    this.compactar(this.textos);
    for (const a of this.anillos) a.t += dt;
    this.compactar(this.anillos);
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
      if (p.x < v.izq || p.x > v.der) continue; // fuera de pantalla
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
      if (t.x < v.izq || t.x > v.der) continue;
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
