/* =====================================================================
   UTILIDADES: matemáticas, colisiones y números aleatorios con semilla
   ===================================================================== */
const U = {
  // Rango X del mundo que se ve en pantalla (con la cámara ya aplicada al ctx).
  // Sirve para no dibujar lo que está fuera de la pantalla.
  rangoVisibleX(ctx, margen = 120) {
    const m = ctx.getTransform();
    const a = m.a || 1;
    const x1 = (0 - m.e) / a, x2 = (ctx.canvas.width - m.e) / a;
    return { izq: Math.min(x1, x2) - margen, der: Math.max(x1, x2) + margen };
  },
  visibleX(v, x, ancho = 0) { return x + ancho >= v.izq && x - ancho <= v.der; },

  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  signo: (v) => (v < 0 ? -1 : 1),

  // Acerca "v" a "objetivo" sin pasarse, como máximo "paso"
  aproximar(v, objetivo, paso) {
    return v < objetivo ? Math.min(v + paso, objetivo) : Math.max(v - paso, objetivo);
  },

  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),

  rectChoca(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  },

  circuloRect(cx, cy, r, rc) {
    const px = U.clamp(cx, rc.x, rc.x + rc.w);
    const py = U.clamp(cy, rc.y, rc.y + rc.h);
    return (cx - px) * (cx - px) + (cy - py) * (cy - py) <= r * r;
  },

  // Rectángulo de colisión de una entidad (x = centro, y = pies)
  rectDe(e) {
    return { x: e.x - e.ancho / 2, y: e.y - e.alto, w: e.ancho, h: e.alto };
  },

  // Generador aleatorio con semilla (mulberry32). Útil para que la lógica
  // sea repetible (importante para el modo online).
  crearAleatorio(semilla) {
    let a = semilla >>> 0;
    const f = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.rango = (min, max) => min + f() * (max - min);
    return f;
  },

  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  // Rectángulo con esquinas redondeadas
  rectRedondo(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },
};
