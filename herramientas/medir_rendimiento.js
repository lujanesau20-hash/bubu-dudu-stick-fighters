/* =====================================================================
   MEDIR RENDIMIENTO (herramienta, no forma parte del juego)
   Uso en la consola del navegador con el juego abierto:
     await fetch('herramientas/medir_rendimiento.js').then(r => r.text()).then(eval);
     medirRendimiento({ enemigos: 15 })
   Pone muchos enemigos juntos, lanza Cataclismo y luego Torbellino y cuenta,
   por cuadro, el trabajo que más pesa en un celular:
     - operaciones de dibujo (trazos, textos, sombras borrosas, save/restore)
     - objetos nuevos (partículas, textos, anillos) creados en ese cuadro
     - tiempo de CPU de la simulación y del dibujo
   ===================================================================== */
function medirRendimiento({ enemigos = 15, cuadros = 240, escenario = 'isla-5', semilla = 3 } = {}) {
  const juego = Juego;
  const m = new Mundo({ modo: 'solo', personajes: ['bubu'], escenario, semilla });
  const j = m.jugadores[0];
  const tipos = ['normal', 'espadachin', 'arquero', 'ninja', 'mago', 'ave'];
  for (let i = 0; i < enemigos; i++) {
    const e = new Enemigo(m, tipos[i % tipos.length], j.x + 60 + (i % 8) * 28, m.sueloY);
    e.vidaMax = e.vida = 100000; // que no mueran: peor caso de golpes repetidos
    m.enemigos.push(e);
  }
  const efectos = new Efectos(juego.camara);
  const cam = juego.camara;
  cam.saltarA(m, juego.render.anchoBase);
  const ctx = juego.render.ctx;
  const equipos = { bubu: Guardado.equipo('bubu'), dudu: Guardado.equipo('dudu') };

  // Contador de operaciones de dibujo
  const P = CanvasRenderingContext2D.prototype;
  const nombres = ['fill', 'stroke', 'fillRect', 'fillText', 'strokeText', 'save', 'drawImage'];
  const orig = {};
  const cuenta = { sombra: 0 };
  nombres.forEach((n) => {
    orig[n] = P[n];
    P[n] = function (...a) { cuenta[n] = (cuenta[n] || 0) + 1; if (this.shadowBlur > 0 && n !== 'save') cuenta.sombra++; return orig[n].apply(this, a); };
  });

  const total = { sim: 0, dibujo: 0 };
  let peor = null, eventosCombo = [];
  try {
    for (let f = 0; f < cuadros; f++) {
      const c = new EstadoControl();
      j.energia = CONFIG.energia.max; j.vida = j.vidaMax;
      j.enfriamientos.fill(0);
      if (j.enfriamientosCombo) j.enfriamientosCombo.fill(0);
      if (f === 10) c.combo = [2, 3];          // Cataclismo
      if (f === 130) c.combo = [1, 2];         // Torbellino
      for (const k in cuenta) cuenta[k] = 0;
      let a = performance.now();
      m.actualizar(1 / 60, [c]);
      total.sim += performance.now() - a;
      for (const e of m.eventos) if (e.tipo === 'combo') eventosCombo.push(e.nombre + '@' + f);
      const antes = efectos.particulas.length + efectos.textos.length + efectos.anillos.length;
      efectos.procesar(m.eventos, m);
      const nuevos = Math.max(0, efectos.particulas.length + efectos.textos.length + efectos.anillos.length - antes);
      m.eventos.length = 0;
      efectos.actualizar(1 / 60); cam.actualizar(1 / 60, m, juego.render.anchoBase);
      a = performance.now();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      juego.render.dibujarMundo(m, cam, efectos, f / 60, equipos);
      efectos.dibujarPantalla(ctx, juego.render.W, juego.render.H);
      juego.hud.actualizar(1 / 60, m); juego.hud.dibujar(ctx, m, juego.render.W, juego.render.H, efectos, false);
      const msDibujo = performance.now() - a;
      total.dibujo += msDibujo;
      const ops = (cuenta.fill || 0) + (cuenta.stroke || 0) + (cuenta.fillRect || 0) + (cuenta.fillText || 0) + (cuenta.strokeText || 0) + (cuenta.drawImage || 0);
      const fila = { cuadro: f, ops, textos: (cuenta.fillText || 0) + (cuenta.strokeText || 0), sombras: cuenta.sombra, save: cuenta.save || 0,
        nuevos, particulas: efectos.particulas.length, textosVivos: efectos.textos.length, msDibujo: Math.round(msDibujo * 100) / 100 };
      if (!peor || fila.ops > peor.ops) peor = fila;
    }
  } finally {
    nombres.forEach((n) => { P[n] = orig[n]; });
  }
  const r = (v) => Math.round(v * 100) / 100;
  return { combos: eventosCombo, simMsPorCuadro: r(total.sim / cuadros), dibujoMsPorCuadro: r(total.dibujo / cuadros), peorCuadro: peor };
}
