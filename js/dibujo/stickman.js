/* =====================================================================
   DIBUJO DE STICKMAN (enemigos y jefes), hecho con líneas.
   La pose se calcula según el estado del enemigo.
   Ángulos: 0 = hacia abajo, positivo = hacia adelante.
   ===================================================================== */

// Estados de los enemigos/jefes de los niveles 2-4 que reutilizan una pose existente
const ALIAS_POSE = {
  prepDisparo: 'preparar', disparo: 'atacar', prepOrbe: 'preparar', orbe: 'atacar',
  prepLluvia: 'rugido', prepMeteoro: 'rugido', prepShuriken: 'preparar',
  prepCorte: 'prepEmbestida', corte: 'embestida', oculto: 'descanso',
};
// Tipo "base" de cada enemigo o jefe (para sus accesorios)
const TIPO_BASE = { arquero: 'arquero', arqueroMaestro: 'arquero', mago: 'mago', magoCosmico: 'mago', ninja: 'ninja', ninjaSombra: 'ninja' };

function poseStickman(e, t) {
  const f = e.anim.fase;
  const p = { cuerpo: 0, bD: [0.3, 0.3], bI: [-0.3, -0.2], pD: [0.15, 0], pI: [-0.15, 0], dy: 0 };
  const base = TIPO_BASE[e.tipo];
  // Arquero tensando el arco: brazo delantero estirado y el otro tirando de la cuerda
  if (base === 'arquero' && (e.estado === 'preparar' || e.estado === 'prepDisparo')) {
    return { cuerpo: -0.05, bD: [1.57, 1.57], bI: [1.25, -0.6], pD: [0.35, 0], pI: [-0.35, 0], dy: 0 };
  }
  // Mago levantando el bastón
  if (base === 'mago' && (e.estado === 'preparar' || e.estado === 'prepOrbe')) {
    return { cuerpo: -0.1, bD: [-2.4, -2.6], bI: [0.5, 1.2], pD: [0.3, 0], pI: [-0.3, 0], dy: 0 };
  }
  switch (ALIAS_POSE[e.estado] || e.estado) {
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
    const manoD = extremidad(ctx, hx, hy, p.bD, 14);
    const cx = hx + Math.sin(p.cuerpo) * 12, cy = hy - Math.cos(p.cuerpo) * 12;
    ctx.beginPath(); ctx.arc(cx, cy, 10 + (contorno ? 1.5 : 0), 0, Math.PI * 2); ctx.fill();
    return { cx, cy, hx, hy, manoD };
  };
  if (e.estado === 'oculto') ctx.globalAlpha *= 0.12; // desaparecido (teletransporte / sombra)
  // Accesorios que van detrás del cuerpo
  if (!muerto) accesorioDetras(ctx, e, t);
  dibujarTodo(true);
  const { cx, cy, hx, hy, manoD } = dibujarTodo(false);

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

  // Accesorios de cada tipo (arco, sombrero y bastón, cinta ninja)
  accesorioDelante(ctx, e, t, { cx, cy, hx, hy, manoD, muerto });

  // Detalles del jefe: cinturón (Gigante) y ojo rojo en furia
  if (e.esJefe) {
    ctx.strokeStyle = '#ffcc33'; ctx.lineWidth = 3;
    if (e.tipo === 'gigante') { ctx.beginPath(); ctx.moveTo(-6, -40); ctx.lineTo(6, -40); ctx.stroke(); }
    ctx.fillStyle = '#ff4d4d';
    if (e.fase2 && !muerto) { ctx.beginPath(); ctx.arc(cx + 5, cy - 1, 2.2, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();

  // Aviso "!" cuando va a atacar
  if (e.estado === 'preparar' || e.estado.startsWith('prep')) {
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

/* ---------- Accesorios de los enemigos y jefes de los niveles 2-4 ---------- */
// Coordenadas locales del stickman (mira a la derecha, pies en 0, cabeza ~ -70)
function accesorioDetras(ctx, e, t) {
  const base = TIPO_BASE[e.tipo];
  if (base === 'arquero') {
    // Carcaj con flechas en la espalda
    ctx.save();
    ctx.translate(-6, -58); ctx.rotate(-0.4);
    ctx.fillStyle = '#7c4a1e'; ctx.fillRect(-4, 0, 8, 22);
    ctx.fillStyle = '#e9ecef'; ctx.fillRect(-3, -6, 2, 7); ctx.fillRect(1, -7, 2, 8);
    ctx.restore();
  }
  if (base === 'mago' && e.esJefe) {
    // Capa estrellada del Mago Cósmico
    ctx.fillStyle = 'rgba(40,20,90,0.9)';
    ctx.beginPath(); ctx.moveTo(-2, -60); ctx.lineTo(-24, -6); ctx.lineTo(10, -8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe066';
    [[-12, -30], [-6, -18], [-16, -14]].forEach(([x, y]) => ctx.fillRect(x, y, 2, 2));
  }
  if (base === 'ninja' && e.esJefe) {
    // Aura oscura del Ninja Sombra
    ctx.fillStyle = 'rgba(20,10,30,0.25)';
    ctx.beginPath(); ctx.ellipse(0, -40, 26 + Math.sin(t * 8) * 3, 46, 0, 0, Math.PI * 2); ctx.fill();
  }
}

function accesorioDelante(ctx, e, t, d) {
  const base = TIPO_BASE[e.tipo];
  const { cx, cy, manoD, muerto } = d;
  if (base === 'arquero') {
    // Capucha
    ctx.fillStyle = e.esJefe ? '#0b4f1c' : '#2b7a3a';
    ctx.beginPath(); ctx.moveTo(cx - 11, cy + 2); ctx.quadraticCurveTo(cx - 4, cy - 20, cx + 9, cy - 8); ctx.lineTo(cx + 2, cy - 4); ctx.closePath(); ctx.fill();
    if (e.esJefe) { ctx.fillStyle = '#ffd43b'; ctx.fillRect(cx - 6, cy - 12, 3, 3); } // broche dorado
    if (!muerto) {
      // Arco en la mano delantera
      ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(manoD.x - 4, manoD.y, 13, -1.2, 1.2); ctx.stroke();
      ctx.strokeStyle = '#f1f3f5'; ctx.lineWidth = 1;
      const tens = (e.estado === 'preparar' || e.estado === 'prepDisparo') ? -8 : 0;
      ctx.beginPath(); ctx.moveTo(manoD.x - 4 + 13 * Math.cos(-1.2), manoD.y + 13 * Math.sin(-1.2));
      ctx.lineTo(manoD.x - 4 + tens, manoD.y); ctx.lineTo(manoD.x - 4 + 13 * Math.cos(1.2), manoD.y + 13 * Math.sin(1.2)); ctx.stroke();
    }
  }
  if (base === 'mago') {
    // Sombrero puntiagudo con estrella
    ctx.fillStyle = e.esJefe ? '#3b1d8f' : '#5f3dc4';
    ctx.beginPath(); ctx.moveTo(cx - 13, cy - 5); ctx.lineTo(cx + 13, cy - 5); ctx.lineTo(cx - 6, cy - (e.esJefe ? 34 : 28)); ctx.closePath(); ctx.fill();
    ctx.fillRect(cx - 15, cy - 7, 30, 4);
    ctx.fillStyle = '#ffe066';
    ctx.beginPath(); ctx.arc(cx - 2, cy - 15, 2.2, 0, Math.PI * 2); ctx.fill();
    if (!muerto) {
      // Bastón con orbe brillante
      ctx.strokeStyle = '#7c4a1e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(manoD.x, manoD.y + 14); ctx.lineTo(manoD.x, manoD.y - 18); ctx.stroke();
      const brillo = 4 + Math.sin(t * 6) * 1.5 + ((e.estado === 'preparar' || e.estado === 'prepOrbe' || e.estado === 'prepMeteoro') ? 4 : 0);
      ctx.fillStyle = e.esJefe ? '#ff8cf0' : '#c77dff';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(manoD.x, manoD.y - 21, brillo, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
  if (base === 'ninja') {
    // Cinta en la frente con las puntas al viento y máscara
    ctx.fillStyle = e.esJefe ? '#c92a2a' : '#e03131';
    ctx.fillRect(cx - 10, cy - 7, 20, 4);
    const ondea = Math.sin(t * 12) * 3;
    ctx.beginPath(); ctx.moveTo(cx - 9, cy - 6); ctx.lineTo(cx - 22, cy - 9 + ondea); ctx.lineTo(cx - 21, cy - 3 + ondea); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(20,20,30,0.85)';
    ctx.fillRect(cx - 9, cy + 1, 19, 6);
  }
}
