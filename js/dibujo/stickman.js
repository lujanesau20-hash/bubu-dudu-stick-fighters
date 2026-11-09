/* =====================================================================
   DIBUJO DE STICKMAN (enemigos y jefes), hecho con líneas.
   La pose se calcula según el estado del enemigo.
   Ángulos: 0 = hacia abajo, positivo = hacia adelante.
   ===================================================================== */

function poseStickman(e, t) {
  const f = e.anim.fase;
  const p = { cuerpo: 0, bD: [0.3, 0.3], bI: [-0.3, -0.2], pD: [0.15, 0], pI: [-0.15, 0], dy: 0 };
  switch (e.estado) {
    case 'perseguir':
    case 'caminar': {
      const s = Math.sin(f);
      if (Math.abs(e.vx) > 15) {
        p.pD = [s * 0.6, Math.max(0, -s) * -0.7];
        p.pI = [-s * 0.6, Math.max(0, s) * -0.7];
        p.bD = [-s * 0.7, -s * 0.3 + 0.4];
        p.bI = [s * 0.7, s * 0.3 + 0.4];
        p.cuerpo = 0.12;
      } else {
        const r = Math.sin(t * 3 + f) * 0.05;
        p.bD = [0.3 + r, 0.6]; p.bI = [-0.2 - r, 0.2];
      }
      break;
    }
    case 'preparar':
    case 'prepPunio':
      p.cuerpo = -0.25;
      p.bD = [-2.3, -1.2]; p.bI = [0.6, 1.6];
      p.pD = [0.45, 0]; p.pI = [-0.45, 0];
      break;
    case 'atacar':
    case 'punio':
      p.cuerpo = 0.3;
      p.bD = [1.57, 1.57]; p.bI = [-0.8, -0.4];
      p.pD = [0.6, -0.2]; p.pI = [-0.55, 0];
      break;
    case 'aturdido':
      p.cuerpo = -0.45;
      p.bD = [-2.4, -2.8]; p.bI = [-2.0, -2.6];
      p.pD = [0.4, 0.3]; p.pI = [-0.2, 0];
      break;
    case 'entrando':
      p.bD = [-2.6, -2.9]; p.bI = [-2.4, -2.8];
      p.pD = [0.5, -0.9]; p.pI = [-0.3, -0.6];
      break;
    case 'rugido':
      p.cuerpo = -0.2;
      p.bD = [-2.4 + Math.sin(t * 20) * 0.2, -2.8]; p.bI = [-2.2, -2.7];
      p.pD = [0.5, 0]; p.pI = [-0.5, 0];
      break;
    case 'prepPisoton':
      p.cuerpo = -0.15;
      p.pD = [1.3, -1.4]; p.pI = [-0.1, 0];
      p.bD = [-1.8, -2.2]; p.bI = [-1.5, -2];
      break;
    case 'pisoton':
      p.pD = [0.5, 0]; p.pI = [-0.5, 0];
      p.bD = [0.9, 0.9]; p.bI = [-0.9, -0.9];
      p.dy = 6;
      break;
    case 'prepEmbestida':
      p.cuerpo = 0.6;
      p.bD = [-0.6, -1]; p.bI = [-0.9, -1.2];
      p.pD = [0.7, -0.5]; p.pI = [-0.6, 0];
      break;
    case 'embestida': {
      const s = Math.sin(f * 2);
      p.cuerpo = 0.7;
      p.bD = [1.4, 1.4]; p.bI = [1.2, 1.3];
      p.pD = [s * 0.9, -0.5]; p.pI = [-s * 0.9, -0.5];
      break;
    }
    case 'descanso':
      p.cuerpo = 0.35;
      p.bD = [0.2, 0.3]; p.bI = [-0.1, 0.1];
      p.pD = [0.35, 0]; p.pI = [-0.35, 0];
      p.dy = 4;
      break;
  }
  if (!e.enSuelo && e.estado !== 'entrando' && e.estado !== 'muerto') {
    p.pD = [0.6, -1]; p.pI = [-0.2, -0.7];
  }
  return p;
}

function extremidad(ctx, x, y, angs, largo) {
  const x1 = x + Math.sin(angs[0]) * largo, y1 = y + Math.cos(angs[0]) * largo;
  const x2 = x1 + Math.sin(angs[1]) * largo, y2 = y1 + Math.cos(angs[1]) * largo;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  return { x: x2, y: y2 };
}

function dibujarStickman(ctx, e, t) {
  const esc = e.alto / 82;
  const muerto = e.estado === 'muerto';
  ctx.save();

  // Sombra
  if (!muerto || e.tiempoMuerto < 0.5) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(e.x, e.mundo.sueloY >= e.y - 1 ? e.y : e.y, 22 * esc, 6 * esc, 0, 0, Math.PI * 2); ctx.fill();
  }

  ctx.translate(e.x, e.y);
  if (muerto) {
    const k = Math.min(1, e.tiempoMuerto / 0.35);
    ctx.rotate(-e.dir * k * Math.PI / 2);
    ctx.globalAlpha = e.esJefe ? 1 : Math.max(0, 1 - Math.max(0, e.tiempoMuerto - 0.7) / 0.7);
  }
  ctx.scale(e.dir * esc, esc);

  const p = poseStickman(e, t);
  ctx.translate(0, p.dy);
  const color = e.anim.flash > 0.5 ? '#ffffff' : e.color;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = e.esJefe ? 7 : 5;

  // Contorno oscuro para que se lea sobre cualquier fondo
  const cadera = { x: 0, y: -36 };
  const dibujarTodo = (contorno) => {
    ctx.lineWidth = (e.esJefe ? 7 : 5) + (contorno ? 3 : 0);
    ctx.strokeStyle = contorno ? 'rgba(20,20,35,0.8)' : color;
    ctx.fillStyle = contorno ? 'rgba(20,20,35,0.8)' : color;
    extremidad(ctx, cadera.x, cadera.y, p.pI, 18);
    extremidad(ctx, cadera.x, cadera.y, p.pD, 18);
    const hx = Math.sin(p.cuerpo) * 26, hy = cadera.y - Math.cos(p.cuerpo) * 26;
    ctx.beginPath(); ctx.moveTo(cadera.x, cadera.y); ctx.lineTo(hx, hy); ctx.stroke();
    extremidad(ctx, hx, hy, p.bI, 14);
    extremidad(ctx, hx, hy, p.bD, 14);
    const cx = hx + Math.sin(p.cuerpo) * 12, cy = hy - Math.cos(p.cuerpo) * 12;
    ctx.beginPath(); ctx.arc(cx, cy, 10 + (contorno ? 1.5 : 0), 0, Math.PI * 2); ctx.fill();
    return { cx, cy, hx, hy };
  };
  dibujarTodo(true);
  const { cx, cy } = dibujarTodo(false);

  // Cara: ojos enojados
  ctx.fillStyle = '#1a1a2e';
  if (!muerto) {
    ctx.fillRect(cx + 2, cy - 3, 3, 4);
    ctx.fillRect(cx + 7, cy - 3, 2.5, 4);
    ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx + 1, cy - 6); ctx.lineTo(cx + 6, cy - 4); ctx.stroke();
  } else {
    ctx.font = 'bold 9px Arial'; ctx.fillText('x x', cx - 1, cy + 3);
  }

  // Detalles del jefe Gigante: cinturón y cicatriz
  if (e.esJefe) {
    ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-6, -40); ctx.lineTo(6, -40); ctx.stroke();
    ctx.fillStyle = '#ff4d4d';
    if (e.fase2 && !muerto) { ctx.beginPath(); ctx.arc(cx + 5, cy - 1, 2.2, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();

  // Aviso "!" cuando va a atacar
  if (['preparar', 'prepPunio', 'prepPisoton', 'prepEmbestida'].includes(e.estado)) {
    ctx.save();
    ctx.font = `900 ${e.esJefe ? 46 : 28}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffdd33'; ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 4;
    const by = e.y - e.alto - 18 - Math.abs(Math.sin(t * 16)) * 6;
    ctx.strokeText('!', e.x, by); ctx.fillText('!', e.x, by);
    ctx.restore();
  }

  // Vida pequeña sobre enemigos normales heridos
  if (!e.esJefe && !muerto && e.vida < e.vidaMax) {
    const w = 46, x = e.x - w / 2, y = e.y - e.alto - 16;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 1, y - 1, w + 2, 7);
    ctx.fillStyle = '#ff5050'; ctx.fillRect(x, y, w * Math.max(0, e.vida / e.vidaMax), 5);
  }
}
