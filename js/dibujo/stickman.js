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
const TIPO_BASE = { arquero: 'arquero', arqueroMaestro: 'arquero', mago: 'mago', magoCosmico: 'mago', ninja: 'ninja', ninjaSombra: 'ninja', espadachin: 'espadachin' };

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
  if (e.tipo === 'ave') { dibujarAve(ctx, e, t); return; }
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
  if (base === 'espadachin') {
    // Casco pequeño y espada en la mano delantera
    ctx.fillStyle = '#adb5bd';
    ctx.beginPath(); ctx.arc(cx, cy - 2, 11, Math.PI, 0); ctx.fill();
    ctx.fillRect(cx - 12, cy - 3, 24, 3);
    if (!muerto) {
      const levantada = e.estado === 'preparar';
      const ang = levantada ? -2.3 : e.estado === 'atacar' ? 0.2 : -0.6;
      ctx.save();
      ctx.translate(manoD.x, manoD.y);
      ctx.rotate(ang);
      ctx.fillStyle = '#7c4a1e'; ctx.fillRect(-2, -3, 4, 8);           // empuñadura
      ctx.fillStyle = '#ffd43b'; ctx.fillRect(-6, -4, 12, 3);          // guarda
      ctx.fillStyle = '#e9ecef'; ctx.strokeStyle = '#495057'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-2.5, -4); ctx.lineTo(2.5, -4); ctx.lineTo(1, -34); ctx.lineTo(0, -38); ctx.lineTo(-1, -34); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
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

/* ---------- Ave voladora estilo STICKMAN (dibujada por código) ----------
   Cuerpo de palitos, cabeza redonda con ojitos y pico, alas de líneas gruesas
   que baten (cuadros de aleteo), cresta y cola rojas, patitas encogidas.
   Posturas: aleteo normal, "preparar" (alas arriba, cabeza atrás, pico brillando)
   y "atacar" (cabeza adelante y pico abierto al lanzar la bola de fuego).
   Para usar una imagen: pon la ruta en CONFIG.interfaz.ave.imagen. */
const IMAGEN_AVE = { img: null, ruta: null };
function imagenAve() {
  const ruta = CONFIG.interfaz.ave.imagen;
  if (!ruta) return null;
  if (IMAGEN_AVE.ruta !== ruta) { IMAGEN_AVE.ruta = ruta; IMAGEN_AVE.img = new Image(); IMAGEN_AVE.img.src = ruta; }
  return IMAGEN_AVE.img.complete && IMAGEN_AVE.img.naturalWidth ? IMAGEN_AVE.img : null;
}

// Cuadros de aleteo: [ángulo del hombro, doblez de la punta] (positivo = ala hacia arriba)
const CUADROS_ALA_AVE = {
  2: [[0.95, 0.5], [-0.55, -0.25]],
  3: [[0.95, 0.5], [0.15, 0.05], [-0.55, -0.25]],
  4: [[0.95, 0.5], [0.2, 0.1], [-0.55, -0.25], [0.2, 0.1]],
};

function dibujarAve(ctx, e, t) {
  const ca = CONFIG.interfaz.ave;
  const muerto = e.estado === 'muerto';
  const prep = e.estado === 'preparar', ataca = e.estado === 'atacar';
  const cy = e.y - e.alto / 2;
  ctx.save();
  // Sombra en el suelo (más chica cuanto más alto vuela)
  if (!muerto) {
    const alto = Math.max(0, e.mundo.sueloY - e.y);
    const k = Math.max(0.3, 1 - alto / 400);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(e.x, e.mundo.sueloY, 22 * k, 5 * k, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.translate(e.x, cy);
  if (muerto) {
    ctx.rotate(e.dir * Math.min(1, e.tiempoMuerto / 0.4) * 2.4);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, e.tiempoMuerto - 0.7) / 0.7);
  }
  ctx.scale(e.dir * ca.escala, ca.escala);

  const img = imagenAve();
  if (img) {
    const h = 70, w = h * img.naturalWidth / img.naturalHeight;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    const color = e.anim.flash > 0.5 ? '#ffffff' : (ca.colorCuerpo || e.color);
    const detalle = e.anim.flash > 0.5 ? '#ffffff' : ca.colorDetalles;
    // Cuadro de aleteo (o postura fija al disparar)
    const cuadros = CUADROS_ALA_AVE[U.clamp(Math.round(ca.cuadrosAleteo), 2, 4)];
    let ala;
    if (muerto) ala = [0.3, 0.2];
    else if (prep) ala = [1.15, 0.7];          // alas bien arriba: se prepara
    else if (ataca) ala = [-0.7, -0.35];       // golpe de alas hacia abajo al lanzar
    else ala = cuadros[Math.floor(t * ca.aleteosPorSegundo * cuadros.length + e.anim.fase * 3) % cuadros.length];
    // Pequeño sube y baja del cuerpo con el aleteo
    const sube = muerto ? 0 : -ala[0] * 3;
    // Cabeza: atrás al preparar, adelante al lanzar
    const cab = prep ? { x: 12, y: -16 } : ataca ? { x: 21, y: -10 } : { x: 16, y: -13 };
    const hombro = { x: 2, y: -3 + sube }, cola = { x: -18, y: 4 + sube }, cuello = { x: 9, y: -6 + sube };
    const cabeza = { x: cab.x, y: cab.y + sube };

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Un ala: dos palitos gruesos (hombro -> codo -> punta)
    const unaAla = (dx, largo, ancho, g) => {
      const x0 = hombro.x + dx, y0 = hombro.y;
      const x1 = x0 - Math.cos(ala[0]) * largo * 0.55, y1 = y0 - Math.sin(ala[0]) * largo * 0.55;
      const a2 = ala[0] + ala[1];
      const x2 = x1 - Math.cos(a2) * largo * 0.6, y2 = y1 - Math.sin(a2) * largo * 0.6;
      ctx.lineWidth = ancho + g;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    };
    const lineas = (contorno) => {
      const g = contorno ? 3 : 0;
      const oscuro = 'rgba(20,20,35,0.8)';
      const pincel = (c) => { ctx.strokeStyle = contorno ? oscuro : c; ctx.fillStyle = contorno ? oscuro : c; };
      // Ala de atrás (más clara)
      pincel(color);
      ctx.save(); if (!contorno) ctx.globalAlpha *= 0.7; unaAla(4, 30, 5, g); ctx.restore();
      // Patitas encogidas (palitos doblados)
      pincel(detalle);
      ctx.lineWidth = 3 + g;
      ctx.beginPath();
      ctx.moveTo(-4, 4 + sube); ctx.lineTo(-3, 12 + sube); ctx.lineTo(-9, 14 + sube);
      ctx.moveTo(2, 4 + sube); ctx.lineTo(3, 12 + sube); ctx.lineTo(-3, 14 + sube);
      ctx.stroke();
      // Cuerpo: palito de la cola al cuello
      pincel(color);
      ctx.lineWidth = 5 + g;
      ctx.beginPath(); ctx.moveTo(cola.x, cola.y); ctx.lineTo(cuello.x, cuello.y); ctx.lineTo(cabeza.x - 4, cabeza.y + 4); ctx.stroke();
      // Cola: tres plumas de línea y cresta de tres palitos (rojas)
      pincel(detalle);
      ctx.lineWidth = 3 + g;
      ctx.beginPath();
      [[-29, -4], [-30, 3], [-27, 10]].forEach(([x, y]) => { ctx.moveTo(cola.x, cola.y); ctx.lineTo(x, y + sube); });
      [[-6, -14], [-1, -16], [4, -14]].forEach(([x, y]) => { ctx.moveTo(cabeza.x + x * 0.4, cabeza.y - 8); ctx.lineTo(cabeza.x + x, cabeza.y + y); });
      ctx.stroke();
      // Cabeza redonda
      pincel(color);
      ctx.beginPath(); ctx.arc(cabeza.x, cabeza.y, 10 + (contorno ? 1.5 : 0), 0, Math.PI * 2); ctx.fill();
      // Ala de adelante (encima del cuerpo)
      unaAla(-2, 36, 6, g);
    };
    lineas(true);
    lineas(false);

    // Pico: cerrado, o abierto y brillante al preparar / lanzar
    const abierto = prep || ataca ? 4 : 0;
    ctx.fillStyle = prep ? '#ffe066' : ca.colorPico;
    ctx.strokeStyle = 'rgba(20,20,35,0.8)'; ctx.lineWidth = 1.5;
    if (prep) { ctx.shadowColor = '#ff922b'; ctx.shadowBlur = 14; }
    ctx.beginPath(); ctx.moveTo(cabeza.x + 8, cabeza.y - 3); ctx.lineTo(cabeza.x + 19, cabeza.y - 1 - abierto * 0.4); ctx.lineTo(cabeza.x + 9, cabeza.y + 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (abierto) { ctx.beginPath(); ctx.moveTo(cabeza.x + 9, cabeza.y + 2); ctx.lineTo(cabeza.x + 17, cabeza.y + 2 + abierto); ctx.lineTo(cabeza.x + 8, cabeza.y + 5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.shadowBlur = 0;
    // Ojitos redondos con brillo (simpático, no de terror)
    if (!muerto) {
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath(); ctx.arc(cabeza.x + 3, cabeza.y - 2, 2.6, 0, Math.PI * 2); ctx.arc(cabeza.x + 8.5, cabeza.y - 2, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cabeza.x + 3.4, cabeza.y - 3.6, 1.2, 1.2); ctx.fillRect(cabeza.x + 8.8, cabeza.y - 3.4, 1, 1);
    } else {
      ctx.fillStyle = '#1a1a2e'; ctx.font = 'bold 9px Arial'; ctx.fillText('x x', cabeza.x - 6, cabeza.y + 1);
    }
  }
  ctx.restore();
  // Aviso "!" antes de lanzar
  if (prep) {
    ctx.save();
    ctx.font = '900 26px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffdd33'; ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 4;
    const by = cy - 40 * ca.escala - Math.abs(Math.sin(t * 16)) * 5;
    ctx.strokeText('!', e.x, by); ctx.fillText('!', e.x, by);
    ctx.restore();
  }
  // Vida pequeña si está herida
  if (!muerto && e.vida < e.vidaMax) {
    const w = 40, x = e.x - w / 2, y = cy - 34 * ca.escala;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 1, y - 1, w + 2, 6);
    ctx.fillStyle = '#ff5050'; ctx.fillRect(x, y, w * Math.max(0, e.vida / e.vidaMax), 4);
  }
}
