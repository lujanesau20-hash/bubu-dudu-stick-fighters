/* =====================================================================
   ROPA: capas simples dibujadas por código sobre el sprite.
   Preparado para reemplazarlas por imágenes: pon el archivo en
   assets/ropa/ y escribe su ruta en "imagen" (ej. 'assets/ropa/corona.png').
   Si la imagen carga, se dibuja la imagen en lugar del dibujo por código.

   Cada función recibe (ctx, caja) con la caja en coordenadas del sprite:
   caja = { x, y, ancho, alto }  (x,y = centro arriba para cabeza;
                                   centro arriba del torso para ropa)
   ===================================================================== */
const ROPA = {
  cabeza: {
    gorra: {
      imagen: null,
      dibujar(ctx, c) {
        const w = c.ancho;
        ctx.fillStyle = '#e63946';
        ctx.beginPath(); ctx.ellipse(c.x, c.y + w * 0.12, w * 0.42, w * 0.3, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#c1121f';
        ctx.beginPath(); ctx.ellipse(c.x + w * 0.38, c.y + w * 0.13, w * 0.3, w * 0.07, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(c.x, c.y - w * 0.17, w * 0.04, 0, Math.PI * 2); ctx.fill();
      },
    },
    casco: {
      imagen: null,
      dibujar(ctx, c) {
        const w = c.ancho;
        ctx.fillStyle = '#ffc300';
        ctx.beginPath(); ctx.ellipse(c.x, c.y + w * 0.12, w * 0.44, w * 0.36, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#e6a800';
        ctx.fillRect(c.x - w * 0.55, c.y + w * 0.08, w * 1.1, w * 0.09);
        ctx.fillRect(c.x - w * 0.05, c.y - w * 0.24, w * 0.1, w * 0.34);
      },
    },
    sombrero: {
      imagen: null,
      dibujar(ctx, c) {
        const w = c.ancho;
        ctx.fillStyle = '#3d2b1f';
        ctx.beginPath(); ctx.ellipse(c.x, c.y + w * 0.1, w * 0.62, w * 0.1, 0, 0, Math.PI * 2); ctx.fill();
        U.rectRedondo(ctx, c.x - w * 0.32, c.y - w * 0.32, w * 0.64, w * 0.42, w * 0.1); ctx.fill();
        ctx.fillStyle = '#b5121b';
        ctx.fillRect(c.x - w * 0.32, c.y - w * 0.02, w * 0.64, w * 0.08);
      },
    },
    corona: {
      imagen: null,
      dibujar(ctx, c) {
        const w = c.ancho * 0.75;
        const y = c.y + w * 0.08;
        ctx.fillStyle = '#ffd23f';
        ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(c.x - w * 0.45, y);
        ctx.lineTo(c.x - w * 0.5, y - w * 0.38);
        ctx.lineTo(c.x - w * 0.25, y - w * 0.18);
        ctx.lineTo(c.x, y - w * 0.48);
        ctx.lineTo(c.x + w * 0.25, y - w * 0.18);
        ctx.lineTo(c.x + w * 0.5, y - w * 0.38);
        ctx.lineTo(c.x + w * 0.45, y);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e63946';
        ctx.beginPath(); ctx.arc(c.x, y - w * 0.12, w * 0.07, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4361ee';
        ctx.beginPath(); ctx.arc(c.x - w * 0.27, y - w * 0.08, w * 0.05, 0, Math.PI * 2); ctx.arc(c.x + w * 0.27, y - w * 0.08, w * 0.05, 0, Math.PI * 2); ctx.fill();
      },
    },
  },

  ropa: {
    calle: { imagen: null, dibujar(ctx, c) { torsoBase(ctx, c, '#3a86ff', '#2667cc'); bolsillo(ctx, c, '#2667cc'); } },
    trabajo: {
      imagen: null,
      dibujar(ctx, c) {
        torsoBase(ctx, c, '#ff7b00', '#d96500');
        ctx.fillStyle = '#e9ff70';
        ctx.fillRect(c.x - c.ancho * 0.48, c.y + c.alto * 0.35, c.ancho * 0.96, c.alto * 0.1);
        ctx.fillRect(c.x - c.ancho * 0.48, c.y + c.alto * 0.6, c.ancho * 0.96, c.alto * 0.1);
      },
    },
    oficinista: {
      imagen: null,
      dibujar(ctx, c) {
        torsoBase(ctx, c, '#f1f5f9', '#cbd5e1');
        corbata(ctx, c, '#1d4ed8');
      },
    },
    formal: {
      imagen: null,
      dibujar(ctx, c) {
        torsoBase(ctx, c, '#1f2937', '#111827');
        // Camisa blanca en V
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(c.x - c.ancho * 0.2, c.y); ctx.lineTo(c.x + c.ancho * 0.2, c.y); ctx.lineTo(c.x, c.y + c.alto * 0.55);
        ctx.closePath(); ctx.fill();
        corbata(ctx, c, '#b91c1c');
        ctx.fillStyle = '#e5e7eb';
        ctx.beginPath(); ctx.arc(c.x - c.ancho * 0.08, c.y + c.alto * 0.68, c.ancho * 0.03, 0, Math.PI * 2); ctx.arc(c.x - c.ancho * 0.08, c.y + c.alto * 0.84, c.ancho * 0.03, 0, Math.PI * 2); ctx.fill();
      },
    },
    guerrero: {
      imagen: null,
      dibujar(ctx, c) {
        torsoBase(ctx, c, '#9aa5b1', '#6b7785');
        ctx.strokeStyle = '#4b5563'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(c.x, c.y + c.alto * 0.05); ctx.lineTo(c.x, c.y + c.alto * 0.75); ctx.stroke();
        ctx.fillStyle = '#7c4a1e';
        ctx.fillRect(c.x - c.ancho * 0.5, c.y + c.alto * 0.72, c.ancho, c.alto * 0.14);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(c.x - c.ancho * 0.07, c.y + c.alto * 0.71, c.ancho * 0.14, c.alto * 0.16);
        // Hombreras
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath(); ctx.arc(c.x - c.ancho * 0.48, c.y + c.alto * 0.12, c.ancho * 0.14, 0, Math.PI * 2); ctx.arc(c.x + c.ancho * 0.48, c.y + c.alto * 0.12, c.ancho * 0.14, 0, Math.PI * 2); ctx.fill();
      },
    },
    rey: {
      imagen: null,
      dibujar(ctx, c) {
        // Capa roja
        ctx.fillStyle = '#9d0208';
        ctx.beginPath();
        ctx.moveTo(c.x - c.ancho * 0.55, c.y);
        ctx.lineTo(c.x + c.ancho * 0.55, c.y);
        ctx.lineTo(c.x + c.ancho * 0.66, c.y + c.alto * 1.0);
        ctx.lineTo(c.x - c.ancho * 0.66, c.y + c.alto * 1.0);
        ctx.closePath(); ctx.fill();
        torsoBase(ctx, c, '#6a040f', '#370617', 0.8);
        // Armiño
        ctx.fillStyle = '#ffffff';
        U.rectRedondo(ctx, c.x - c.ancho * 0.58, c.y - c.alto * 0.06, c.ancho * 1.16, c.alto * 0.2, 6); ctx.fill();
        ctx.fillStyle = '#111';
        for (let i = -2; i <= 2; i++) ctx.fillRect(c.x + i * c.ancho * 0.2 - 1.5, c.y + c.alto * 0.02, 3, 4);
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.arc(c.x, c.y + c.alto * 0.42, c.ancho * 0.09, 0, Math.PI * 2); ctx.fill();
      },
    },
    oro: {
      imagen: null,
      dibujar(ctx, c, t = 0) {
        const g = ctx.createLinearGradient(c.x - c.ancho / 2, c.y, c.x + c.ancho / 2, c.y + c.alto);
        g.addColorStop(0, '#fff3a3'); g.addColorStop(0.5, '#ffc300'); g.addColorStop(1, '#b8860b');
        torsoBase(ctx, c, g, '#8a6d0b');
        // Brillo que recorre la armadura
        const bx = c.x - c.ancho / 2 + ((t * 0.8) % 1.6) * c.ancho;
        ctx.save();
        ctx.globalAlpha = 0.6; ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(bx, c.y + c.alto * 0.45, c.ancho * 0.05, c.alto * 0.4, 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#e63946';
        ctx.beginPath(); ctx.arc(c.x, c.y + c.alto * 0.35, c.ancho * 0.08, 0, Math.PI * 2); ctx.fill();
      },
    },
  },
};

// Forma base de una prenda de torso (camiseta/chaqueta redondeada)
function torsoBase(ctx, c, color, sombra, altoRel = 1) {
  const w = c.ancho, h = c.alto * altoRel;
  ctx.fillStyle = color;
  ctx.strokeStyle = sombra; ctx.lineWidth = 2.5;
  U.rectRedondo(ctx, c.x - w / 2, c.y, w, h, w * 0.28);
  ctx.fill(); ctx.stroke();
}
function bolsillo(ctx, c, color) {
  ctx.fillStyle = color;
  U.rectRedondo(ctx, c.x - c.ancho * 0.25, c.y + c.alto * 0.55, c.ancho * 0.5, c.alto * 0.22, 5); ctx.fill();
}
function corbata(ctx, c, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(c.x - c.ancho * 0.06, c.y + c.alto * 0.04);
  ctx.lineTo(c.x + c.ancho * 0.06, c.y + c.alto * 0.04);
  ctx.lineTo(c.x + c.ancho * 0.09, c.y + c.alto * 0.62);
  ctx.lineTo(c.x, c.y + c.alto * 0.75);
  ctx.lineTo(c.x - c.ancho * 0.09, c.y + c.alto * 0.62);
  ctx.closePath(); ctx.fill();
}

// Carga las imágenes de ropa que tengan ruta (para cuando existan)
function cargarImagenesRopa() {
  for (const grupo of Object.values(ROPA)) {
    for (const prenda of Object.values(grupo)) {
      if (!prenda.imagen) continue;
      const img = new Image();
      img.onload = () => { prenda.img = img; };
      img.src = prenda.imagen;
    }
  }
}

// Dibuja la ropa equipada. (w,h) = tamaño del sprite, centrado en (0,0)
function dibujarRopa(ctx, personaje, equipo, w, h, t) {
  if (!equipo) return;
  const an = CONFIG.personajes[personaje].anclas;
  const aLocal = (n) => ({ x: -w / 2 + n.x * w, y: -h / 2 + n.y * h });
  if (equipo.ropa && ROPA.ropa[equipo.ropa]) {
    const p = ROPA.ropa[equipo.ropa];
    const o = aLocal(an.torso);
    const caja = { x: o.x, y: o.y - (an.torso.alto * h) / 2, ancho: an.torso.ancho * w, alto: an.torso.alto * h };
    if (p.img) ctx.drawImage(p.img, caja.x - caja.ancho / 2, caja.y, caja.ancho, caja.alto);
    else p.dibujar(ctx, caja, t);
  }
  if (equipo.cabeza && ROPA.cabeza[equipo.cabeza]) {
    const p = ROPA.cabeza[equipo.cabeza];
    const o = aLocal(an.cabeza);
    const caja = { x: o.x, y: o.y, ancho: an.cabeza.ancho * w };
    if (p.img) ctx.drawImage(p.img, caja.x - caja.ancho / 2, caja.y - caja.ancho * 0.5, caja.ancho, caja.ancho * 0.6);
    else p.dibujar(ctx, caja, t);
  }
}
