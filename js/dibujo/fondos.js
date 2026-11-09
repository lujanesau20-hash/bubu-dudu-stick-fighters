/* =====================================================================
   FONDOS CON PARALLAX (dibujados por código)
   Cada escenario tiene:
     fondo(ctx, cam, W, H, t)  -> capas lejanas en pantalla (parallax)
     suelo(ctx, mundo, t)      -> suelo y plataformas (coordenadas del mundo)
   Para agregar un escenario, crea FONDOS.<id> con esas dos funciones.
   ===================================================================== */

// Dibuja una capa repetida que se mueve a una fracción "f" de la cámara
function capaParallax(ctx, W, camX, f, periodo, s, dibujarTile) {
  const P = periodo * s;
  const desplaz = -(((camX * f * s) % P) + P) % P;
  for (let x = desplaz - P; x < W + P; x += P) dibujarTile(x, Math.round((x - desplaz) / P));
}

// Decoración generada una sola vez (siempre igual gracias a la semilla)
const CACHE_FONDOS = {};
function decoracion(id, generar) {
  if (!CACHE_FONDOS[id]) CACHE_FONDOS[id] = generar(U.crearAleatorio(id.length * 977 + 13));
  return CACHE_FONDOS[id];
}

function nube(ctx, x, y, w, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.5, w * 0.16, 0, 0, Math.PI * 2);
  ctx.ellipse(x - w * 0.2, y - w * 0.08, w * 0.2, w * 0.15, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.08, y - w * 0.14, w * 0.24, w * 0.19, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.3, y - w * 0.05, w * 0.16, w * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Isla flotante (para fondo o plataformas): pasto arriba y roca colgando abajo
function islaFlotante(ctx, x, y, w, alturaRoca, colPasto, colTierra, colRoca, semilla = 1) {
  ctx.fillStyle = colRoca;
  ctx.beginPath();
  ctx.moveTo(x, y + 8);
  const n = 5;
  for (let i = 0; i <= n; i++) {
    const px = x + (w * i) / n;
    const prof = alturaRoca * (1 - Math.abs(i / n - 0.5) * 1.6) * (0.8 + ((semilla * (i + 3)) % 7) / 20);
    ctx.lineTo(px, y + 8 + Math.max(10, prof));
  }
  ctx.lineTo(x + w, y + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colTierra;
  U.rectRedondo(ctx, x - 4, y, w + 8, 22, 9);
  ctx.fill();
  ctx.fillStyle = colPasto;
  U.rectRedondo(ctx, x - 8, y - 6, w + 16, 15, 8);
  ctx.fill();
}

const FONDOS = {
  isla: {
    fondo(ctx, cam, W, H, t) {
      const s = H / 720;
      // Cielo
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#4fb3f6');
      g.addColorStop(0.55, '#a8e1ff');
      g.addColorStop(1, '#ffe3c2');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // Sol
      const sx = W * 0.78 - cam.x * 0.01 * s, sy = H * 0.2;
      const gs = ctx.createRadialGradient(sx, sy, 10 * s, sx, sy, 170 * s);
      gs.addColorStop(0, 'rgba(255,250,210,1)');
      gs.addColorStop(0.25, 'rgba(255,240,170,0.8)');
      gs.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = gs;
      ctx.beginPath(); ctx.arc(sx, sy, 170 * s, 0, Math.PI * 2); ctx.fill();

      // Nubes lejanas (se mueven solas)
      const nubes = decoracion('isla-nubes', (r) => Array.from({ length: 6 }, () => ({ x: r() * 1400, y: 60 + r() * 220, w: 120 + r() * 160 })));
      capaParallax(ctx, W, cam.x + t * 12, 0.06, 1400, s, (ox) => {
        nubes.forEach((n) => nube(ctx, ox + n.x * s, n.y * s, n.w * s, 'rgba(255,255,255,0.75)'));
      });

      // Islas lejanas (azuladas)
      const lejanas = decoracion('isla-lejanas', (r) => Array.from({ length: 4 }, (_, i) => ({ x: i * 420 + r() * 200, y: 300 + r() * 120, w: 120 + r() * 120 })));
      capaParallax(ctx, W, cam.x, 0.18, 1700, s, (ox) => {
        lejanas.forEach((l, i) => {
          const y = l.y * s + Math.sin(t * 0.5 + i) * 6 * s;
          islaFlotante(ctx, ox + l.x * s, y, l.w * s, 90 * s, '#9cc9d9', '#8fb3c4', '#8aa7bd', i + 2);
          // Arbolito
          ctx.fillStyle = '#8fbfcf';
          ctx.beginPath(); ctx.arc(ox + (l.x + l.w * 0.3) * s, y - 20 * s, 18 * s, 0, Math.PI * 2); ctx.fill();
        });
      });

      // Islas medianas con cascadas
      const medias = decoracion('isla-medias', (r) => Array.from({ length: 3 }, (_, i) => ({ x: i * 650 + r() * 250, y: 360 + r() * 110, w: 200 + r() * 140 })));
      capaParallax(ctx, W, cam.x, 0.4, 2000, s, (ox) => {
        medias.forEach((l, i) => {
          const x = ox + l.x * s, y = l.y * s + Math.sin(t * 0.7 + i * 2) * 8 * s, w = l.w * s;
          // Cascada
          const gc = ctx.createLinearGradient(0, y, 0, y + 260 * s);
          gc.addColorStop(0, 'rgba(210,240,255,0.9)');
          gc.addColorStop(1, 'rgba(210,240,255,0)');
          ctx.fillStyle = gc;
          ctx.fillRect(x + w * 0.7, y + 8 * s, 14 * s, 260 * s);
          islaFlotante(ctx, x, y, w, 120 * s, '#6fc46a', '#9b7653', '#7f6a5c', i + 5);
          // Árboles
          ctx.fillStyle = '#3f9a4a';
          for (let k = 0; k < 3; k++) {
            const tx = x + w * (0.15 + k * 0.22);
            ctx.fillStyle = '#6d4c35';
            ctx.fillRect(tx - 3 * s, y - 30 * s, 6 * s, 30 * s);
            ctx.fillStyle = k % 2 ? '#4caf50' : '#3f9a4a';
            ctx.beginPath(); ctx.arc(tx, y - 38 * s, 20 * s, 0, Math.PI * 2); ctx.fill();
          }
        });
      });

      // Mar de nubes abajo
      capaParallax(ctx, W, cam.x + t * 20, 0.6, 900, s, (ox) => {
        for (let k = 0; k < 5; k++) nube(ctx, ox + k * 190 * s, H * 0.97 + (k % 2) * 14 * s, 300 * s, 'rgba(255,255,255,0.9)');
      });
    },

    suelo(ctx, m, t) {
      const y = m.sueloY;
      const izq = -40, der = m.ancho + 40;
      // Roca colgando bajo la isla principal
      ctx.fillStyle = '#7a6656';
      ctx.beginPath();
      ctx.moveTo(izq, y + 20);
      for (let x = izq; x <= der; x += 120) {
        const prof = 260 + Math.sin(x * 0.013) * 60 + Math.sin(x * 0.037) * 30;
        ctx.lineTo(x, y + prof);
      }
      ctx.lineTo(der, y + 20);
      ctx.fill();
      // Tierra
      const gt = ctx.createLinearGradient(0, y, 0, y + 140);
      gt.addColorStop(0, '#a5784f');
      gt.addColorStop(1, '#7e5b3e');
      ctx.fillStyle = gt;
      ctx.fillRect(izq, y + 6, der - izq, 120);
      // Piedritas en la tierra
      const piedras = decoracion('isla-piedras', (r) => Array.from({ length: 70 }, () => ({ x: r() * 4800, y: 30 + r() * 80, r: 4 + r() * 8 })));
      ctx.fillStyle = 'rgba(80,55,35,0.45)';
      // (la decoración se repite cada 4700 px para los niveles más largos)
      for (let off = 0; off < m.ancho; off += 4700) {
        piedras.forEach((p) => { ctx.beginPath(); ctx.ellipse(p.x + off, y + p.y, p.r * 1.4, p.r, 0, 0, Math.PI * 2); ctx.fill(); });
      }
      // Pasto
      ctx.fillStyle = '#5dbb4f';
      ctx.fillRect(izq, y - 4, der - izq, 18);
      ctx.fillStyle = '#7bd862';
      ctx.fillRect(izq, y - 4, der - izq, 6);
      // Matas de pasto y flores
      const matas = decoracion('isla-matas', (r) => Array.from({ length: 140 }, () => ({ x: r() * 4700, h: 8 + r() * 12, flor: r() < 0.25, c: r() < 0.5 ? '#ff7aa8' : '#ffe066' })));
      for (let off = 0; off < m.ancho; off += 4700) {
        ctx.save();
        ctx.translate(off, 0);
        matas.forEach((p) => {
          ctx.fillStyle = '#4caa45';
          const bal = Math.sin(t * 2 + p.x) * 2;
          ctx.beginPath();
          ctx.moveTo(p.x - 6, y); ctx.lineTo(p.x + bal, y - p.h); ctx.lineTo(p.x + 6, y);
          ctx.fill();
          if (p.flor) { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x + bal, y - p.h, 4, 0, Math.PI * 2); ctx.fill(); }
        });
        ctx.restore();
      }
      // Plataformas: pequeñas islas flotantes
      m.plataformas.forEach((p, i) => islaFlotante(ctx, p.x, p.y, p.w, 90, '#6cc85a', '#a07450', '#7d6858', i + 1));
    },

    // Árboles del fondo cercano (detrás de los personajes, mismo plano del mundo)
    decorado(ctx, m) {
      const arboles = decoracion('isla-arboles', (r) => Array.from({ length: 22 }, (_, i) => ({ x: 120 + i * 210 + r() * 120, h: 110 + r() * 80, c: r() < 0.5 ? '#3f9a4a' : '#4caf50' })));
      for (let off = 0; off < m.ancho; off += 4700) arboles.forEach((a0) => {
        const a = off ? { ...a0, x: a0.x + off } : a0;
        if (a.x > m.ancho - 60) return;
        const y = m.sueloY;
        ctx.fillStyle = '#6d4c35';
        ctx.fillRect(a.x - 8, y - a.h, 16, a.h);
        ctx.fillStyle = a.c;
        ctx.beginPath();
        ctx.arc(a.x, y - a.h - 10, 46, 0, Math.PI * 2);
        ctx.arc(a.x - 34, y - a.h + 14, 32, 0, Math.PI * 2);
        ctx.arc(a.x + 34, y - a.h + 14, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.arc(a.x - 14, y - a.h - 24, 20, 0, Math.PI * 2); ctx.fill();
      });
    },
  },
};
