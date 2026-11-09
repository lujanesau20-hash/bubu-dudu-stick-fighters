/* =====================================================================
   FONDOS DE LOS NIVELES 2, 3 Y 4 (parallax dibujado por código)
   Usa las ayudas de fondos.js: capaParallax, decoracion, nube.
   ===================================================================== */

// Nube "sólida" con base plana (suelo y plataformas del cielo)
function nubeSolida(ctx, x, y, w, alto, colorArriba, colorAbajo, semilla = 1) {
  const g = ctx.createLinearGradient(0, y - 20, 0, y + alto);
  g.addColorStop(0, colorArriba);
  g.addColorStop(1, colorAbajo);
  ctx.fillStyle = g;
  ctx.beginPath();
  const n = Math.max(3, Math.round(w / 55));
  for (let i = 0; i <= n; i++) {
    const cx = x + (w * i) / n;
    const r = 22 + ((semilla * (i + 7)) % 5) * 5;
    ctx.moveTo(cx + r, y + 8);
    ctx.arc(cx, y + 8, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + alto * 0.45, w * 0.55, alto * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
}

Object.assign(FONDOS, {
  // ======================= CIELO =======================
  cielo: {
    fondo(ctx, cam, W, H, t) {
      const s = H / 720;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#5aa9f0');
      g.addColorStop(0.5, '#a9d6ff');
      g.addColorStop(0.85, '#ffd3e6');
      g.addColorStop(1, '#ffe8c9');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // Sol grande y suave
      const sx = W * 0.25 - cam.x * 0.01 * s, sy = H * 0.22;
      const gs = ctx.createRadialGradient(sx, sy, 10 * s, sx, sy, 200 * s);
      gs.addColorStop(0, 'rgba(255,250,220,1)');
      gs.addColorStop(0.3, 'rgba(255,236,180,0.7)');
      gs.addColorStop(1, 'rgba(255,236,180,0)');
      ctx.fillStyle = gs;
      ctx.beginPath(); ctx.arc(sx, sy, 200 * s, 0, Math.PI * 2); ctx.fill();
      // Arcoíris lejano
      const ax = W * 0.75 - cam.x * 0.04 * s, ay = H * 0.95;
      ['#ff8787', '#ffc078', '#ffe066', '#8ce99a', '#74c0fc', '#b197fc'].forEach((c, i) => {
        ctx.strokeStyle = c; ctx.globalAlpha = 0.28; ctx.lineWidth = 14 * s;
        ctx.beginPath(); ctx.arc(ax, ay, (380 - i * 14) * s, Math.PI, 0); ctx.stroke();
      });
      ctx.globalAlpha = 1;
      // Bancos de nubes lejanos
      const lejos = decoracion('cielo-lejos', (r) => Array.from({ length: 7 }, () => ({ x: r() * 1600, y: 120 + r() * 260, w: 200 + r() * 220 })));
      capaParallax(ctx, W, cam.x + t * 8, 0.06, 1600, s, (ox) => {
        lejos.forEach((n) => nube(ctx, ox + n.x * s, n.y * s, n.w * s, 'rgba(255,255,255,0.55)'));
      });
      // Pájaros
      const pajaros = decoracion('cielo-pajaros', (r) => Array.from({ length: 5 }, () => ({ x: r() * 1400, y: 90 + r() * 180, f: r() * 6 })));
      capaParallax(ctx, W, cam.x - t * 40, 0.15, 1400, s, (ox) => {
        ctx.strokeStyle = 'rgba(60,70,100,0.6)'; ctx.lineWidth = 2 * s;
        pajaros.forEach((p) => {
          const x = ox + p.x * s, y = p.y * s, a = Math.sin(t * 8 + p.f) * 5 * s;
          ctx.beginPath(); ctx.moveTo(x - 9 * s, y - a); ctx.quadraticCurveTo(x - 4 * s, y - 4 * s, x, y); ctx.quadraticCurveTo(x + 4 * s, y - 4 * s, x + 9 * s, y - a); ctx.stroke();
        });
      });
      // Nubes medianas
      const medias = decoracion('cielo-medias', (r) => Array.from({ length: 5 }, () => ({ x: r() * 1800, y: 260 + r() * 220, w: 220 + r() * 200 })));
      capaParallax(ctx, W, cam.x + t * 14, 0.3, 1800, s, (ox) => {
        medias.forEach((n) => nube(ctx, ox + n.x * s, n.y * s, n.w * s, 'rgba(255,255,255,0.85)'));
      });
      // Mar de nubes rosado abajo
      capaParallax(ctx, W, cam.x + t * 22, 0.6, 900, s, (ox) => {
        for (let k = 0; k < 5; k++) nube(ctx, ox + k * 190 * s, H * 0.98 + (k % 2) * 12 * s, 320 * s, 'rgba(255,236,245,0.95)');
      });
    },

    suelo(ctx, m, t) {
      const y = m.sueloY;
      // Gran nube como suelo
      const g = ctx.createLinearGradient(0, y - 20, 0, y + 260);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, '#eef3ff');
      g.addColorStop(1, '#c9cff0');
      ctx.fillStyle = g;
      ctx.fillRect(-40, y + 6, m.ancho + 80, 300);
      ctx.beginPath();
      const v = U.rangoVisibleX(ctx);
      for (let x = Math.max(-40, -40 + Math.floor((v.izq + 40) / 46) * 46); x <= Math.min(m.ancho + 40, v.der); x += 46) {
        const r = 26 + Math.sin(x * 0.07) * 6;
        ctx.moveTo(x + r, y + 10);
        ctx.arc(x, y + 10, r, Math.PI, 0);
      }
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      // Brillos dorados (polvo de estrellas) en la nube
      const brillos = decoracion('cielo-brillos', (r) => Array.from({ length: 60 }, () => ({ x: r() * 4700, y: 40 + r() * 160, f: r() * 6 })));
      brillos.forEach((b) => {
        if (!U.visibleX(v, b.x, 4)) return;
        ctx.globalAlpha = 0.3 + Math.abs(Math.sin(t * 2 + b.f)) * 0.5;
        ctx.fillStyle = '#ffe066';
        ctx.fillRect(b.x, y + b.y, 3, 3);
      });
      ctx.globalAlpha = 1;
      // Plataformas: nubes pequeñas
      m.plataformas.forEach((p, i) => { if (U.visibleX(v, p.x, p.w)) nubeSolida(ctx, p.x, p.y, p.w, 46, '#ffffff', '#d7ddf7', i + 2); });
    },

    // Columnas de un templo en las nubes (detrás de los personajes)
    decorado(ctx, m) {
      const cols = decoracion('cielo-columnas', (r) => Array.from({ length: 12 }, (_, i) => ({ x: 260 + i * 380 + r() * 140, h: 120 + r() * 120, rota: r() < 0.3 })));
      const v = U.rangoVisibleX(ctx);
      cols.forEach((c) => {
        if (c.x > m.ancho - 80 || !U.visibleX(v, c.x, 30)) return;
        const y = m.sueloY;
        const h = c.rota ? c.h * 0.55 : c.h;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillRect(c.x - 16, y - h, 32, h);
        ctx.fillStyle = 'rgba(200,205,235,0.8)';
        for (let k = -10; k <= 10; k += 10) ctx.fillRect(c.x + k - 1, y - h + 10, 2, h - 14);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(c.x - 24, y - h - 10, 48, 12);
        if (!c.rota) ctx.fillRect(c.x - 22, y - 10, 44, 10);
      });
    },
  },

  // ======================= ESPACIO =======================
  espacio: {
    fondo(ctx, cam, W, H, t) {
      const s = H / 720;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#04020d');
      g.addColorStop(0.6, '#140a2e');
      g.addColorStop(1, '#2a1550');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // Nebulosas
      const nebs = decoracion('esp-nebs', (r) => Array.from({ length: 4 }, () => ({ x: r() * 1800, y: 100 + r() * 400, r: 180 + r() * 160, c: r() < 0.5 ? '180,90,255' : '60,150,255' })));
      capaParallax(ctx, W, cam.x, 0.03, 1800, s, (ox) => {
        nebs.forEach((n) => {
          const gx = ctx.createRadialGradient(ox + n.x * s, n.y * s, 0, ox + n.x * s, n.y * s, n.r * s);
          gx.addColorStop(0, `rgba(${n.c},0.28)`);
          gx.addColorStop(1, `rgba(${n.c},0)`);
          ctx.fillStyle = gx;
          ctx.beginPath(); ctx.arc(ox + n.x * s, n.y * s, n.r * s, 0, Math.PI * 2); ctx.fill();
        });
      });
      // Estrellas que titilan
      const estrellas = decoracion('esp-estrellas', (r) => Array.from({ length: 140 }, () => ({ x: r() * 1600, y: r() * 680, t: r() * 2 + 0.5, f: r() * 6 })));
      capaParallax(ctx, W, cam.x, 0.02, 1600, s, (ox) => {
        estrellas.forEach((e) => {
          ctx.globalAlpha = 0.45 + Math.abs(Math.sin(t * 1.5 + e.f)) * 0.55;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(ox + e.x * s, e.y * s, e.t * s, e.t * s);
        });
      });
      ctx.globalAlpha = 1;
      // Planeta con anillo
      const px = W * 0.72 - cam.x * 0.06 * s, py = H * 0.3, pr = 120 * s;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,214,150,0.7)'; ctx.lineWidth = 10 * s;
      ctx.beginPath(); ctx.ellipse(px, py, pr * 1.8, pr * 0.45, -0.3, Math.PI, Math.PI * 2); ctx.stroke();
      const gp = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.2, px, py, pr);
      gp.addColorStop(0, '#ffd8a8'); gp.addColorStop(0.6, '#e8590c'); gp.addColorStop(1, '#5c1d0b');
      ctx.fillStyle = gp;
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(px - pr, py - pr * 0.2, pr * 2, pr * 0.12);
      ctx.beginPath(); ctx.ellipse(px, py, pr * 1.8, pr * 0.45, -0.3, 0, Math.PI); ctx.stroke();
      ctx.restore();
      // Luna pequeña
      const lx = W * 0.2 - cam.x * 0.12 * s, ly = H * 0.18;
      ctx.fillStyle = '#ced4da';
      ctx.beginPath(); ctx.arc(lx, ly, 34 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.arc(lx - 8 * s, ly - 6 * s, 7 * s, 0, Math.PI * 2); ctx.arc(lx + 10 * s, ly + 8 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
      // Asteroides que flotan
      const rocas = decoracion('esp-rocas', (r) => Array.from({ length: 8 }, () => ({ x: r() * 1500, y: 260 + r() * 300, r: 10 + r() * 26, f: r() * 6 })));
      capaParallax(ctx, W, cam.x, 0.35, 1500, s, (ox) => {
        rocas.forEach((a) => {
          ctx.save();
          ctx.translate(ox + a.x * s, a.y * s + Math.sin(t + a.f) * 6 * s);
          ctx.rotate(t * 0.2 + a.f);
          ctx.fillStyle = '#5c5470';
          ctx.beginPath();
          for (let k = 0; k < 7; k++) { const an = (k / 7) * Math.PI * 2, rr = a.r * s * (0.8 + ((k * 13 + a.f * 10) % 4) / 10); ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
          ctx.fill();
          ctx.restore();
        });
      });
    },

    suelo(ctx, m, t) {
      const y = m.sueloY;
      // Superficie de un asteroide gigante
      const g = ctx.createLinearGradient(0, y, 0, y + 260);
      g.addColorStop(0, '#8d86a6');
      g.addColorStop(0.2, '#5f5878');
      g.addColorStop(1, '#2b2540');
      ctx.fillStyle = g;
      ctx.fillRect(-40, y, m.ancho + 80, 300);
      ctx.fillStyle = '#a9a3c4';
      ctx.fillRect(-40, y - 2, m.ancho + 80, 8);
      // Cráteres
      const crat = decoracion('esp-crateres', (r) => Array.from({ length: 45 }, () => ({ x: r() * 4700, y: 30 + r() * 120, r: 8 + r() * 26 })));
      const v = U.rangoVisibleX(ctx);
      crat.forEach((c) => {
        if (!U.visibleX(v, c.x, 60)) return;
        ctx.fillStyle = 'rgba(30,25,50,0.45)';
        ctx.beginPath(); ctx.ellipse(c.x, y + c.y, c.r * 1.5, c.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(200,195,230,0.25)';
        ctx.beginPath(); ctx.ellipse(c.x, y + c.y - c.r * 0.25, c.r * 1.3, c.r * 0.3, 0, Math.PI, Math.PI * 2); ctx.fill();
      });
      // Plataformas metálicas flotantes con luces
      m.plataformas.forEach((p, i) => {
        if (!U.visibleX(v, p.x, p.w)) return;
        ctx.fillStyle = '#495057';
        U.rectRedondo(ctx, p.x - 4, p.y, p.w + 8, 18, 6); ctx.fill();
        ctx.fillStyle = '#868e96';
        ctx.fillRect(p.x, p.y, p.w, 5);
        ctx.fillStyle = '#343a40';
        ctx.beginPath(); ctx.moveTo(p.x + 20, p.y + 18); ctx.lineTo(p.x + p.w / 2, p.y + 46); ctx.lineTo(p.x + p.w - 20, p.y + 18); ctx.fill();
        // Propulsor
        const llama = 10 + Math.sin(t * 20 + i) * 4;
        const gl = ctx.createLinearGradient(0, p.y + 44, 0, p.y + 44 + llama * 2);
        gl.addColorStop(0, 'rgba(99,230,255,0.9)'); gl.addColorStop(1, 'rgba(99,230,255,0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.moveTo(p.x + p.w / 2 - 7, p.y + 44); ctx.lineTo(p.x + p.w / 2, p.y + 44 + llama * 2); ctx.lineTo(p.x + p.w / 2 + 7, p.y + 44); ctx.fill();
        // Luces del borde
        for (let k = p.x + 12; k < p.x + p.w - 6; k += 28) {
          ctx.fillStyle = Math.floor(t * 3 + k / 28) % 2 ? '#63e6ff' : '#1c7ed6';
          ctx.fillRect(k, p.y + 9, 6, 4);
        }
      });
    },

    // Antenas y balizas sobre el asteroide
    decorado(ctx, m) {
      const ant = decoracion('esp-antenas', (r) => Array.from({ length: 10 }, (_, i) => ({ x: 300 + i * 450 + r() * 160, h: 90 + r() * 90 })));
      const t = performance.now() / 1000;
      const v = U.rangoVisibleX(ctx);
      ant.forEach((a) => {
        if (a.x > m.ancho - 80 || !U.visibleX(v, a.x, 30)) return;
        const y = m.sueloY;
        ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(a.x, y); ctx.lineTo(a.x, y - a.h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(a.x - 18, y); ctx.lineTo(a.x, y - 30); ctx.lineTo(a.x + 18, y); ctx.stroke();
        ctx.fillStyle = Math.floor(t * 2 + a.x) % 2 ? '#ff6b6b' : '#7a1f1f';
        ctx.beginPath(); ctx.arc(a.x, y - a.h - 4, 6, 0, Math.PI * 2); ctx.fill();
      });
    },
  },

  // ======================= CIUDAD =======================
  ciudad: {
    fondo(ctx, cam, W, H, t) {
      const s = H / 720;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#2b2160');
      g.addColorStop(0.45, '#7b3f8c');
      g.addColorStop(0.75, '#f0866b');
      g.addColorStop(1, '#ffc285');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // Luna
      const mx = W * 0.8 - cam.x * 0.01 * s, my = H * 0.17;
      ctx.fillStyle = 'rgba(255,245,220,0.95)';
      ctx.beginPath(); ctx.arc(mx, my, 46 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,245,220,0.15)';
      ctx.beginPath(); ctx.arc(mx, my, 80 * s, 0, Math.PI * 2); ctx.fill();
      // Tres capas de edificios: lejos (claros) -> cerca (oscuros)
      const capa = (id, f, periodo, colorEdif, base, altMin, altMax, ventanas) => {
        const edif = decoracion(id, (r) => {
          const lista = []; let x = 0;
          while (x < periodo) { const w = 60 + r() * 90; lista.push({ x, w, h: altMin + r() * (altMax - altMin), sem: r() }); x += w + r() * 14; }
          return lista;
        });
        capaParallax(ctx, W, cam.x, f, periodo, s, (ox) => {
          edif.forEach((e) => {
            const x = ox + e.x * s, w = e.w * s, h = e.h * s, y = H * base - h;
            ctx.fillStyle = colorEdif;
            ctx.fillRect(x, y, w, h + H);
            if (e.sem > 0.7) ctx.fillRect(x + w * 0.45, y - 22 * s, 3 * s, 22 * s); // antena
            if (!ventanas) return;
            for (let vy = y + 10 * s; vy < H * base - 8 * s; vy += 16 * s) {
              for (let vx = x + 7 * s; vx < x + w - 9 * s; vx += 13 * s) {
                const enc = ((Math.floor(vx / s) * 7 + Math.floor(vy / s) * 13 + Math.floor(e.sem * 100)) % 10) < 4;
                if (!enc) continue;
                ctx.fillStyle = ventanas;
                ctx.fillRect(vx, vy, 6 * s, 8 * s);
              }
            }
          });
        });
      };
      capa('ciu-lejos', 0.08, 1400, '#5a3d7a', 0.86, 160, 340, 'rgba(255,220,150,0.35)');
      capa('ciu-medio', 0.25, 1600, '#3d2a5c', 0.9, 120, 300, 'rgba(255,214,120,0.6)');
      capa('ciu-cerca', 0.5, 1800, '#231a38', 0.95, 90, 220, 'rgba(255,200,90,0.75)');
    },

    suelo(ctx, m, t) {
      const y = m.sueloY;
      // Acera
      ctx.fillStyle = '#868e96';
      ctx.fillRect(-40, y - 2, m.ancho + 80, 26);
      ctx.fillStyle = '#adb5bd';
      ctx.fillRect(-40, y - 2, m.ancho + 80, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      const v = U.rangoVisibleX(ctx);
      for (let x = Math.max(0, Math.floor(v.izq / 70) * 70); x < Math.min(m.ancho, v.der); x += 70) ctx.fillRect(x, y + 3, 2, 21);
      // Bordillo y asfalto
      ctx.fillStyle = '#495057';
      ctx.fillRect(-40, y + 24, m.ancho + 80, 8);
      ctx.fillStyle = '#2b2d33';
      ctx.fillRect(-40, y + 32, m.ancho + 80, 300);
      // Línea amarilla discontinua
      ctx.fillStyle = '#fcc419';
      for (let x = Math.max(0, Math.floor(v.izq / 120) * 120); x < Math.min(m.ancho, v.der); x += 120) ctx.fillRect(x, y + 92, 60, 7);
      // Plataformas: toldos de tiendas a rayas
      const colores = [['#e03131', '#fff5f5'], ['#1971c2', '#e7f5ff'], ['#2f9e44', '#ebfbee'], ['#f08c00', '#fff9db']];
      m.plataformas.forEach((p, i) => {
        if (!U.visibleX(v, p.x, p.w)) return;
        const [c1, c2] = colores[i % colores.length];
        const rayas = Math.max(4, Math.round(p.w / 22));
        for (let k = 0; k < rayas; k++) {
          ctx.fillStyle = k % 2 ? c2 : c1;
          ctx.beginPath();
          const x0 = p.x + (p.w * k) / rayas, x1 = p.x + (p.w * (k + 1)) / rayas;
          ctx.moveTo(x0, p.y); ctx.lineTo(x1, p.y); ctx.lineTo(x1 + 4, p.y + 22); ctx.lineTo(x0 + 4, p.y + 22); ctx.fill();
        }
        // Ondas del borde
        ctx.fillStyle = c1;
        for (let k = 0; k < rayas; k++) {
          const cx = p.x + 4 + (p.w * (k + 0.5)) / rayas;
          ctx.beginPath(); ctx.arc(cx, p.y + 22, p.w / rayas / 2, 0, Math.PI); ctx.fill();
        }
        ctx.fillStyle = '#495057';
        ctx.fillRect(p.x - 2, p.y - 3, p.w + 4, 5);
      });
    },

    // Farolas encendidas y escaparates (detrás de los personajes)
    decorado(ctx, m) {
      const y = m.sueloY;
      const tiendas = decoracion('ciu-tiendas', (r) => Array.from({ length: 14 }, (_, i) => ({ x: 120 + i * 340 + r() * 60, w: 200 + r() * 60, c: ['#3b2f4f', '#2f3b4f', '#4f2f3b'][i % 3] })));
      const v = U.rangoVisibleX(ctx);
      tiendas.forEach((tn) => {
        if (tn.x > m.ancho - 100 || !U.visibleX(v, tn.x, tn.w)) return;
        ctx.fillStyle = tn.c;
        ctx.fillRect(tn.x, y - 230, tn.w, 230);
        ctx.fillStyle = 'rgba(255,214,140,0.55)';
        ctx.fillRect(tn.x + 18, y - 120, tn.w - 36, 80);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(tn.x + 18, y - 120, 18, 80);
        ctx.fillStyle = 'rgba(255,200,90,0.5)';
        for (let k = 0; k < 3; k++) ctx.fillRect(tn.x + 20 + k * (tn.w - 50) / 2, y - 205, 24, 30);
      });
      for (let x = 300; x < m.ancho - 50; x += 520) {
        ctx.fillStyle = '#343a40';
        ctx.fillRect(x - 4, y - 190, 8, 190);
        ctx.fillRect(x - 4, y - 190, 40, 6);
        const gl = ctx.createRadialGradient(x + 34, y - 180, 2, x + 34, y - 180, 90);
        gl.addColorStop(0, 'rgba(255,230,150,0.55)'); gl.addColorStop(1, 'rgba(255,230,150,0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(x + 34, y - 180, 90, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff3bf';
        ctx.beginPath(); ctx.arc(x + 34, y - 180, 7, 0, Math.PI * 2); ctx.fill();
      }
    },
  },
});
