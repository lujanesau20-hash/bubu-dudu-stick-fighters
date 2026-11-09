/* =====================================================================
   JEFES DE LOS NIVELES 2, 3 Y 4 (lógica)
   - ARQUERO MAESTRO (cielo): ráfagas de flechas, lluvia de flechas
     avisada en el suelo y saltos hacia atrás si te acercas.
   - MAGO CÓSMICO (espacio): orbes que persiguen, meteoritos avisados en
     el suelo, teletransporte; en furia, anillo de orbes.
   - NINJA SOMBRA (ciudad): cortes veloces que te atraviesan, abanico de
     shurikens y desaparece para salir detrás de ti.
   Los daños están en config/balance.js (danioEnemigos).
   ===================================================================== */

// Avisar un punto del suelo y, tras "espera" segundos, hacer algo allí
function programar(e, espera, hacer) {
  (e.pendientes || (e.pendientes = [])).push({ t: espera, hacer });
}

Object.assign(IA_JEFES, {
  // ---------------- ARQUERO MAESTRO ----------------
  arqueroMaestro(e, dt, m) {
    const c = e.cfg;
    const r = e.fase2 ? 1.35 : 1;
    const obj = m.jugadorMasCercano(e.x, e.y);
    e.cdRafaga = (e.cdRafaga ?? 1.2) - dt;
    e.cdLluvia = (e.cdLluvia ?? 5) - dt;
    e.cdSalto = (e.cdSalto ?? 0) - dt;
    if (!obj) { e.vx = U.aproximar(e.vx, 0, 600 * dt); return; }
    const dx = obj.x - e.x, dist = Math.abs(dx);

    switch (e.estado) {
      case 'rugido': case 'descanso':
        e.vx = U.aproximar(e.vx, 0, 900 * dt);
        e.t -= dt; if (e.t <= 0) e.estado = 'caminar';
        break;

      case 'caminar':
        e.dir = dx > 0 ? 1 : -1;
        mantenerDistancia(e, dt, dx, 230, 420, c.velocidad * r);
        // Si te acercas: salto hacia atrás
        if (dist < 170 && e.cdSalto <= 0 && e.enSuelo) {
          e.vy = -820; e.vx = -Math.sign(dx) * 430; e.enSuelo = false;
          e.cdSalto = 4.5 / r;
          m.emitir('polvo', { x: e.x, y: e.y, cantidad: 6 });
          break;
        }
        if (e.cdLluvia <= 0 && e.enSuelo) { e.estado = 'prepLluvia'; e.t = 0.9 / r; }
        else if (e.cdRafaga <= 0 && e.enSuelo) { e.estado = 'prepDisparo'; e.t = 0.65 / r; }
        break;

      case 'prepDisparo':
        e.vx = U.aproximar(e.vx, 0, 1500 * dt);
        e.dir = dx > 0 ? 1 : -1;
        e.t -= dt;
        if (e.t <= 0) {
          const n = e.fase2 ? 5 : 3;
          for (let i = 0; i < n; i++) DISPAROS.flecha(e, m, obj, c.danioFlecha, { desvioVy: (i - (n - 1) / 2) * 110, velocidad: 760 });
          e.estado = 'descanso'; e.t = 0.45;
          e.cdRafaga = m.rng.rango(1.6, 2.4) / r;
        }
        break;

      case 'prepLluvia':
        e.vx = U.aproximar(e.vx, 0, 1500 * dt);
        e.t -= dt;
        if (e.t <= 0) {
          // Marca puntos del suelo cerca de los jugadores y luego caen flechas ahí
          const puntos = [];
          const vivos = m.jugadores.filter((j) => j.vivo);
          const n = e.fase2 ? 7 : 5;
          for (let i = 0; i < n; i++) {
            const base = vivos[i % vivos.length];
            puntos.push(U.clamp(base.x + m.rng.rango(-260, 260), m.limiteIzq + 40, m.limiteDer - 40));
          }
          puntos.forEach((x, i) => {
            m.emitir('avisoSuelo', { x, y: m.sueloY, radio: 55, duracion: 0.95, color: '#ff6b6b' });
            programar(e, 0.95 + i * 0.06, () => {
              m.agregarProyectil(new Proyectil({
                duenio: e, tipo: 'flecha', x: x + m.rng.rango(-10, 10), y: m.sueloY - 620, vx: 1, vy: 1100,
                radio: 13, danio: c.danioLluvia, vida: 1.2, empujeX: 120, empujeY: 260, color: '#c08a4a',
              }));
            });
          });
          e.estado = 'descanso'; e.t = 0.8;
          e.cdLluvia = m.rng.rango(6.5, 8.5) / r;
        }
        break;

      default: e.estado = 'caminar';
    }
  },

  // ---------------- MAGO CÓSMICO ----------------
  magoCosmico(e, dt, m) {
    const c = e.cfg;
    const r = e.fase2 ? 1.3 : 1;
    const obj = m.jugadorMasCercano(e.x, e.y);
    e.cdOrbe = (e.cdOrbe ?? 1.5) - dt;
    e.cdMeteoro = (e.cdMeteoro ?? 6) - dt;
    e.cdTele = (e.cdTele ?? 2) - dt;
    e.cdAnillo = (e.cdAnillo ?? 4) - dt;
    if (!obj) { e.vx = U.aproximar(e.vx, 0, 600 * dt); return; }
    const dx = obj.x - e.x, dist = Math.abs(dx);

    switch (e.estado) {
      case 'rugido': case 'descanso':
        e.vx = U.aproximar(e.vx, 0, 900 * dt);
        e.t -= dt; if (e.t <= 0) e.estado = 'caminar';
        break;

      case 'caminar':
        e.dir = dx > 0 ? 1 : -1;
        mantenerDistancia(e, dt, dx, 200, 380, c.velocidad * r);
        if (dist < 190 && e.cdTele <= 0) {
          // Desaparece y aparece lejos
          e.estado = 'oculto'; e.t = 0.45;
          m.emitir('teletransporte', { x: e.x, y: e.y - e.alto / 2, color: '#b197fc' });
          e.cdTele = m.rng.rango(5.5, 7.5) / r;
          break;
        }
        if (e.cdMeteoro <= 0) { e.estado = 'prepMeteoro'; e.t = 0.9 / r; }
        else if (e.fase2 && e.cdAnillo <= 0) { e.estado = 'prepOrbe'; e.t = 0.7; e.anillo = true; }
        else if (e.cdOrbe <= 0) { e.estado = 'prepOrbe'; e.t = 0.6 / r; e.anillo = false; }
        break;

      case 'oculto':
        e.vx = 0;
        e.t -= dt;
        if (e.t <= 0) {
          const lado = (obj.x - m.limiteIzq) > (m.limiteDer - obj.x) ? -1 : 1; // hacia el lado con más espacio
          e.x = U.clamp(obj.x + lado * m.rng.rango(280, 380), m.limiteIzq + 70, m.limiteDer - 70);
          m.emitir('teletransporte', { x: e.x, y: e.y - e.alto / 2, color: '#b197fc' });
          e.estado = 'descanso'; e.t = 0.35;
        }
        break;

      case 'prepOrbe':
        e.vx = U.aproximar(e.vx, 0, 1500 * dt);
        e.t -= dt;
        if (e.t <= 0) {
          if (e.anillo) {
            // Anillo de 8 orbes que salen en todas direcciones (en furia)
            for (let i = 0; i < 8; i++) {
              const ang = (i / 8) * Math.PI * 2;
              m.agregarProyectil(new Proyectil({
                duenio: e, tipo: 'orbe', x: e.x, y: e.y - e.alto * 0.6, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300,
                radio: 13, danio: c.danioOrbe, vida: 2.4, chocaSuelo: false, empujeX: 180, empujeY: 150, color: '#ff8cf0',
              }));
            }
            e.cdAnillo = 6;
          } else {
            const n = e.fase2 ? 5 : 3;
            for (let i = 0; i < n; i++) DISPAROS.orbe(e, m, obj, c.danioOrbe, { angulo: (i - (n - 1) / 2) * 0.35, velocidad: 290, giro: 1.2, vida: 3.2 });
          }
          e.estado = 'descanso'; e.t = 0.5;
          e.cdOrbe = m.rng.rango(1.8, 2.6) / r;
        }
        break;

      case 'prepMeteoro':
        e.vx = U.aproximar(e.vx, 0, 1500 * dt);
        e.t -= dt;
        if (e.t <= 0) {
          const vivos = m.jugadores.filter((j) => j.vivo);
          const n = e.fase2 ? 4 : 3;
          for (let i = 0; i < n; i++) {
            const base = vivos[i % vivos.length];
            const x = U.clamp(base.x + (i === 0 ? 0 : m.rng.rango(-300, 300)), m.limiteIzq + 60, m.limiteDer - 60);
            m.emitir('avisoSuelo', { x, y: m.sueloY, radio: 95, duracion: 1.1, color: '#ff922b' });
            programar(e, 1.1 + i * 0.15, () => {
              m.agregarProyectil(new Proyectil({
                duenio: e, tipo: 'meteoro', x: x - 160, y: m.sueloY - 700, vx: 160 / 0.62, vy: 700 / 0.62,
                radio: 34, danio: c.danioMeteoro, vida: 2, empujeX: 300, empujeY: 380, color: '#ff922b',
                alChocarSuelo: (mm, p) => {
                  mm.agregarGolpe(new Golpe({ duenio: e, forma: 'circulo', x: p.x, y: mm.sueloY - 20, r: 95, radial: true,
                    danio: c.danioMeteoro, empujeX: 380, empujeY: 420, duracion: 0.1, color: '#ff922b' }));
                  mm.emitir('explosion', { x: p.x, y: mm.sueloY, radio: 120, color: '#ff922b' });
                  mm.emitir('sacudir', { fuerza: 12 });
                },
              }));
            });
          }
          e.estado = 'descanso'; e.t = 0.9;
          e.cdMeteoro = m.rng.rango(7, 9) / r;
        }
        break;

      default: e.estado = 'caminar';
    }
  },

  // ---------------- NINJA SOMBRA ----------------
  ninjaSombra(e, dt, m) {
    const c = e.cfg;
    const r = e.fase2 ? 1.3 : 1;
    const obj = m.jugadorMasCercano(e.x, e.y);
    e.cdCorte = (e.cdCorte ?? 1.5) - dt;
    e.cdShuriken = (e.cdShuriken ?? 3) - dt;
    e.cdSombra = (e.cdSombra ?? 6) - dt;
    if (!obj) { e.vx = U.aproximar(e.vx, 0, 600 * dt); return; }
    const dx = obj.x - e.x, dist = Math.abs(dx);

    switch (e.estado) {
      case 'rugido': case 'descanso':
        e.vx = U.aproximar(e.vx, 0, 1200 * dt);
        e.t -= dt; if (e.t <= 0) e.estado = 'caminar';
        break;

      case 'caminar':
        e.dir = dx > 0 ? 1 : -1;
        mantenerDistancia(e, dt, dx, 150, 260, c.velocidad * r);
        if (e.cdSombra <= 0) {
          e.estado = 'oculto'; e.t = 0.5;
          m.emitir('teletransporte', { x: e.x, y: e.y - e.alto / 2, color: '#495057' });
          e.cdSombra = m.rng.rango(8, 10) / r;
        } else if (e.cdShuriken <= 0 && dist > 220) { e.estado = 'prepShuriken'; e.t = 0.35 / r; }
        else if (e.cdCorte <= 0 && dist < 420) { e.estado = 'prepCorte'; e.t = 0.5 / r; }
        break;

      case 'oculto':
        // Sale detrás del jugador y corta enseguida
        e.vx = 0;
        e.t -= dt;
        if (e.t <= 0) {
          e.x = U.clamp(obj.x - obj.dir * 110, m.limiteIzq + 50, m.limiteDer - 50);
          e.dir = obj.x > e.x ? 1 : -1;
          m.emitir('teletransporte', { x: e.x, y: e.y - e.alto / 2, color: '#495057' });
          e.estado = 'prepCorte'; e.t = 0.32;
        }
        break;

      case 'prepCorte':
        e.vx = U.aproximar(e.vx, -e.dir * 40, 1500 * dt);
        e.t -= dt;
        if (e.t <= 0) {
          e.estado = 'corte'; e.t = 0.32;
          e.golpeCorte = new Golpe({ duenio: e, seguir: e, offX: 30, offY: -e.alto * 0.5, w: 90, h: e.alto * 0.8,
            danio: c.danioCorte, empujeX: 420, empujeY: 300, duracion: 0.32, color: '#adb5bd' });
          m.agregarGolpe(e.golpeCorte);
          m.emitir('dash', { jugador: -1, x: e.x, y: e.y - e.alto / 2, dir: e.dir });
        }
        break;

      case 'corte':
        e.vx = e.dir * 950;
        e.t -= dt;
        if (e.t <= 0 || e.x <= m.limiteIzq + e.ancho || e.x >= m.limiteDer - e.ancho) {
          if (e.golpeCorte) e.golpeCorte.vivo = false;
          e.estado = 'descanso'; e.t = 0.6 / r;
          e.cdCorte = m.rng.rango(1.6, 2.4) / r;
        }
        break;

      case 'prepShuriken':
        e.vx = U.aproximar(e.vx, 0, 2000 * dt);
        e.dir = dx > 0 ? 1 : -1;
        e.t -= dt;
        if (e.t <= 0) {
          const n = e.fase2 ? 5 : 3;
          for (let i = 0; i < n; i++) DISPAROS.shuriken(e, m, (i - (n - 1) / 2) * 0.16, c.danioShuriken, { velocidad: 700 });
          e.estado = 'descanso'; e.t = 0.4;
          e.cdShuriken = m.rng.rango(3, 4.2) / r;
        }
        break;

      default: e.estado = 'caminar';
    }
  },
});
