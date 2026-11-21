/* =====================================================================
   FONDO DEL MUNDO 5: JUNGLA ENCANTADA (v1.10), dibujado por código.
   Bosque oscuro con plantas gigantes y luciérnagas, con parallax como los otros mundos.
   Este archivo NO se carga al abrir el juego: lo pide CARGA_MUNDOS (js/logica/niveles_mundos.js)
   en segundo plano o al elegir un nivel de la Jungla. Mientras no llega se ve el fondo de la Isla.
   Sin brillos (shadowBlur) para que sea liviano en celular.
   ===================================================================== */

// Hoja gigante (de lado), con su nervio central
function hojaGigante(ctx, x, y, largo, ancho, angulo, color, nervio) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angulo);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(largo * 0.5, -ancho, largo, 0);
  ctx.quadraticCurveTo(largo * 0.5, ancho, 0, 0);
  ctx.fill();
  if (nervio) {
    ctx.strokeStyle = nervio; ctx.lineWidth = Math.max(1, ancho * 0.08);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(largo * 0.95, 0); ctx.stroke();
  }
  ctx.restore();
}

// Planta gigante: tallo curvo con varias hojas grandes
function plantaGigante(ctx, x, suelo, alto, escala, colorTallo, colorHoja, nervio, balanceo) {
  ctx.strokeStyle = colorTallo; ctx.lineWidth = 9 * escala; ctx.lineCap = 'round';
  const tope = suelo - alto;
  const cx = x + balanceo * 10 * escala;
  ctx.beginPath(); ctx.moveTo(x, suelo); ctx.quadraticCurveTo(x - 20 * escala, suelo - alto * 0.5, cx, tope); ctx.stroke();
  for (let k = 0; k < 4; k++) {
    const yk = suelo - alto * (0.35 + k * 0.18);
    const lado = k % 2 ? 1 : -1;
    hojaGigante(ctx, x + (cx - x) * (k / 4), yk, (90 + k * 10) * escala, 26 * escala, lado > 0 ? -0.5 + balanceo * 0.05 : Math.PI + 0.5 - balanceo * 0.05, colorHoja, nervio);
  }
  hojaGigante(ctx, cx, tope, 80 * escala, 22 * escala, -Math.PI / 2 + balanceo * 0.1, colorHoja, nervio);
}

// Hongo con sombrero de color (sin brillo)
function hongo(ctx, x, y, r, color) {
  ctx.fillStyle = '#e9ecef';
  ctx.fillRect(x - r * 0.25, y - r * 1.1, r * 0.5, r * 1.1);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, y - r * 1.1, r, r * 0.6, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(x - r * 0.4, y - r * 1.35, r * 0.13, 0, Math.PI * 2); ctx.arc(x + r * 0.3, y - r * 1.5, r * 0.1, 0, Math.PI * 2); ctx.fill();
}

FONDOS.jungla = {
  fondo(ctx, cam, W, H, t) {
    const s = H / 720;
    // Cielo nocturno verdoso
    if (!this._g || this._gH !== H) {
      this._g = ctx.createLinearGradient(0, 0, 0, H);
      this._g.addColorStop(0, '#071d17');
      this._g.addColorStop(0.5, '#0f3324');
      this._g.addColorStop(1, '#1d4a2b');
      this._gH = H;
    }
    ctx.fillStyle = this._g;
    ctx.fillRect(0, 0, W, H);
    // Luna pálida
    ctx.fillStyle = 'rgba(230,252,230,0.75)';
    ctx.beginPath(); ctx.arc(W * 0.2 - cam.x * 0.01 * s, H * 0.16, 46 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0b2a1f';
    ctx.beginPath(); ctx.arc(W * 0.2 - cam.x * 0.01 * s + 16 * s, H * 0.16 - 8 * s, 40 * s, 0, Math.PI * 2); ctx.fill();

    // Árboles gigantes lejanos (siluetas)
    const lejanos = decoracion('jungla-lejanos', (r) => Array.from({ length: 7 }, (_, i) => ({ x: i * 260 + r() * 120, w: 50 + r() * 40, h: 420 + r() * 180 })));
    capaParallax(ctx, W, cam.x, 0.12, 1800, s, (ox) => {
      ctx.fillStyle = '#0d3b2a';
      lejanos.forEach((a) => {
        const x = ox + a.x * s, base = H * 0.95;
        ctx.fillRect(x, base - a.h * s, a.w * s, a.h * s);
        ctx.beginPath(); ctx.ellipse(x + a.w * s / 2, base - a.h * s, a.w * 2.2 * s, 70 * s, 0, 0, Math.PI * 2); ctx.fill();
      });
    });

    // Plantas gigantes del medio (hojas grandes que se mecen)
    const medias = decoracion('jungla-medias', (r) => Array.from({ length: 6 }, (_, i) => ({ x: i * 330 + r() * 140, h: 260 + r() * 160, e: 0.9 + r() * 0.6, f: r() * 6 })));
    capaParallax(ctx, W, cam.x, 0.35, 2000, s, (ox) => {
      medias.forEach((p) => plantaGigante(ctx, ox + p.x * s, H * 0.98, p.h * s, p.e * s, '#164d33', '#1f6b45', '#2b8a5a', Math.sin(t * 0.8 + p.f)));
    });

    // Luciérnagas: puntitos amarillos que suben y bajan (sin brillo)
    const luces = decoracion('jungla-luces', (r) => Array.from({ length: 28 }, () => ({ x: r() * 1500, y: 120 + r() * 420, f: r() * 6, v: 0.5 + r() })));
    capaParallax(ctx, W, cam.x, 0.5, 1500, s, (ox) => {
      luces.forEach((l) => {
        const a = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.7 * l.v + l.f));
        ctx.globalAlpha = a;
        ctx.fillStyle = '#e9fac8';
        ctx.beginPath(); ctx.arc(ox + (l.x + Math.sin(t * l.v + l.f) * 20) * s, (l.y + Math.cos(t * 0.8 * l.v + l.f) * 14) * s, 3.2 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(216,245,106,0.35)';
        ctx.beginPath(); ctx.arc(ox + (l.x + Math.sin(t * l.v + l.f) * 20) * s, (l.y + Math.cos(t * 0.8 * l.v + l.f) * 14) * s, 7 * s, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    });

    // Neblina baja
    ctx.fillStyle = 'rgba(120,200,150,0.08)';
    ctx.fillRect(0, H * 0.78, W, H * 0.22);
  },

  suelo(ctx, m, t) {
    const y = m.sueloY;
    const v = U.rangoVisibleX(ctx);
    const izq = Math.max(-40, v.izq - 40), der = Math.min(m.ancho + 40, v.der + 40);
    // Tierra oscura
    if (!this._gt || this._gtY !== y) {
      this._gt = ctx.createLinearGradient(0, y, 0, y + 200);
      this._gt.addColorStop(0, '#3b2a1c');
      this._gt.addColorStop(1, '#1e150e');
      this._gtY = y;
    }
    ctx.fillStyle = this._gt;
    ctx.fillRect(izq, y + 6, der - izq, 300);
    // Musgo
    ctx.fillStyle = '#2f7a3a';
    ctx.fillRect(izq, y - 4, der - izq, 16);
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(izq, y - 4, der - izq, 5);
    // Raíces y hongos (se repiten cada 4700 px)
    const hongos = decoracion('jungla-hongos', (r) => Array.from({ length: 40 }, () => ({ x: r() * 4700, r: 7 + r() * 9, c: ['#e8590c', '#e64980', '#7950f2', '#fab005'][Math.floor(r() * 4)] })));
    const raices = decoracion('jungla-raices', (r) => Array.from({ length: 30 }, () => ({ x: r() * 4700, w: 40 + r() * 60, p: 20 + r() * 50 })));
    for (let off = 0; off < m.ancho; off += 4700) {
      if (off + 4800 < v.izq || off > v.der) continue;
      ctx.strokeStyle = 'rgba(90,60,35,0.8)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      raices.forEach((ra) => {
        const x = ra.x + off;
        if (!U.visibleX(v, x, ra.w)) return;
        ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.quadraticCurveTo(x + ra.w / 2, y + ra.p, x + ra.w, y + 14); ctx.stroke();
      });
      hongos.forEach((h) => { const x = h.x + off; if (U.visibleX(v, x, 20)) hongo(ctx, x, y, h.r, h.c); });
    }
    // Plataformas: troncos con musgo y una hoja encima
    m.plataformas.forEach((p) => {
      if (!U.visibleX(v, p.x, p.w)) return;
      ctx.fillStyle = '#5c3d24';
      U.rectRedondo(ctx, p.x - 4, p.y, p.w + 8, 24, 12); ctx.fill();
      ctx.fillStyle = '#7a5232';
      ctx.fillRect(p.x + 6, p.y + 8, p.w - 12, 3);
      ctx.fillStyle = '#d9b38c';
      ctx.beginPath(); ctx.ellipse(p.x - 2, p.y + 12, 6, 11, 0, 0, Math.PI * 2); ctx.ellipse(p.x + p.w + 2, p.y + 12, 6, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#40c057';
      U.rectRedondo(ctx, p.x - 6, p.y - 5, p.w + 12, 10, 5); ctx.fill();
      // Lianas colgando
      ctx.strokeStyle = '#2f9e44'; ctx.lineWidth = 3;
      for (let k = p.x + 20; k < p.x + p.w - 10; k += 46) {
        ctx.beginPath(); ctx.moveTo(k, p.y + 22); ctx.quadraticCurveTo(k + 6, p.y + 50, k, p.y + 70 + (k % 3) * 12); ctx.stroke();
      }
    });
  },

  // Plantas gigantes cercanas (detrás de los personajes, mismo plano del mundo)
  decorado(ctx, m) {
    const plantas = decoracion('jungla-cerca', (r) => Array.from({ length: 16 }, (_, i) => ({ x: 150 + i * 290 + r() * 140, h: 150 + r() * 120, e: 0.8 + r() * 0.5, f: r() * 6 })));
    const v = U.rangoVisibleX(ctx);
    const t = performance.now() / 1000;
    for (let off = 0; off < m.ancho; off += 4700) plantas.forEach((p0) => {
      const x = p0.x + off;
      if (x > m.ancho - 60 || !U.visibleX(v, x, 130)) return;
      plantaGigante(ctx, x, m.sueloY, p0.h, p0.e, '#2b6b3f', '#2f9e44', '#69db7c', Math.sin(t * 0.9 + p0.f));
    });
  },
};
