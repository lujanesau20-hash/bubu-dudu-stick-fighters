/* =====================================================================
   RENDER: dibuja el mundo completo a partir del estado de la lógica.
   Orden: fondo parallax -> suelo -> monedas -> enemigos -> jefe ->
          jugadores -> proyectiles -> efectos -> HUD
   ===================================================================== */
class Render {
  constructor(lienzo) {
    this.lienzo = lienzo;
    this.ctx = lienzo.getContext('2d');
  }

  get W() { return this.lienzo.width; }
  get H() { return this.lienzo.height; }
  // ¿Encuadre de celular? En una pantalla más ancha que una laptop 16:10 se ve el MISMO
  // ancho de mundo que en la laptop (config/interfaz.js -> encuadreCelular). En laptop: no.
  get encuadreCelular() {
    const c = CONFIG.interfaz.encuadreCelular;
    return !!(c.activo && typeof Juego !== 'undefined' && Juego.esTactil && this.W / this.H > c.relacionLaptop);
  }
  // Alto del mundo visible con zoom 1 (720 en laptop; menos en un celular ancho)
  get altoVista() {
    return this.encuadreCelular ? (CONFIG.vista.alto * CONFIG.interfaz.encuadreCelular.relacionLaptop) / (this.W / this.H) : CONFIG.vista.alto;
  }
  // Ancho del mundo visible con zoom 1
  get anchoBase() { return (this.W / this.H) * this.altoVista; }

  dibujarFondo(escenario, cam, t) {
    const f = FONDOS[escenario] || FONDOS.isla;
    this.pintarFondo(f, cam, t);
  }

  // Fondo (parallax). En laptop, igual que siempre. En el encuadre de celular el fondo se arma
  // con la misma escala que en laptop (mismas islas y nubes a lo ancho) y se corre hacia arriba
  // para que su suelo coincida con el de la pantalla; acompaña un poco la subida de la cámara.
  pintarFondo(f, cam, t) {
    const ctx = this.ctx;
    if (!this.encuadreCelular) { f.fondo(ctx, cam, this.W, this.H, t); return; }
    const ce = CONFIG.interfaz.encuadreCelular, av = this.altoVista, k = this.H / av;
    const desplaz = (ce.sueloEnPantalla * (CONFIG.vista.alto - av) - (cam.subida || 0) * ce.paralajeFondo) * k;
    ctx.save();
    ctx.translate(0, -desplaz);
    f.fondo(ctx, cam, this.W, CONFIG.vista.alto * k, t);
    ctx.restore();
  }

  // Aplica la cámara: (x,y) del mundo en el centro de la pantalla
  aplicarCamara(cam) {
    const ctx = this.ctx;
    const esc = (this.H / this.altoVista) * cam.zoom;
    ctx.translate(this.W / 2 + cam.offX * esc, this.H / 2 + cam.offY * esc);
    ctx.scale(esc, esc);
    ctx.translate(-cam.x, -cam.y);
  }

  dibujarMundo(m, cam, efectos, t, equipos) {
    const ctx = this.ctx;
    const fondo = FONDOS[m.escenario.fondo] || FONDOS.isla;
    this.pintarFondo(fondo, cam, t);

    ctx.save();
    this.aplicarCamara(cam);
    if (fondo.decorado) fondo.decorado(ctx, m, t);
    fondo.suelo(ctx, m, t);

    // Barreras de la zona cerrada (oleada o jefe)
    if (m.limiteIzq > 0 || m.limiteDer < m.ancho) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(t * 6) * 0.15;
      ctx.fillStyle = '#ff4d6d';
      if (m.limiteIzq > 0) ctx.fillRect(m.limiteIzq - 6, m.sueloY - 700, 6, 700);
      if (m.limiteDer < m.ancho) ctx.fillRect(m.limiteDer, m.sueloY - 700, 6, 700);
      ctx.restore();
    }

    // Lo que está fuera de la pantalla no se dibuja
    const v = U.rangoVisibleX(ctx);
    this.rangoVisible = v;

    // Monedas: las del suelo tienen "y" abajo y parpadean antes de desaparecer (como los corazones).
    // En el invitado no llega su tiempo: se cuenta desde que aparece en su pantalla.
    const bm = BALANCE.monedas;
    // Más grandes en celular (config/interfaz.js -> monedas); en laptop, como siempre
    const rm = (typeof Juego !== 'undefined' && Juego.esTactil) ? CONFIG.interfaz.monedas.radioCelular : CONFIG.interfaz.monedas.radioLaptop;
    for (const c of m.monedas) {
      if (!U.visibleX(v, c.x, rm + 2) || !U.visibleY(v, c.y, rm + 10)) continue;
      const enSuelo = !c.iman;
      if (enSuelo) {
        if (c.t == null && c._t0 == null) c._t0 = t;
        const edad = c.t != null ? c.t : t - c._t0;
        if (bm.duracionMonedaSuelo - edad < bm.parpadeoMoneda && Math.floor(t * 8) % 2 === 0) continue;
      }
      const giro = Math.abs(Math.cos(t * 8 + c.x));
      // Del suelo: apoyada en el suelo. Del jefe (imán): nunca por debajo del suelo aunque sea grande
      const y = enSuelo ? c.y - rm : Math.min(c.y, m.sueloY - rm);
      ctx.fillStyle = '#ffcf33';
      ctx.strokeStyle = '#b8860b'; ctx.lineWidth = Math.max(2, rm / 8); // sin brillo: solo relleno y borde
      ctx.beginPath(); ctx.ellipse(c.x, y, rm * giro + 1, rm, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // Corazones de curación (parpadean al final)
    if (m.corazones) {
      const bc = BALANCE.corazones;
      for (const c of m.corazones) {
        const quedan = bc.duracion - c.t;
        if (quedan < bc.parpadeo && Math.floor(t * 8) % 2 === 0) continue;
        const flota = c.enSuelo ? Math.sin(t * 4 + c.x) * 4 : 0;
        dibujarCorazon(ctx, c.x, c.y - 16 + flota, 30, t);
      }
    }

    // Enemigos fuera de cámara (a los lados, o todavía arriba cayendo) no se dibujan
    for (const e of m.enemigos) if (U.visibleX(v, e.x, 80) && e.y >= v.arriba - 20 && e.y - 260 <= v.abajo) dibujarStickman(ctx, e, t);
    if (m.jefe) dibujarStickman(ctx, m.jefe, t);

    const etiquetas = m.jugadores.length > 1;
    // Primero los caídos (quedan detrás); sin crear listas nuevas en cada cuadro
    for (let pasada = 0; pasada < 2; pasada++) {
      for (const j of m.jugadores) {
        if ((j.vivo ? 1 : 0) !== pasada) continue;
        if (j.ausente) continue; // en línea: el invitado se desconectó y el anfitrión sigue solo
        dibujarJugador(ctx, j, t, equipos[j.personaje], etiquetas);
      }
    }

    for (const p of m.proyectiles) if (U.visibleX(v, p.x, 120) && U.visibleY(v, p.y, 120)) this.dibujarProyectil(p, t);
    efectos.dibujarMundo(ctx, m);
    ctx.restore();
  }

  dibujarProyectil(p, t) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    const dir = p.vx >= 0 ? 1 : -1;
    switch (p.tipo) {
      case 'cuchilla':
        ctx.rotate(p.rot * dir);
        ctx.fillStyle = '#e8eef7';
        ctx.strokeStyle = '#5c6b7a'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -16); ctx.lineTo(5, 0); ctx.lineTo(0, 16); ctx.lineTo(-5, 0); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#8b5a2b'; ctx.fillRect(-3, -3, 6, 6);
        break;
      case 'corteVolador': {
        // Media luna enorme brillante
        ctx.scale(dir, 1);
        const k = 1 - p.vida / p.vidaMax;
        ctx.globalAlpha = 1 - k * 0.6;
        ctx.shadowColor = p.color; ctx.shadowBlur = 30;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(-20, 0, 70, -1.3, 1.3);
        ctx.arc(-50, 0, 62, 1.15, -1.15, true);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-20, 0, 62, -1.1, 1.1);
        ctx.arc(-38, 0, 56, 1.0, -1.0, true);
        ctx.closePath(); ctx.fill();
        // Estela
        ctx.globalAlpha *= 0.4;
        ctx.fillStyle = p.color;
        ctx.fillRect(-160, -6, 110, 12);
        break;
      }
      case 'ondaSuelo': {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 16;
        ctx.globalAlpha = Math.min(1, p.vida * 2);
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-dir * (i * 16), 22);
          ctx.lineTo(-dir * (i * 16) + dir * 10, -24 + i * 10 + Math.sin(t * 30 + i) * 4);
          ctx.lineTo(-dir * (i * 16) + dir * 22, 22);
          ctx.fill();
        }
        break;
      }
      case 'flecha': {
        // Apunta hacia donde va
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(12, 0); ctx.stroke();
        ctx.fillStyle = '#dee2e6';
        ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(10, -5); ctx.lineTo(10, 5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e03131';
        ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-28, -5); ctx.lineTo(-18, 0); ctx.lineTo(-28, 5); ctx.closePath(); ctx.fill();
        break;
      }
      case 'orbe': {
        const pulso = 1 + Math.sin(t * 14 + p.x) * 0.12;
        ctx.shadowColor = p.color; ctx.shadowBlur = 18;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(0, 0, p.radio * pulso, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(-p.radio * 0.3, -p.radio * 0.3, p.radio * 0.4, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'meteoro': {
        ctx.rotate(Math.atan2(p.vy, p.vx));
        const gc = ctx.createLinearGradient(-90, 0, 0, 0);
        gc.addColorStop(0, 'rgba(255,146,43,0)'); gc.addColorStop(1, 'rgba(255,212,59,0.9)');
        ctx.fillStyle = gc;
        ctx.beginPath(); ctx.moveTo(-100, 0); ctx.lineTo(0, -p.radio); ctx.lineTo(0, p.radio); ctx.closePath(); ctx.fill();
        ctx.shadowColor = '#ff922b'; ctx.shadowBlur = 24;
        ctx.fillStyle = '#6c4a3a';
        ctx.beginPath(); ctx.arc(0, 0, p.radio, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff922b';
        ctx.beginPath(); ctx.arc(p.radio * 0.3, 0, p.radio * 0.55, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'bolaFuego': {
        // Bola de fuego del ave: va recta (sin seguir al jugador)
        ctx.rotate(Math.atan2(p.vy, p.vx));
        const gc = ctx.createLinearGradient(-46, 0, 0, 0);
        gc.addColorStop(0, 'rgba(255,107,0,0)'); gc.addColorStop(1, 'rgba(255,170,60,0.85)');
        ctx.fillStyle = gc;
        ctx.beginPath(); ctx.moveTo(-46, 0); ctx.lineTo(0, -p.radio * 0.9); ctx.lineTo(0, p.radio * 0.9); ctx.closePath(); ctx.fill();
        ctx.shadowColor = '#ff6b00'; ctx.shadowBlur = 18;
        ctx.fillStyle = '#ff6b00';
        ctx.beginPath(); ctx.arc(0, 0, p.radio, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe066';
        ctx.beginPath(); ctx.arc(2, 0, p.radio * 0.55, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'shuriken': {
        ctx.rotate(p.rot * 1.5);
        ctx.fillStyle = '#ced4da'; ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
          ctx.lineTo(Math.cos(a + Math.PI / 4) * 4, Math.sin(a + Math.PI / 4) * 4);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#343a40'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
        break;
      }
      default:
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(0, 0, p.radio, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

// Corazón de curación dibujado por código (contorno oscuro y brillo).
// Para usar una imagen después: dibújala aquí en lugar de las curvas.
function dibujarCorazon(ctx, x, y, tam, t = 0) {
  const s = tam / 30 * (1 + Math.sin(t * 6) * 0.05); // late suavemente
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // Brillo detrás
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
  g.addColorStop(0, 'rgba(255,120,150,0.55)');
  g.addColorStop(1, 'rgba(255,120,150,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
  // Forma
  ctx.beginPath();
  ctx.moveTo(0, 13);
  ctx.bezierCurveTo(-4, 9, -17, 2, -17, -6);
  ctx.bezierCurveTo(-17, -13, -11, -17, -6, -17);
  ctx.bezierCurveTo(-3, -17, -1, -15, 0, -12);
  ctx.bezierCurveTo(1, -15, 3, -17, 6, -17);
  ctx.bezierCurveTo(11, -17, 17, -13, 17, -6);
  ctx.bezierCurveTo(17, 2, 4, 9, 0, 13);
  ctx.closePath();
  const r = ctx.createLinearGradient(0, -17, 0, 13);
  r.addColorStop(0, '#ff6b8a');
  r.addColorStop(1, '#d6204a');
  ctx.fillStyle = r;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#4a0f1f';
  ctx.stroke();
  // Reflejo
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.ellipse(-8, -9, 4, 2.6, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
