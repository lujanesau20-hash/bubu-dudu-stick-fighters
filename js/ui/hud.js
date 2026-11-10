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
    let apartar = 0;
    if (cp.apartarHudJugador2 && typeof Pausa !== 'undefined' && Pausa.visible && Pausa.medidasBoton) {
      const mb = Pausa.medidasBoton();
      apartar = Math.max(0, (mb.ancho + mb.margen + 4) * (W / Math.max(1, window.innerWidth)) - margen);
    }
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
        this.texto(ctx, txt, W / 2, margen + 58 * s, 18 * s, quedan ? '#ff8fab' : '#999', 'center');
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

    // Indicador pequeño "Tramo X/Y"
    if (m.modo !== 'versus' && m.totalTramos && !(m.jefe && m.jefe.vivo)) {
      const enJefe = m.escenario.zonaJefe && m.indiceOleada >= m.totalTramos && !m.oleada;
      const txt = enJefe ? 'Jefe final ➜' : `Tramo ${Math.max(1, m.tramoActual || 0)}/${m.totalTramos}`;
      const y = margen + (m.modo === 'pareja' ? 80 : 58) * s;
      this.texto(ctx, (m.escenario.nombreCorto ? m.escenario.nombreCorto + ' · ' : '') + txt, W / 2, y, 15 * s, '#e9ecef', 'center', true);
    }

    // Barra del jefe
    if (m.jefe && m.jefe.estado !== 'entrando' && (m.jefe.vivo || m.jefe.tiempoMuerto < 2)) {
      const w = Math.min(W * 0.55, 700 * s), h = 18 * s;
      // Si no cabe entre las barras de los jugadores, va debajo de ellas
      const cabeArriba = w < W - 2 * (anchoBarra + margen * 2);
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
    const si = s * (esTactil ? ch.escalaCelular : ch.escalaLaptop);
    const tam = 30 * si, sep = 7 * si;
    const fila1 = ey + altoEnergia + 8 * s;
    const fila2 = fila1 + tam + 16 * si;
    ctx.save();
    ctx.globalAlpha = ch.opacidad;
    // En línea cada persona usa los controles de un jugador (m.mapasHud); el remoto se muestra como H1..H4
    const mapa = m.mapasHud ? m.mapasHud[j.indice] : m.jugadores.length > 1 ? (j.indice === 0 ? CONFIG.controles.j1 : CONFIG.controles.j2) : CONFIG.controles.solo;
    const tactilJ1 = !mapa || (esTactil && j.indice === (m.indiceLocal || 0));
    const posX = (i) => (derecha ? bx + bw - (i + 1) * (tam + sep) + sep : bx + i * (tam + sep));
    const nombreTecla = (i) => (tactilJ1 ? 'H' + (i + 1) : mapa.habilidades[i][0].replace('Digit', '').replace('Numpad', 'N').replace('Key', ''));
    CONFIG.habilidades.forEach((h, i) => {
      this.iconoHabilidad(ctx, posX(i), fila1, tam, si, h.icono, h.energia, j.energia,
        j.enfriamientos[i], h.enfriamiento, nombreTecla(i));
    });
    CONFIG.combos.lista.forEach((c, k) => {
      const [a, b] = c.habilidades;
      const etiqueta = tactilJ1 ? `H${a + 1}+H${b + 1}` : `${nombreTecla(a)}+${nombreTecla(b)}`;
      this.iconoHabilidad(ctx, posX(k) + (derecha ? -tam / 2 : tam / 2), fila2, tam, si, c.icono || '✦', c.energia, j.energia,
        j.enfriamientosCombo ? j.enfriamientosCombo[k] : 0, c.enfriamiento || 0, etiqueta, true);
    });
    ctx.restore();
    this.fondoIconos = Math.max(this.fondoIconos || 0, fila2 + tam + 12 * si);
  }

  // Un ícono de habilidad o combo
  iconoHabilidad(ctx, x, y, tam, s, icono, costo, mana, cdRestante, cdTotal, etiqueta, esCombo = false) {
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
