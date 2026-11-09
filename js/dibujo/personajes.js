/* =====================================================================
   DIBUJO DE BUBU Y DUDU
   Se usan las imágenes originales de assets/personajes (sin redibujar).
   La animación se hace con transformaciones: rebote, escala (estirar y
   aplastar), rotación e inclinación.
   ===================================================================== */
const SPRITES = {
  imagenes: {},   // personaje -> { img, blanco, rojo }

  cargar(alTerminar) {
    const ids = Object.keys(CONFIG.personajes);
    let pendientes = ids.length;
    ids.forEach((id) => {
      const img = new Image();
      img.onload = () => {
        this.imagenes[id] = { img, blanco: this.teñir(img, '#ffffff'), rojo: this.teñir(img, '#ff3b3b') };
        if (--pendientes === 0) this.cargarHojas(alTerminar);
      };
      img.onerror = () => {
        console.warn('No se pudo cargar el sprite de', id);
        if (--pendientes === 0) this.cargarHojas(alTerminar);
      };
      img.src = CONFIG.personajes[id].sprite;
    });
    cargarImagenesRopa();
  },

  // Hojas animadas (bubu/, dudu/). Si fallan, el juego usa el sprite fijo.
  cargarHojas(alTerminar) {
    if (typeof Cuadros === 'undefined') { alTerminar(); return; }
    Cuadros.preferirGuardados = true; // carga rápida con los cuadros ya detectados
    Cuadros.cargarTodo().then(alTerminar, (e) => { console.warn('Hojas animadas no disponibles', e); alTerminar(); });
  },

  // Copia del sprite de un solo color (para el destello al recibir daño)
  teñir(img, color) {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    return c;
  },
};

// Dibuja un personaje en (0,0)=pies con su ropa. Usado en el juego, menús y tienda.
function dibujarSpritePersonaje(ctx, personaje, equipo, alto, opciones = {}) {
  const s = SPRITES.imagenes[personaje];
  const cfg = CONFIG.personajes[personaje];
  if (!s) {
    // Respaldo si falta la imagen
    ctx.fillStyle = cfg.color;
    ctx.beginPath(); ctx.arc(0, -alto / 2, alto / 2, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const w = (alto * s.img.width) / s.img.height;
  const voltear = (opciones.dir || 1) * (cfg.mirandoDerecha ? 1 : -1);
  ctx.save();
  ctx.translate(0, -alto / 2);
  ctx.scale(voltear, 1);
  ctx.drawImage(s.img, -w / 2, -alto / 2, w, alto);
  dibujarRopa(ctx, personaje, equipo, w, alto, opciones.tiempo || 0);
  if (opciones.flash > 0) {
    ctx.globalAlpha = Math.min(1, opciones.flash);
    ctx.drawImage(opciones.flashRojo ? s.rojo : s.blanco, -w / 2, -alto / 2, w, alto);
  }
  ctx.restore();
}

function dibujarJugador(ctx, j, t, equipo, mostrarEtiqueta) {
  const a = j.anim;
  const H = CONFIG.jugador.altoSprite;
  const caido = j.estado === 'caido' || j.estado === 'muerto';

  // Con hojas de sprites animadas (assets/personajes/<nombre>/)
  if (HOJAS_JUEGO.listas(j.personaje)) {
    dibujarSombraJugador(ctx, j);
    dibujarJugadorAnimado(ctx, j, t);
    dibujarExtrasJugador(ctx, j, H * 1.05, mostrarEtiqueta);
    return;
  }

  // Estela del dash / combos
  if (j.estela.length > 1) {
    j.estela.forEach((p, i) => {
      ctx.save();
      ctx.globalAlpha = (i / j.estela.length) * 0.35;
      ctx.translate(p.x, p.y);
      dibujarSpritePersonaje(ctx, j.personaje, equipo, H, { dir: j.dir, flash: 1 });
      ctx.restore();
    });
  }

  dibujarSombraJugador(ctx, j);

  ctx.save();
  ctx.translate(j.x, j.y - (caido ? 0 : a.rebote));

  if (caido) {
    // Tumbado en el suelo: girado 90° con el centro a media altura del sprite acostado
    const s = SPRITES.imagenes[j.personaje];
    const anchoSprite = s ? (H * s.img.width) / s.img.height : H;
    ctx.translate(0, -anchoSprite / 2 + 6);
    ctx.rotate(-j.dir * Math.PI / 2);
    ctx.translate(0, H / 2);
    ctx.globalAlpha = j.estado === 'muerto' ? 0.45 : 0.85;
  } else {
    // Parpadeo de invulnerabilidad
    if (j.invulnerable > 0 && Math.floor(t * 20) % 2 === 0) ctx.globalAlpha = 0.55;
    // Inclinación (pivota en los pies)
    ctx.rotate(a.inclinacion + (a.ataque > 0 ? j.dir * 0.25 * a.ataque : 0));
    // Avance del cuerpo al atacar
    if (a.ataque > 0) ctx.translate(j.dir * 10 * a.ataque, 0);
  }

  // Giro (voltereta del doble salto, torbellino, cataclismo) alrededor del centro
  const giro = a.giro + (a.volteo > 0 ? j.dir * (1 - a.volteo) * Math.PI * 2 : 0);
  ctx.translate(0, -H * a.sy / 2);
  ctx.rotate(giro);
  ctx.scale(a.sx, a.sy);
  ctx.translate(0, H / 2);
  dibujarSpritePersonaje(ctx, j.personaje, equipo, H, {
    dir: j.dir, flash: a.flash * 1.2, flashRojo: a.flash > 0.4, tiempo: t,
  });
  ctx.restore();

  dibujarExtrasJugador(ctx, j, H * a.sy + a.rebote, mostrarEtiqueta);
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
    return { hoja, cuadro: hoja.cuadros[i], nombre: e.nombre, sustituto };
  },

  escala(p, hoja) {
    return (this.altoReferencia / this.pxReferencia) * PRUEBA_CONFIG.escalaPersonaje[p] * hoja.cfg.escala;
  },

  // Copia de un cuadro de un solo color (destello al recibir daño / estela)
  tinte(hoja, c, color, escala) {
    const clave = hoja.cfg.archivo + '|' + c.x + '|' + color;
    let lienzo = this.cacheTintes.get(clave);
    if (!lienzo) {
      const k = Math.min(1, escala * 2);
      lienzo = document.createElement('canvas');
      lienzo.width = Math.max(1, Math.round(c.w * k)); lienzo.height = Math.max(1, Math.round(c.h * k));
      const x = lienzo.getContext('2d');
      x.drawImage(hoja.img, c.x, c.y, c.w, c.h, 0, 0, lienzo.width, lienzo.height);
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
  else ctx.drawImage(hoja.img, c.x, c.y, c.w, c.h, c.x - c.pieX, c.y - c.pieY, c.w, c.h);
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
