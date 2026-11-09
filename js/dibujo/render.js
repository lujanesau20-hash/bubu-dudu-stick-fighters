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
  // Ancho del mundo visible con zoom 1
  get anchoBase() { return (this.W / this.H) * CONFIG.vista.alto; }

  dibujarFondo(escenario, cam, t) {
    const f = FONDOS[escenario] || FONDOS.isla;
    f.fondo(this.ctx, cam, this.W, this.H, t);
  }

  // Aplica la cámara: (x,y) del mundo en el centro de la pantalla
  aplicarCamara(cam) {
    const ctx = this.ctx;
    const esc = (this.H / CONFIG.vista.alto) * cam.zoom;
    ctx.translate(this.W / 2 + cam.offX * esc, this.H / 2 + cam.offY * esc);
    ctx.scale(esc, esc);
    ctx.translate(-cam.x, -cam.y);
  }

  dibujarMundo(m, cam, efectos, t, equipos) {
    const ctx = this.ctx;
    const fondo = FONDOS[m.escenario.fondo] || FONDOS.isla;
    fondo.fondo(ctx, cam, this.W, this.H, t);

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

    // Monedas
    for (const c of m.monedas) {
      const giro = Math.abs(Math.cos(t * 8 + c.x));
      ctx.fillStyle = '#ffcf33';
      ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, 8 * giro + 1, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    for (const e of m.enemigos) dibujarStickman(ctx, e, t);
    if (m.jefe) dibujarStickman(ctx, m.jefe, t);

    const etiquetas = m.jugadores.length > 1;
    // Primero los caídos (quedan detrás)
    const orden = [...m.jugadores].sort((a, b) => (a.vivo ? 1 : 0) - (b.vivo ? 1 : 0));
    for (const j of orden) dibujarJugador(ctx, j, t, equipos[j.personaje], etiquetas);

    for (const p of m.proyectiles) this.dibujarProyectil(p, t);
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
      default:
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(0, 0, p.radio, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
