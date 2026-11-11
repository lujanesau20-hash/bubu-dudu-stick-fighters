/* =====================================================================
   HUD: barras de vida (verde, grande, arriba), energía (azul, debajo),
   habilidades, monedas, revivires, barra del jefe y marcador de versus.
   Efecto "barra de daño": la parte perdida queda roja y baja suave.
   ===================================================================== */
class HUD {
  constructor() {
    this.barras = {}; // índice -> { vidaMostrada, rastro, espera }
    this.jefe = { rastro: 1, espera: 0 };
  }

  reiniciar() { this.barras = {}; this.jefe = { rastro: 1, espera: 0 }; }

  actualizar(dt, m) {
    for (const j of m.jugadores) {
      const b = this.barras[j.indice] || (this.barras[j.indice] = { vida: j.vida / j.vidaMax, rastro: j.vida / j.vidaMax, espera: 0, ultimaVida: j.vida });
      const real = j.vida / j.vidaMax;
      if (j.vida < b.ultimaVida) b.espera = 0.45;   // recibió daño: el rojo espera un instante
      b.ultimaVida = j.vida;
      b.vida = real > b.vida ? U.lerp(b.vida, real, Math.min(1, dt * 6)) : real; // curar sube suave
      if (b.espera > 0) b.espera -= dt;
      else b.rastro = Math.max(b.vida, b.rastro - dt * 0.5);
      if (b.rastro < b.vida) b.rastro = b.vida;
    }
    if (m.jefe) {
      const real = Math.max(0, m.jefe.vida / m.jefe.vidaMax);
      if (m.jefe.anim.flash > 0.9) this.jefe.espera = 0.45;
      if (this.jefe.espera > 0) this.jefe.espera -= dt;
      else this.jefe.rastro = Math.max(real, this.jefe.rastro - dt * 0.35);
    }
  }

  dibujar(ctx, m, W, H, efectos, esTactil) {
    const s = U.clamp(H / 720, 0.55, 1.4);
    this.fondoIconos = 0; // parte de abajo de los cuadros de habilidades (para no tapar la barra del jefe)
    const margen = 16 * s;
    const anchoBarra = Math.min(440 * s, W * 0.34);
    // Si el botón "Pausa" está visible, el bloque del jugador 2 se corre a la izquierda para no quedar tapado
    const cp = CONFIG.interfaz.botonPausa;
    let apartar = 0, anchoPausa = 0;
    if (typeof Pausa !== 'undefined' && Pausa.visible && Pausa.medidasBoton) {
      const mb = Pausa.medidasBoton();
      anchoPausa = (mb.ancho + mb.margen + 4) * (W / Math.max(1, window.innerWidth));
      if (cp.apartarHudJugador2) apartar = Math.max(0, anchoPausa - margen);
    }
    // Texto "Nivel X · Tramo Y/Z": tamaño y lugar (más grande en celular, sin tocar barras ni Pausa)
    this.tramo = this.medidaTramo(ctx, m, W, s, esTactil, margen, anchoBarra, apartar, anchoPausa);
    // Celular: habilidades y combos en una sola fila y HUD de como máximo 25% del alto
    // (config/interfaz.js -> hudCelular). En laptop todo sigue igual.
    this._unaFila = !!(esTactil && CONFIG.interfaz.hudCelular.unaFila);
    // Zonas que los cuadros de habilidades no deben tapar (joystick, botones, Pausa, monedas/nivel)
    this.obstaculos = this.medirObstaculos(ctx, m, W, H, s, esTactil, margen);
    if (this.rectsIconos) this.rectsIconos.length = 0; else this.rectsIconos = [];
    // Cuadros de habilidades: la MISMA escala para los dos jugadores (la mayor que quepa en ambos lados)
    this.layIconos = this.acomodarTodos(m, W, H, s, esTactil, margen, anchoBarra, apartar);
    m.jugadores.forEach((j) => {
      const derecha = j.indice === 1;
      this.barraJugador(ctx, j, derecha ? W - margen - anchoBarra - apartar : margen, margen, anchoBarra, s, derecha, efectos, esTactil, m);
    });

    // Monedas (arriba al centro)
    if (m.modo !== 'versus') {
      const pulso = 1 + efectos.monedasHud * 0.25;
      ctx.save();
      ctx.translate(W / 2, margen + 18 * s);
      ctx.scale(pulso, pulso);
      ctx.fillStyle = '#ffcf33'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(-34 * s, 0, 13 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      this.texto(ctx, String(Guardado.datos.monedas + (m.monedasGuardadas ? 0 : m.monedasGanadas)), -14 * s, 9 * s, 26 * s, '#ffffff', 'left');
      ctx.restore();
      if (m.modo === 'pareja') {
        const quedan = CONFIG.revivir.maxPorNivel - m.revivesUsados;
        let txt = 'Revivir: ';
        for (let i = 0; i < CONFIG.revivir.maxPorNivel; i++) txt += i < quedan ? '♥' : '♡';
        const rv = this.medidaRevivir(s, esTactil);
        this.texto(ctx, txt, W / 2, margen + rv.y * s, rv.tam * s, quedan ? '#ff8fab' : '#999', 'center');
      }
    } else {
      // Marcador de rondas
      this.texto(ctx, `RONDA ${m.ronda}`, W / 2, margen + 26 * s, 26 * s, '#ffffff', 'center');
      for (let i = 0; i < 2; i++) {
        for (let r = 0; r < CONFIG.versus.rondasParaGanar; r++) {
          const x = W / 2 + (i === 0 ? -1 : 1) * (40 + r * 26) * s;
          ctx.fillStyle = m.rondas[i] > r ? (i === 0 ? '#4dabf7' : '#ff6b9a') : 'rgba(255,255,255,0.25)';
          ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(x, margen + 50 * s, 9 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      }
    }

    // Indicador "Nivel X · Tramo Y/Z" (tamaño y lugar calculados en medidaTramo)
    if (this.tramo) this.texto(ctx, this.tramo.texto, W / 2, this.tramo.y, this.tramo.tam, '#e9ecef', 'center', true);

    // Barra del jefe
    if (m.jefe && m.jefe.estado !== 'entrando' && (m.jefe.vivo || m.jefe.tiempoMuerto < 2)) {
      const w = Math.min(W * 0.55, 700 * s), h = 18 * s;
      // Si no cabe entre las barras de los jugadores, va debajo de ellas
      // (tampoco cabe arriba si los cuadros de habilidades llegan hasta donde iría la barra)
      const yArriba = margen + (m.modo === 'pareja' ? 84 : 62) * s;
      const rectArriba = { x: (W - w) / 2 - 3, y: yArriba - 24 * s, w: w + 6, h: h + 30 * s };
      const cabeArriba = w < W - 2 * (anchoBarra + margen * 2) && !this.rectsIconos.some((r) => this.chocan(r, rectArriba));
      // Si no cabe arriba, va debajo de las barras y de los cuadros de habilidades (más grandes en celular)
      const x = (W - w) / 2, y = cabeArriba ? margen + (m.modo === 'pareja' ? 84 : 62) * s : Math.max(margen + 196 * s, this.fondoIconos + 30 * s);
      const real = Math.max(0, m.jefe.vida / m.jefe.vidaMax);
      this.texto(ctx, m.jefe.nombre, W / 2, y - 6 * s, 18 * s, m.jefe.fase2 ? '#ff6b6b' : '#ffd84d', 'center');
      ctx.fillStyle = 'rgba(10,10,25,0.75)';
      U.rectRedondo(ctx, x - 3, y - 3, w + 6, h + 6, 6); ctx.fill();
      ctx.fillStyle = '#ff3b3b';
      ctx.fillRect(x, y, w * this.jefe.rastro, h);
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#c77dff'); g.addColorStop(1, '#7b2cbf');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w * real, h);
    }

    // Aviso para avanzar
    if (m.avisoAvanzar > 0 && Math.floor(m.avisoAvanzar * 3) % 2 === 0) {
      this.texto(ctx, '¡ADELANTE! ➜', W - margen - 10, H * 0.45, 40 * s, '#ffe066', 'right');
    }

    // Ayuda de revivir
    if (m.modo === 'pareja') {
      const caido = m.jugadores.find((j) => j.estado === 'caido');
      const comp = caido && m.jugadores.find((j) => j !== caido && j.vivo);
      if (comp && Math.abs(comp.x - caido.x) <= CONFIG.revivir.distancia && m.revivesUsados < CONFIG.revivir.maxPorNivel) {
        const tecla = esTactil && comp.indice === 0 ? 'el botón ♥' : comp.indice === 0 ? 'E' : 'Shift der. / Enter';
        this.texto(ctx, `Mantén ${tecla} para revivir`, W / 2, H * 0.68, 24 * s, '#7dff9b', 'center');
      }
    }
  }

  barraJugador(ctx, j, x, y, ancho, s, derecha, efectos, esTactil, m) {
    const b = this.barras[j.indice] || { vida: 1, rastro: 1 };
    const altoVida = 30 * s, altoEnergia = 13 * s;
    const retrato = 58 * s;
    const bx = derecha ? x : x + retrato + 8 * s;
    const bw = ancho - retrato - 8 * s;
    const rx = derecha ? x + ancho - retrato : x;
    const colorJ = j.indice === 0 ? '#4dabf7' : '#ff6b9a';

    // Retrato
    ctx.save();
    ctx.fillStyle = 'rgba(15,15,35,0.7)';
    ctx.strokeStyle = colorJ; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.arc(rx + retrato / 2, y + retrato / 2, retrato / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.clip();
    ctx.translate(rx + retrato / 2, y + retrato * 1.05);
    if (!j.vivo) ctx.globalAlpha = 0.4;
    dibujarSpritePersonaje(ctx, j.personaje, Guardado.equipo(j.personaje), retrato * 1.05, { dir: derecha ? -1 : 1 });
    ctx.restore();

    // Nombre
    const nombre = CONFIG.personajes[j.personaje].nombre;
    this.texto(ctx, nombre, derecha ? bx + bw : bx, y + 2 * s, 17 * s, colorJ, derecha ? 'right' : 'left', true);
    this.texto(ctx, `${Math.ceil(j.vida)}/${j.vidaMax}`, derecha ? bx : bx + bw, y + 2 * s, 14 * s, '#ffffff', derecha ? 'left' : 'right', true);

    // Vida
    const vy = y + 8 * s;
    ctx.fillStyle = 'rgba(10,10,25,0.75)';
    U.rectRedondo(ctx, bx - 3, vy - 3, bw + 6, altoVida + 6, 8 * s); ctx.fill();
    const llenar = (frac, color) => {
      const w = bw * U.clamp(frac, 0, 1);
      if (w <= 0) return;
      ctx.fillStyle = color;
      U.rectRedondo(ctx, derecha ? bx + bw - w : bx, vy, w, altoVida, 6 * s); ctx.fill();
    };
    llenar(b.rastro, '#ff3b3b');                       // parte perdida en rojo
    const g = ctx.createLinearGradient(0, vy, 0, vy + altoVida);
    const baja = b.vida < 0.3;
    g.addColorStop(0, baja ? '#ffe066' : '#8dff6a');
    g.addColorStop(1, baja ? '#f59f00' : '#2fb344');
    llenar(b.vida, g);
    // Brillo
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(bx + 4, vy + 3, bw - 8, altoVida * 0.25);

    // Energía (tiembla si no alcanza)
    const temblor = (efectos.alertasEnergia[j.indice] || 0) > 0 ? Math.sin(performance.now() / 20) * 4 : 0;
    const ey = vy + altoVida + 7 * s;
    ctx.fillStyle = 'rgba(10,10,25,0.75)';
    U.rectRedondo(ctx, bx - 3 + temblor, ey - 3, bw + 6, altoEnergia + 6, 5 * s); ctx.fill();
    const fe = j.energia / CONFIG.energia.max;
    const we = bw * fe;
    const ge = ctx.createLinearGradient(0, ey, 0, ey + altoEnergia);
    // COMBO: hay maná para la combinación más barata (config/balance.js)
    const minCombo = Math.min(...CONFIG.combos.lista.map((c) => c.energia)) / CONFIG.energia.max;
    const lista = fe >= minCombo;
    ge.addColorStop(0, lista ? '#a5f3ff' : '#74c0fc');
    ge.addColorStop(1, lista ? '#22b8cf' : '#1c7ed6');
    ctx.fillStyle = ge;
    if (we > 0) { U.rectRedondo(ctx, (derecha ? bx + bw - we : bx) + temblor, ey, we, altoEnergia, 4 * s); ctx.fill(); }
    // Marca de "combo disponible"
    const mx = derecha ? bx + bw * (1 - minCombo) : bx + bw * minCombo;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mx - 1 + temblor, ey - 2, 2, altoEnergia + 4);
    if (lista && Math.floor(performance.now() / 300) % 2 === 0) {
      this.texto(ctx, 'COMBO', derecha ? bx - 6 : bx + bw + 6, ey + altoEnergia, 12 * s, '#a5f3ff', derecha ? 'right' : 'left', true);
    }

    // Habilidades (fila 1) y combinaciones (fila 2), en PC y en celular.
    // Cada ícono: sombra de enfriamiento que baja + segundos, costo de maná debajo,
    // y apagado si no hay maná suficiente.
    // Tamaño y opacidad de los indicadores (config/interfaz.js): más grandes en celular
    const ch = CONFIG.interfaz.habilidades;
    const fila1 = ey + altoEnergia + 8 * s;
    // Escala y lugar de las dos filas: se achican o se corren solos si tapan algo
    const lay = (this.layIconos && this.layIconos[j.indice]) || this.acomodarIconos(s * (esTactil ? ch.escalaCelular : ch.escalaLaptop), bx, bw, fila1, derecha);
    const si = lay.si, tam = 30 * si, sep = 7 * si;
    const fila2 = lay.fila2;
    ctx.save();
    ctx.globalAlpha = ch.opacidad;
    // En línea cada persona usa los controles de un jugador (m.mapasHud); el remoto se muestra como H1..H4
    const mapa = m.mapasHud ? m.mapasHud[j.indice] : m.jugadores.length > 1 ? (j.indice === 0 ? CONFIG.controles.j1 : CONFIG.controles.j2) : CONFIG.controles.solo;
    const tactilJ1 = !mapa || (esTactil && j.indice === (m.indiceLocal || 0));
    const posX = (i) => (derecha ? bx + bw - (i + 1) * (tam + sep) + sep : bx + i * (tam + sep));
    const posX2 = (k) => lay.x2 + k * (tam + sep); // fila de combos (de izquierda a derecha)
    const nCombos = CONFIG.combos.lista.length;
    const nombreTecla = (i) => (tactilJ1 ? 'H' + (i + 1) : mapa.habilidades[i][0].replace('Digit', '').replace('Numpad', 'N').replace('Key', ''));
    CONFIG.habilidades.forEach((h, i) => {
      this.iconoHabilidad(ctx, posX(i), fila1, tam, si, h.icono, h.energia, j.energia,
        j.enfriamientos[i], h.enfriamiento, nombreTecla(i));
    });
    CONFIG.combos.lista.forEach((c, k) => {
      const [a, b] = c.habilidades;
      const etiqueta = tactilJ1 ? `H${a + 1}+H${b + 1}` : `${nombreTecla(a)}+${nombreTecla(b)}`;
      // El jugador 2 (a la derecha) ordena los combos de derecha a izquierda, como antes
      this.iconoHabilidad(ctx, posX2(derecha ? nCombos - 1 - k : k), fila2, tam, si, c.icono || '✦', c.energia, j.energia,
        j.enfriamientosCombo ? j.enfriamientosCombo[k] : 0, c.enfriamiento || 0, etiqueta, true, esTactil && CONFIG.interfaz.hudCelular.etiquetaComboAbajo);
    });
    ctx.restore();
    this.fondoIconos = Math.max(this.fondoIconos || 0, fila2 + tam + 12 * si);
    for (const r of lay.rects) this.rectsIconos.push(r);
  }

  // Texto "Nivel X · Tramo Y/Z": escala de config/interfaz.js -> textoTramo (celular / laptop).
  // Va debajo de las monedas (o de "Revivir ♥♥" en pareja) y se achica si no cabe entre
  // las barras de vida (con su aviso COMBO) y el botón Pausa. Nunca más chico que en laptop.
  medidaTramo(ctx, m, W, s, esTactil, margen, anchoBarra, apartar, anchoPausa) {
    if (m.modo === 'versus' || !m.totalTramos || (m.jefe && m.jefe.vivo)) return null;
    const enJefe = m.escenario.zonaJefe && m.indiceOleada >= m.totalTramos && !m.oleada;
    const txt = enJefe ? 'Jefe final ➜' : `Tramo ${Math.max(1, m.tramoActual || 0)}/${m.totalTramos}`;
    const texto = (m.escenario.nombreCorto ? m.escenario.nombreCorto + ' · ' : '') + txt;
    // Se guarda el resultado mientras no cambie el texto ni la pantalla (no se mide en cada cuadro)
    const clave = `${texto}|${W}|${s}|${esTactil}|${m.modo}|${m.jugadores.length}|${Math.round(apartar)}|${Math.round(anchoPausa)}`;
    if (this._tramoClave === clave) return this._tramoMedida;
    const ct = CONFIG.interfaz.textoTramo;
    const base = 15 * s;
    let tam = base * (esTactil ? ct.escalaCelular : ct.escalaLaptop);
    const bordeIzq = margen + anchoBarra + 56 * s;    // barra del jugador 1 + "COMBO"
    const bordeDer = m.jugadores.length > 1 ? W - margen - anchoBarra - apartar - 56 * s : W - anchoPausa - 8 * s;
    const mitadLibre = Math.min(W / 2 - bordeIzq, bordeDer - W / 2);
    ctx.font = `bold ${tam}px "Trebuchet MS", Arial`;
    let ancho = ctx.measureText(texto).width;
    if (mitadLibre > 0 && ancho / 2 > mitadLibre) {
      const k = Math.max(base / tam, (2 * mitadLibre) / ancho);
      tam *= k; ancho *= k;
    }
    const rvAbajo = this.medidaRevivir(s, esTactil).abajo;
    let arriba = margen + (m.modo === 'pareja' ? rvAbajo : 36) * s; // borde de abajo de "Revivir" o de las monedas
    if (esTactil && m.modo === 'pareja') arriba += CONFIG.interfaz.hudCelular.separacionRevivirTramo * s; // celular: más aire
    const y = Math.max(margen + (m.modo === 'pareja' ? 80 + (rvAbajo - 64) : 58) * s, arriba + tam * 0.8);
    this._tramoClave = clave;
    this._tramoMedida = { texto, tam, y, mitad: ancho / 2 + tam * 0.2, abajo: y + tam * 0.3 };
    return this._tramoMedida;
  }

  // Texto "Revivir ♥♥": tamaño y línea base (en unidades de "s"). Escala de config/interfaz.js -> textoRevivir.
  // Con escala 1 queda igual que antes (18 de alto, línea en 58, borde de abajo en 64).
  medidaRevivir(s, esTactil) {
    const cr = CONFIG.interfaz.textoRevivir;
    const tam = 18 * (cr ? (esTactil ? cr.escalaCelular : cr.escalaLaptop) : 1);
    return { tam, y: 40 + tam, abajo: 46 + tam };
  }

  // ¿Se tocan dos rectángulos {x, y, w, h}?
  chocan(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  // Zonas prohibidas para los cuadros de habilidades, en px del lienzo.
  // Los rectángulos de la página (joystick, botones, Pausa) se leen como mucho 1 vez por segundo.
  medirObstaculos(ctx, m, W, H, s, esTactil, margen) {
    const ch = CONFIG.interfaz.habilidades;
    const k = W / Math.max(1, window.innerWidth); // px de pantalla -> px del lienzo
    const pad = ch.separacionObstaculos * k;
    const ahora = performance.now();
    const pausaVisible = typeof Pausa !== 'undefined' && Pausa.visible && Pausa.boton;
    const iconoPC = typeof PantallaCompleta !== 'undefined' ? PantallaCompleta.iconoVisible() : null;
    const c = this._cacheDom;
    const clave = `${W}x${H}|${esTactil}|${!!pausaVisible}|${!!iconoPC}`;
    if (!c || c.clave !== clave || ahora - c.t > 1000) {
      const rects = [];
      const agregar = (el) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) rects.push({ x: r.left * k - pad, y: r.top * k - pad, w: r.width * k + 2 * pad, h: r.height * k + 2 * pad });
      };
      if (pausaVisible) agregar(Pausa.boton);
      if (iconoPC) agregar(iconoPC); // icono de pantalla completa (debajo de "Pausa")
      const tactil = esTactil && document.getElementById('tactil');
      if (tactil) {
        tactil.querySelectorAll('.btn-hab, .btn-salto, .btn-revivir').forEach(agregar);
        // Joystick: se mide en su lugar de reposo (al tocar se mueve a donde está el dedo)
        const base = tactil.querySelector('.joy-base');
        if (base && base.closest('.joy-zona.fija')) agregar(base); // joystick fijo: siempre en su lugar
        else if (base) {
          const L = base.style.left, T = base.style.top;
          base.style.left = ''; base.style.top = '';
          agregar(base);
          base.style.left = L; base.style.top = T;
        }
      }
      this._cacheDom = { clave, t: ahora, rects };
    }
    // Centro de arriba: monedas, "Revivir ♥♥", "Tramo X/Y" o marcador de versus.
    // Los anchos de texto se guardan (no se mide el mismo texto en cada cuadro).
    const anchos = this._anchosTexto || (this._anchosTexto = new Map());
    const medir = (t, tam, fino) => {
      const k2 = `${fino ? 1 : 0}|${tam}|${t}`;
      let w = anchos.get(k2);
      if (w == null) {
        ctx.font = `${fino ? 'bold' : '900'} ${tam}px "Trebuchet MS", Arial`; w = ctx.measureText(t).width;
        if (anchos.size > 200) anchos.clear();
        anchos.set(k2, w);
      }
      return w;
    };
    let mitad, abajo;
    if (m.modo === 'versus') {
      mitad = Math.max(medir(`RONDA ${m.ronda}`, 26 * s) / 2, (40 + CONFIG.versus.rondasParaGanar * 26) * s);
      abajo = margen + 62 * s;
    } else {
      const monedas = String(Guardado.datos.monedas + (m.monedasGuardadas ? 0 : m.monedasGanadas));
      mitad = Math.max(47 * s, -14 * s + medir(monedas, 26 * s)) * 1.25; // 1.25: las monedas laten al ganar
      abajo = margen + 34 * s;
      if (m.modo === 'pareja') { const rv = this.medidaRevivir(s, esTactil); mitad = Math.max(mitad, medir('Revivir: ♥♥♥', rv.tam * s) / 2); abajo = margen + rv.abajo * s; }
      if (this.tramo) { mitad = Math.max(mitad, this.tramo.mitad); abajo = Math.max(abajo, this.tramo.abajo); }
    }
    this._limiteAlto = H * (esTactil ? CONFIG.interfaz.hudCelular.altoMaximo : ch.altoMaximo);
    this._centro = W / 2;
    this._pad = pad;
    // La lista solo se arma de nuevo si cambió algo (así no se crean objetos en cada cuadro)
    const claveObst = `${this._cacheDom.t}|${Math.round(mitad)}|${Math.round(abajo)}`;
    if (claveObst === this._claveObst && this._obstLista) return this._obstLista;
    const lista = this._cacheDom.rects.slice();
    lista.push({ x: W / 2 - mitad - pad, y: 0, w: 2 * (mitad + pad), h: abajo + pad });
    this._claveObst = claveObst;
    this._obstLista = lista;
    return lista;
  }

  // Acomodo de los cuadros de todos los jugadores con UNA sola escala: se busca la que cabe
  // en cada lado y se usa la menor para los dos (antes cada lado se achicaba por su cuenta y el
  // jugador 2 quedaba más chico por los botones táctiles y el centro). Se guarda hasta que cambie
  // la pantalla o algún obstáculo (no se recalcula en cada cuadro).
  acomodarTodos(m, W, H, s, esTactil, margen, anchoBarra, apartar) {
    const ch = CONFIG.interfaz.habilidades;
    const deseada = s * (esTactil ? ch.escalaCelular : ch.escalaLaptop);
    const minima = deseada * ch.achicarHasta;
    const clave = `${W}|${H}|${esTactil}|${this._unaFila}|${m.jugadores.length}|${Math.round(apartar)}|${this._claveObst}|${deseada}`;
    if (this._layClave === clave) return this._lay;
    const retrato = 58 * s;
    const geos = m.jugadores.map((j) => {
      const derecha = j.indice === 1;
      const x = derecha ? W - margen - anchoBarra - apartar : margen;
      // Igual que en barraJugador: barra al lado del retrato y cuadros debajo del maná
      return { indice: j.indice, derecha, bx: derecha ? x : x + retrato + 8 * s, bw: anchoBarra - retrato - 8 * s, fila1: margen + 66 * s };
    });
    let si = deseada;
    for (let vuelta = 0; vuelta < 4; vuelta++) {
      let menor = si;
      for (const g of geos) menor = Math.min(menor, this.acomodarIconos(si, g.bx, g.bw, g.fila1, g.derecha, minima).si);
      if (menor >= si - 1e-6) break;
      si = menor;
    }
    const lay = {};
    for (const g of geos) lay[g.indice] = this.acomodarIconos(si, g.bx, g.bw, g.fila1, g.derecha, si);
    this._layClave = clave; this._lay = lay;
    return lay;
  }

  // Busca la escala más grande (hasta la de la configuración) en la que las dos filas
  // no tapan nada. Fila 1 = habilidades, fila 2 = combos (se puede correr hacia el centro).
  acomodarIconos(siDeseada, bx, bw, fila1, derecha, siMinima = siDeseada * CONFIG.interfaz.habilidades.achicarHasta) {
    const ch = CONFIG.interfaz.habilidades;
    const obst = this.obstaculos || [];
    const nH = CONFIG.habilidades.length, nC = CONFIG.combos.lista.length;
    const libre = (r) => r.y + r.h <= this._limiteAlto && r.x >= 0 &&
      (derecha ? r.x >= this._centro + this._pad : r.x + r.w <= this._centro - this._pad) &&
      !obst.some((o) => this.chocan(r, o));
    let ultimo = null;
    for (let f = 1; siDeseada * f >= siMinima - 1e-6; f -= 0.05) {
      const si = siDeseada * f, tam = 30 * si, sep = 7 * si;
      const alto = tam + 15 * si; // cuadro + costo de maná debajo
      const ancho1 = nH * tam + (nH - 1) * sep, ancho2 = nC * tam + (nC - 1) * sep;
      const r1 = { x: derecha ? bx + bw - ancho1 : bx, y: fila1, w: ancho1, h: alto };
      let fila2 = fila1 + tam + 16 * si;
      // Lugar normal de la fila 2: medio cuadro hacia adentro
      let x2 = derecha ? bx + bw - tam / 2 - ancho2 : bx + tam / 2;
      if (this._unaFila) {
        // Celular: los combos van en la MISMA fila, al lado de las habilidades (hacia el centro)
        const gap = CONFIG.interfaz.hudCelular.separacionGrupos * si;
        fila2 = fila1;
        x2 = derecha ? r1.x - gap - ancho2 : r1.x + ancho1 + gap;
        const r2 = { x: x2, y: fila2, w: ancho2, h: alto };
        ultimo = { si, fila2, x2, rects: [r1, r2] };
        if (libre(r1) && libre(r2)) return ultimo;
        continue;
      }
      ultimo = { si, fila2, x2, rects: [r1, { x: x2, y: fila2, w: ancho2, h: alto }] };
      if (!libre(r1)) continue;
      // Si la fila 2 choca (por ejemplo con el joystick), se corre hacia el centro
      for (let intento = 0; intento < 4; intento++) {
        const r2 = { x: x2, y: fila2, w: ancho2, h: alto };
        if (libre(r2)) return { si, fila2, x2, rects: [r1, r2] };
        const o = obst.find((q) => this.chocan(r2, q));
        if (!o || r2.y + r2.h > this._limiteAlto) break;
        x2 = derecha ? o.x - ancho2 : o.x + o.w;
      }
    }
    return ultimo; // no cabe ni al mínimo: se usa el tamaño mínimo
  }

  // Un ícono de habilidad o combo
  // etiquetaAbajo (combos en celular): "H1+H2" debajo del cuadro y el maná en la esquina,
  // para que el nombre no tape el ícono. En laptop, como siempre.
  iconoHabilidad(ctx, x, y, tam, s, icono, costo, mana, cdRestante, cdTotal, etiqueta, esCombo = false, etiquetaAbajo = false) {
    const sinMana = mana < costo;
    ctx.fillStyle = sinMana ? 'rgba(60,60,70,0.8)' : esCombo ? 'rgba(70,30,80,0.88)' : 'rgba(20,30,60,0.85)';
    U.rectRedondo(ctx, x, y, tam, tam, 6 * s); ctx.fill();
    // Contorno oscuro fino para que se lea sobre cualquier fondo
    ctx.strokeStyle = 'rgba(10,10,25,0.9)'; ctx.lineWidth = CONFIG.interfaz.habilidades.contorno;
    U.rectRedondo(ctx, x, y, tam, tam, 6 * s); ctx.stroke();
    if (esCombo && !sinMana && cdRestante <= 0) {
      ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 1.5;
      U.rectRedondo(ctx, x, y, tam, tam, 6 * s); ctx.stroke();
    }
    ctx.font = `${16 * s}px "Segoe UI Emoji", Arial`;
    ctx.textAlign = 'center';
    const alfa = ctx.globalAlpha; // opacidad general de los indicadores
    ctx.globalAlpha = alfa * (sinMana ? 0.35 : 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(icono, x + tam / 2, y + tam * 0.68);
    ctx.globalAlpha = alfa;
    // Enfriamiento: sombra que baja y segundos restantes
    if (cdRestante > 0 && cdTotal > 0) {
      const k = Math.min(1, cdRestante / cdTotal);
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(x, y + tam * (1 - k), tam, tam * k);
      // Número de enfriamiento: crece con el cuadro y lleva contorno oscuro para leerse bien
      this.texto(ctx, cdRestante >= 1 ? String(Math.ceil(cdRestante)) : cdRestante.toFixed(1), x + tam / 2, y + tam * 0.7, 16 * s, '#ffffff', 'center');
    }
    // Tecla (esquina) y costo de maná (debajo)
    if (etiquetaAbajo) {
      this.texto(ctx, String(costo), x + tam - 2, y + 9 * s, 10 * s, sinMana ? '#ff8f8f' : '#74c0fc', 'right', true);
      this.texto(ctx, etiqueta, x + tam / 2, y + tam + 11 * s, 9 * s, '#ffe066', 'center', true);
      return;
    }
    this.texto(ctx, etiqueta, x + tam - 2, y + 9 * s, (esCombo ? 8 : 10) * s, '#ffe066', 'right', true);
    this.texto(ctx, String(costo), x + tam / 2, y + tam + 11 * s, 10 * s, sinMana ? '#ff8f8f' : '#74c0fc', 'center', true);
  }

  texto(ctx, t, x, y, tam, color, alinear = 'left', fino = false) {
    ctx.font = `${fino ? 'bold' : '900'} ${tam}px "Trebuchet MS", Arial`;
    ctx.textAlign = alinear;
    ctx.lineWidth = Math.max(2, tam / 6);
    ctx.strokeStyle = '#1a1a2e';
    ctx.strokeText(t, x, y);
    ctx.fillStyle = color;
    ctx.fillText(t, x, y);
  }
}
