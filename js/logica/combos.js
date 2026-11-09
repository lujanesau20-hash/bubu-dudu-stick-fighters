/* =====================================================================
   COMBINACIONES (solo 3)
   - Táctil: deslizar de un botón al vecino (llega como control.combo).
   - Teclado: dos teclas vecinas casi a la vez, o una y luego la otra
     dentro de CONFIG.combos.ventanaMs.
   La primera habilidad sale al instante; si llega la segunda a tiempo,
   se convierte en combinación y se devuelve la energía de la primera.
   ===================================================================== */
const COMBOS = {
  buscar(a, b) {
    const x = Math.min(a, b), y = Math.max(a, b);
    return CONFIG.combos.lista.find((c) => c.habilidades[0] === x && c.habilidades[1] === y);
  },

  // Lee los controles del jugador y dispara habilidades o combinaciones
  procesar(j, c, m, soloCombos = false) {
    if (c.combo && this.intentar(j, c.combo, m)) return;

    const pulsadas = [];
    c.habilidades.forEach((p, i) => { if (p) pulsadas.push(i); });
    if (!pulsadas.length) return;

    // Dos teclas vecinas en el mismo instante
    if (pulsadas.length >= 2) {
      for (let k = 0; k < pulsadas.length - 1; k++) {
        if (pulsadas[k + 1] - pulsadas[k] === 1 && this.intentar(j, [pulsadas[k], pulsadas[k + 1]], m)) return;
      }
    }

    for (const i of pulsadas) {
      // Una tecla y luego la vecina dentro de la ventana
      const u = j.ultimaHabilidad;
      if (u && Math.abs(u.indice - i) === 1 && (m.tiempo - u.tiempo) * 1000 <= CONFIG.combos.ventanaMs) {
        if (this.intentar(j, [u.indice, i], m)) return;
      }
      if (!soloCombos) HABILIDADES.usar(j, i, m);
    }
  },

  intentar(j, par, m) {
    const def = this.buscar(par[0], par[1]);
    if (!def || j.enfriamientoCombo > 0) return false;

    // Devolver la energía de la habilidad que inició la combinación
    let reembolso = 0;
    const u = j.ultimaHabilidad;
    if (u && par.includes(u.indice) && (m.tiempo - u.tiempo) * 1000 <= CONFIG.combos.ventanaTactilMs) reembolso = u.energia;

    if (j.energia + reembolso < def.energia) {
      m.emitir('sinEnergia', { jugador: j.indice, combo: true });
      return false;
    }
    j.energia = Math.min(CONFIG.energia.max, j.energia + reembolso) - def.energia;
    if (reembolso) j.enfriamientos[u.indice] = 0;
    j.ultimaHabilidad = null;
    j.enfriamientoCombo = CONFIG.combos.enfriamiento;
    m.emitir('combo', { nombre: def.nombre, color: def.color, jugador: j.indice, x: j.x, y: j.y - j.alto / 2 });
    this[def.id](j, def, m);
    return true;
  },

  // H1 + H2: la espada lanza una gran onda de corte a distancia
  corteVolador(j, d, m) {
    j.anim.ataque = 1;
    j.animDisparo = { nombre: 'espada', t: m.tiempo };
    j.iniciarAccion({
      tipo: 'corte', invulnerable: true,
      actualizar(jj) { jj.vx *= 0.8; return this.t > 0.28; },
    });
    m.agregarProyectil(new Proyectil({
      duenio: j, tipo: 'corteVolador', x: j.x + j.dir * 50, y: j.y - j.alto * 0.5,
      vx: j.dir * d.velocidad, radio: 62, danio: d.danio, vida: 1.4, perfora: true,
      empujeX: 520, empujeY: 320, color: d.color, chocaSuelo: false,
    }));
    m.emitir('sacudir', { fuerza: 9 });
  },

  // H2 + H3: dash con espada giratoria que daña en 360°
  torbellino(j, d, m) {
    j.vy = -120;
    j.iniciarAccion({
      tipo: 'torbellino', invulnerable: true, sinGravedad: true,
      actualizar(jj, dt) {
        jj.vx = jj.dir * d.velocidad;
        jj.vy = U.aproximar(jj.vy, 0, 600 * dt);
        jj.anim.giro += dt * 32;
        if (this.t >= d.duracion) { jj.vx *= 0.3; jj.anim.giro = 0; return true; }
        return false;
      },
    });
    m.agregarGolpe(new Golpe({
      duenio: j, seguir: j, forma: 'circulo', offX: 0, offY: -j.alto / 2, r: d.radio, radial: true,
      intervalo: d.duracion / d.golpes, danio: d.danio, empujeX: 260, empujeY: 200,
      duracion: d.duracion, color: d.color,
    }));
    m.emitir('torbellino', { jugador: j.indice, duracion: d.duracion, radio: d.radio, color: d.color });
  },

  // H3 + H4: se lanza al aire y cae con una explosión enorme
  cataclismo(j, d, m) {
    j.vx = 0;
    j.iniciarAccion({
      tipo: 'cataclismo', invulnerable: true, sinGravedad: true, fase: 0,
      actualizar(jj, dt) {
        if (this.t < 0.4) { jj.vy = -1150 * (1 - this.t / 0.4) - 150; }
        else if (this.t < 0.7) { jj.vy = 0; jj.anim.giro += dt * 20; }
        else {
          jj.anim.giro = 0;
          this.sinGravedad = false;
          jj.vy = 2400;
          if (jj.enSuelo) {
            m.agregarGolpe(new Golpe({
              duenio: jj, forma: 'circulo', x: jj.x, y: jj.y - 40, r: d.radio, radial: true,
              danio: d.danio, empujeX: d.empuje, empujeY: 700, duracion: 0.12, color: d.color,
            }));
            jj.anim.sy = 0.5; jj.anim.sx = 1.5;
            jj.animDisparo = { nombre: 'golpe_suelo', t: m.tiempo };
            m.emitir('explosion', { x: jj.x, y: jj.y, radio: d.radio, color: d.color });
            m.emitir('sacudir', { fuerza: 30 });
            m.congelar = 0.12;
            return true;
          }
        }
        return this.t > 3;
      },
    });
    m.emitir('sacudir', { fuerza: 6 });
  },
};
