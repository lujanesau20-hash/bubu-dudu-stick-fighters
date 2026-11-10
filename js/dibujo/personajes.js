/* =====================================================================
   DIBUJO DE BUBU Y DUDU
   Siempre con las hojas de sprites actuales (fuente única: config/personajes.js).
   El jugador local y el remoto se dibujan con el MISMO código (dibujarJugador).
   Si una hoja falla no se usa ninguna imagen vieja: se dibuja un círculo del
   color del personaje y el error aparece en el panel de depuración.
   (El código anterior con la imagen fija está en _archivo_viejo/codigo/.)
   ===================================================================== */
const SPRITES = {
  // Carga las hojas animadas (con la versión para celular si corresponde) y las verifica
  cargar(alTerminar) {
    cargarImagenesRopa();
    if (typeof Cuadros === 'undefined') { PERSONAJES.error('No está cargado js/prueba/cuadros.js'); alTerminar(); return; }
    PERSONAJES.prepararRutas();
    Cuadros.preferirGuardados = true; // carga rápida con los cuadros ya detectados
    Cuadros.cargarTodo()
      .then(() => PERSONAJES.verificar())
      .then(() => this.precalentar())
      .catch((e) => PERSONAJES.error('Error al cargar las hojas: ' + (e && e.message ? e.message : e)))
      .then(alTerminar);
  },

  // Al inicio (pantalla de carga): cada hoja se dibuja una vez en el lienzo del juego
  // (sube la imagen a la tarjeta gráfica) y se preparan los destellos de "herido" y la
  // estela del "dash", que antes se creaban la primera vez que pasaban, en plena partida.
  precalentar() {
    const t0 = performance.now();
    const lienzo = document.getElementById('lienzo');
    const ctx = lienzo && lienzo.getContext('2d');
    let hojas = 0, destellos = 0;
    for (const p of Object.keys(Cuadros.datos)) {
      for (const [anim, d] of Object.entries(Cuadros.datos[p])) {
        if (!d.img || !d.cuadros.length) continue;
        if (ctx) { ctx.drawImage(d.img, 0, 0, 2, 2); hojas++; }
        d._dibujada = true;
        // Destellos que se usan en plena pelea
        const colores = anim === 'herido' ? ['#ffffff', '#ff3b3b'] : anim === 'dash' ? ['#ffffff'] : null;
        if (!colores) continue;
        HOJAS_JUEGO.precargando = true;
        const esc = HOJAS_JUEGO.escala(p, d);
        for (const c of d.cuadros) for (const col of colores) { HOJAS_JUEGO.tinte(d, c, col, esc); destellos++; }
        HOJAS_JUEGO.precargando = false;
      }
    }
    // Imágenes de ropa (si hay) y del ave (si se configuró una)
    for (const grupo of Object.values(ROPA)) for (const prenda of Object.values(grupo)) if (prenda.img && ctx) ctx.drawImage(prenda.img, 0, 0, 2, 2);
    const ave = typeof imagenAve === 'function' ? imagenAve() : null;
    if (ave && ctx) ctx.drawImage(ave, 0, 0, 2, 2);
    if (ctx) ctx.clearRect(0, 0, 4, 4);
    this.precarga = { hojas, destellos, ms: Math.round(performance.now() - t0) };
  },
};

// Respaldo visible (NO una imagen vieja) si la hoja de un personaje no está lista
function dibujarFaltaPersonaje(ctx, personaje, alto) {
  const cfg = CONFIG.personajes[personaje];
  ctx.save();
  ctx.fillStyle = cfg.color; ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, -alto / 2, alto / 2.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1a1a2e'; ctx.font = `bold ${Math.round(alto / 4)}px Arial`; ctx.textAlign = 'center';
  ctx.fillText('?', 0, -alto / 2 + alto / 12);
  ctx.restore();
  PERSONAJES.error(`${personaje}: hojas no listas (se dibuja un círculo)`);
}

// Retrato del personaje (cuadro de reposo de su hoja) con los pies en (0,0) y su ropa.
// Lo usan el avatar del HUD y la vista previa de la tienda.
function dibujarSpritePersonaje(ctx, personaje, equipo, alto, opciones = {}) {
  const r = PERSONAJES.cuadroRetrato(personaje);
  if (!r) { dibujarFaltaPersonaje(ctx, personaje, alto); return; }
  const w = (alto * r.c.w) / r.c.h;
  ctx.save();
  ctx.translate(0, -alto / 2);
  ctx.scale(opciones.dir || 1, 1); // las hojas miran a la derecha
  PERSONAJES.dibujarCuadro(ctx, r.hoja, r.c, -w / 2, -alto / 2, w, alto);
  dibujarRopa(ctx, personaje, equipo, w, alto, opciones.tiempo || 0);
  if (opciones.flash > 0) {
    ctx.globalAlpha = Math.min(1, opciones.flash);
    ctx.drawImage(HOJAS_JUEGO.tinte(r.hoja, r.c, opciones.flashRojo ? '#ff3b3b' : '#ffffff', alto / r.c.h), -w / 2, -alto / 2, w, alto);
  }
  ctx.restore();
}

// Jugador en el juego (local o remoto: el mismo código, las mismas hojas y escala)
function dibujarJugador(ctx, j, t, equipo, mostrarEtiqueta) {
  const H = CONFIG.jugador.altoSprite;
  dibujarSombraJugador(ctx, j);
  if (HOJAS_JUEGO.listas(j.personaje)) {
    dibujarJugadorAnimado(ctx, j, t);
  } else {
    ctx.save(); ctx.translate(j.x, j.y);
    dibujarFaltaPersonaje(ctx, j.personaje, H);
    ctx.restore();
  }
  dibujarExtrasJugador(ctx, j, H * 1.05, mostrarEtiqueta);
}

// Etiqueta J1/J2 y, si está caído, cuenta regresiva y círculo de revivir
function dibujarExtrasJugador(ctx, j, altoVisible, mostrarEtiqueta) {
  // Etiqueta J1 / J2
  if (mostrarEtiqueta && j.estado !== 'caido' && j.estado !== 'muerto') {
    const col = j.indice === 0 ? '#4dabf7' : '#ff6b9a';
    const y = j.y - altoVisible - 22;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(j.x - 7, y); ctx.lineTo(j.x + 7, y); ctx.lineTo(j.x, y + 9); ctx.fill();
    ctx.font = 'bold 15px "Trebuchet MS", Arial';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = '#1a1a2e';
    ctx.strokeText('J' + (j.indice + 1), j.x, y - 4);
    ctx.fillStyle = col;
    ctx.fillText('J' + (j.indice + 1), j.x, y - 4);
  }

  // Caído: cuenta regresiva y círculo de progreso de revivir
  if (j.estado === 'caido') {
    const cx = j.x, cy = j.y - 90;
    const R = 30;
    ctx.fillStyle = 'rgba(20,20,40,0.7)';
    ctx.beginPath(); ctx.arc(cx, cy, R + 6, 0, Math.PI * 2); ctx.fill();
    // Tiempo restante (anillo rojo)
    ctx.strokeStyle = '#ff5c5c'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, R + 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (j.tiempoCaido / CONFIG.revivir.tiempoCaido)); ctx.stroke();
    // Progreso de revivir (anillo verde)
    if (j.progresoRevivir > 0) {
      ctx.strokeStyle = '#6dff8b'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(cx, cy, R - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (j.progresoRevivir / CONFIG.revivir.tiempoRevivir)); ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Trebuchet MS", Arial';
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(j.tiempoCaido), cx, cy + 8);
    const m = j.mundo;
    const txt = m.revivesUsados >= CONFIG.revivir.maxPorNivel ? 'Sin revivires' : '¡Revíveme!';
    ctx.font = 'bold 14px "Trebuchet MS", Arial';
    ctx.lineWidth = 3; ctx.strokeStyle = '#1a1a2e';
    ctx.strokeText(txt, cx, cy - R - 12);
    ctx.fillStyle = m.revivesUsados >= CONFIG.revivir.maxPorNivel ? '#ff8080' : '#ffe066';
    ctx.fillText(txt, cx, cy - R - 12);
  }
}

function dibujarSombraJugador(ctx, j) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  const sueloY = j.mundo.sueloY;
  const dist = Math.max(0, (j.enSuelo ? j.y : sueloY) - j.y);
  const k = Math.max(0.3, 1 - dist / 500);
  ctx.beginPath(); ctx.ellipse(j.x, j.enSuelo ? j.y : sueloY, 30 * k, 7 * k, 0, 0, Math.PI * 2); ctx.fill();
}

/* =====================================================================
   HOJAS DE SPRITES ANIMADAS EN EL JUEGO
   Usa las mismas hojas, cuadros y escalas que prueba-personajes.html
   (js/prueba/animaciones.js). Una sola escala por personaje; para mirar
   a la izquierda se voltea el sprite. La ropa de la tienda todavía no se
   dibuja sobre las hojas animadas (hace falta ubicarla cuadro por cuadro).
   ===================================================================== */
const HOJAS_JUEGO = {
  altoReferencia: 112,   // alto en el mundo de un cuadro de "caminar"
  pxReferencia: 410,     // alto en la hoja de un cuadro de "caminar"
  cacheTintes: new Map(),

  listas(p) {
    const d = typeof Cuadros !== 'undefined' && Cuadros.datos[p];
    return !!(d && d.reposo && d.reposo.cuadros.length);
  },
  tiene(p, anim) { const d = Cuadros.datos[p][anim]; return !!(d && d.cuadros.length); },

  duracion(p, anim) {
    const def = PRUEBA_CONFIG.animaciones[anim];
    const n = this.tiene(p, anim) ? Cuadros.datos[p][anim].cuadros.length : 1;
    return Math.max(n / def.fps, def.duracionMinima || 0);
  },

  // Qué animación toca según el estado del jugador. Devuelve { nombre, t0, bucle }
  elegir(j) {
    const m = j.mundo, d = j.animDisparo;
    if (j.estado === 'caido' || j.estado === 'muerto') return { nombre: 'caido', clave: 'caido' };
    const acc = j.accion && j.accion.tipo;
    if (acc === 'dash') return { nombre: 'dash', clave: 'dash' };
    if (acc === 'torbellino') return { nombre: 'doble_salto', clave: 'torbellino', bucle: true };
    if (acc === 'cataclismo' && !j.enSuelo) return { nombre: 'doble_salto', clave: 'cataclismo', bucle: true };
    if (d && m.tiempo - d.t < this.duracion(j.personaje, d.nombre)) {
      return { nombre: d.nombre, clave: d.nombre + d.t, t0: d.t };
    }
    if (j.aturdido > 0) return { nombre: 'herido', clave: 'herido' + Math.round(j.ultimoDanio * 1000), t0: j.ultimoDanio };
    if (!j.enSuelo) return { nombre: 'saltar', clave: 'saltar' };
    if (j.agachado) return { nombre: 'agacharse', clave: 'agacharse' };
    if (Math.abs(j.vx) > 40) return { nombre: 'caminar', clave: 'caminar' };
    return { nombre: 'reposo', clave: 'reposo' };
  },

  // Cuadro actual. Guarda en j.vis cuándo empezó la animación.
  cuadro(j) {
    const m = j.mundo;
    const e = this.elegir(j);
    if (!j.vis || j.vis.clave !== e.clave) j.vis = { clave: e.clave, t0: e.t0 ?? m.tiempo };
    const p = j.personaje;
    let nombre = e.nombre, sustituto = false;
    if (!this.tiene(p, nombre)) { nombre = 'reposo'; sustituto = true; } // p. ej. salto de Bubu: se hace por código
    const hoja = Cuadros.datos[p][nombre];
    const def = PRUEBA_CONFIG.animaciones[nombre];
    const n = hoja.cuadros.length;
    let i = sustituto ? 0 : Math.floor((m.tiempo - j.vis.t0) * def.fps);
    i = (e.bucle || def.modo === 'bucle') ? ((i % n) + n) % n : Math.max(0, Math.min(i, n - 1));
    // Se reutiliza el mismo objeto del jugador (se pide en cada cuadro)
    const r = j._infoCuadro || (j._infoCuadro = {});
    r.hoja = hoja; r.cuadro = hoja.cuadros[i]; r.nombre = e.nombre; r.sustituto = sustituto;
    return r;
  },

  escala(p, hoja) {
    return (this.altoReferencia / this.pxReferencia) * PRUEBA_CONFIG.escalaPersonaje[p] * hoja.cfg.escala;
  },

  // Copia de un cuadro de un solo color (destello al recibir daño / estela)
  tinte(hoja, c, color, escala) {
    const clave = hoja.cfg.archivo + '|' + c.x + '|' + color;
    let lienzo = this.cacheTintes.get(clave);
    if (!lienzo) {
      if (typeof Depuracion !== 'undefined' && !this.precargando) Depuracion.primeraVez('destello ' + hoja.cfg.archivo.split('/').pop());
      const k = Math.min(1, escala * 2);
      lienzo = document.createElement('canvas');
      lienzo.width = Math.max(1, Math.round(c.w * k)); lienzo.height = Math.max(1, Math.round(c.h * k));
      const x = lienzo.getContext('2d');
      PERSONAJES.dibujarCuadro(x, hoja, c, 0, 0, lienzo.width, lienzo.height);
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = color;
      x.fillRect(0, 0, lienzo.width, lienzo.height);
      this.cacheTintes.set(clave, lienzo);
    }
    return lienzo;
  },
};

// Dibuja un cuadro con los pies en (0,0)
function dibujarCuadroHoja(ctx, hoja, c, escala, dir, imagen) {
  ctx.save();
  ctx.scale(dir * escala, escala);
  if (imagen) ctx.drawImage(imagen, c.x - c.pieX, c.y - c.pieY, c.w, c.h);
  else PERSONAJES.dibujarCuadro(ctx, hoja, c, c.x - c.pieX, c.y - c.pieY, c.w, c.h);
  ctx.restore();
}

function dibujarJugadorAnimado(ctx, j, t) {
  const a = j.anim;
  const info = HOJAS_JUEGO.cuadro(j);
  if (!info.cuadro) return;
  const esc = HOJAS_JUEGO.escala(j.personaje, info.hoja);

  // Estela del dash y combos (siluetas blancas)
  if (j.estela.length > 1) {
    const blanco = HOJAS_JUEGO.tinte(info.hoja, info.cuadro, '#ffffff', esc);
    j.estela.forEach((p, i) => {
      ctx.save();
      ctx.globalAlpha = (i / j.estela.length) * 0.35;
      ctx.translate(p.x, p.y);
      dibujarCuadroHoja(ctx, info.hoja, info.cuadro, esc, j.dir, blanco);
      ctx.restore();
    });
  }

  ctx.save();
  // Rebote leve solo en reposo (las hojas de caminar ya traen su movimiento)
  const rebote = info.nombre === 'reposo' ? Math.sin(t * 3) * 2 : 0;
  ctx.translate(j.x, j.y + rebote);
  if (j.estado === 'muerto') ctx.globalAlpha = 0.5;
  else if (j.invulnerable > 0 && Math.floor(t * 20) % 2 === 0) ctx.globalAlpha = 0.55;
  if (j.estado === 'normal') ctx.rotate(a.inclinacion * 0.6);
  // Salto por código (personaje sin hoja de salto): estirar al despegar y aplastar al caer
  if (info.sustituto && info.nombre === 'saltar' || (!HOJAS_JUEGO.tiene(j.personaje, 'saltar') && (info.nombre === 'reposo' || info.nombre === 'caminar'))) {
    ctx.scale(a.sx, a.sy);
  }
  dibujarCuadroHoja(ctx, info.hoja, info.cuadro, esc, j.dir);
  // Destello al recibir daño
  if (a.flash > 0) {
    ctx.globalAlpha *= Math.min(1, a.flash * 1.2);
    dibujarCuadroHoja(ctx, info.hoja, info.cuadro, esc, j.dir, HOJAS_JUEGO.tinte(info.hoja, info.cuadro, a.flash > 0.4 ? '#ff3b3b' : '#ffffff', esc));
  }
  ctx.restore();
}
