/* =====================================================================
   ENEMIGOS DE LOS NIVELES 2, 3 Y 4 (lógica)
   arquero: guarda distancia y dispara flechas en arco.
   mago:    lanza orbes que persiguen y se teletransporta si te acercas.
   ninja:   muy rápido, esquiva saltando y lanza shurikens.
   Los valores (vida, daño, velocidad...) están en CONFIG.enemigos y config/balance.js.
   ===================================================================== */

// ---------- Ayudas para disparar (también las usan los jefes) ----------
const DISPAROS = {
  // Flecha con gravedad que cae justo sobre el objetivo
  flecha(e, m, obj, danio, opciones = {}) {
    const vel = opciones.velocidad || 720, g = 900;
    const x0 = e.x + e.dir * 22, y0 = e.y - e.alto * 0.68;
    const dx = obj.x - x0, dy = (obj.y - obj.alto * 0.5) - y0;
    const tiempo = U.clamp(Math.abs(dx) / vel, 0.25, 1.4);
    const vy = (dy - 0.5 * g * tiempo * tiempo) / tiempo + (opciones.desvioVy || 0);
    m.agregarProyectil(new Proyectil({
      duenio: e, tipo: 'flecha', x: x0, y: y0, vx: Math.sign(dx || e.dir) * vel, vy, gravedad: g,
      radio: 10, danio, vida: 2.5, empujeX: 160, empujeY: 120, color: '#c08a4a',
    }));
  },

  // Orbe mágico que persigue al jugador
  orbe(e, m, obj, danio, opciones = {}) {
    const x0 = e.x + e.dir * 26, y0 = e.y - e.alto * 0.75;
    const ang = Math.atan2((obj.y - obj.alto / 2) - y0, obj.x - x0) + (opciones.angulo || 0);
    const vel = opciones.velocidad || 320;
    m.agregarProyectil(new Proyectil({
      duenio: e, tipo: 'orbe', x: x0, y: y0, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel,
      radio: opciones.radio || 14, danio, vida: opciones.vida || 3, chocaSuelo: false,
      teledirigido: opciones.giro ?? 1.6, empujeX: 180, empujeY: 150, color: opciones.color || '#c77dff',
    }));
  },

  // Shuriken recto
  shuriken(e, m, angulo, danio, opciones = {}) {
    const vel = opciones.velocidad || 650;
    m.agregarProyectil(new Proyectil({
      duenio: e, tipo: 'shuriken', x: e.x + e.dir * 20, y: e.y - e.alto * 0.62,
      vx: Math.cos(angulo) * vel * e.dir, vy: Math.sin(angulo) * vel,
      radio: 11, danio, vida: 1.6, empujeX: 140, empujeY: 90, color: '#d0d6e0',
    }));
  },

  teletransporte(e, m, xNuevo) {
    m.emitir('teletransporte', { x: e.x, y: e.y - e.alto / 2, color: e.color });
    e.x = U.clamp(xNuevo, m.limiteIzq + 60, m.limiteDer - 60);
    e.vx = 0;
    m.emitir('teletransporte', { x: e.x, y: e.y - e.alto / 2, color: e.color });
  },
};

// Mantener una distancia con el objetivo (para los que atacan de lejos)
function mantenerDistancia(e, dt, dx, cerca, lejos, vel) {
  const dist = Math.abs(dx);
  let obj = 0;
  if (dist > lejos) obj = Math.sign(dx) * vel;
  else if (dist < cerca) obj = -Math.sign(dx) * vel * 0.85;
  e.vx = U.aproximar(e.vx, obj, 1200 * dt);
}

Object.assign(IA_ENEMIGOS, {
  // ---------------- ARQUERO ----------------
  arquero(e, dt, m) {
    const c = e.cfg;
    const obj = m.jugadorMasCercano(e.x, e.y);
    if (!obj) { e.vx = U.aproximar(e.vx, 0, 800 * dt); e.estado = 'perseguir'; return; }
    const dx = obj.x - e.x, dist = Math.abs(dx);
    switch (e.estado) {
      case 'perseguir':
        mantenerDistancia(e, dt, dx, 240, 430, c.velocidad);
        e.dir = dx > 0 ? 1 : -1; // siempre mira al jugador
        if (e.enfriamientoAtaque <= 0 && dist < c.alcance && e.enSuelo) { e.estado = 'preparar'; e.t = c.preparacion; }
        break;
      case 'preparar':
        e.vx = U.aproximar(e.vx, 0, 1500 * dt);
        e.dir = dx > 0 ? 1 : -1;
        e.t -= dt;
        if (e.t <= 0) {
          DISPAROS.flecha(e, m, obj, c.danio);
          e.estado = 'atacar'; e.t = 0.3;
          e.enfriamientoAtaque = m.rng.rango(1.7, 2.7);
        }
        break;
      case 'atacar':
        e.t -= dt;
        if (e.t <= 0) e.estado = 'perseguir';
        break;
      default: e.estado = 'perseguir';
    }
  },

  // ---------------- MAGO ----------------
  mago(e, dt, m) {
    const c = e.cfg;
    const obj = m.jugadorMasCercano(e.x, e.y);
    e.cdTele = (e.cdTele ?? 1.5) - dt;
    if (!obj) { e.vx = U.aproximar(e.vx, 0, 800 * dt); e.estado = 'perseguir'; return; }
    const dx = obj.x - e.x, dist = Math.abs(dx);
    switch (e.estado) {
      case 'perseguir':
        mantenerDistancia(e, dt, dx, 220, 380, c.velocidad);
        e.dir = dx > 0 ? 1 : -1;
        // Si te acercas mucho, se teletransporta lejos
        if (dist < 160 && e.cdTele <= 0) {
          const lado = m.rng() < 0.5 ? -1 : 1;
          DISPAROS.teletransporte(e, m, obj.x + lado * m.rng.rango(320, 430));
          e.cdTele = m.rng.rango(3.5, 5);
          break;
        }
        if (e.enfriamientoAtaque <= 0 && dist < c.alcance) { e.estado = 'preparar'; e.t = c.preparacion; }
        break;
      case 'preparar':
        e.vx = U.aproximar(e.vx, 0, 1500 * dt);
        e.t -= dt;
        if (e.t <= 0) {
          DISPAROS.orbe(e, m, obj, c.danio);
          e.estado = 'atacar'; e.t = 0.35;
          e.enfriamientoAtaque = m.rng.rango(2.2, 3.2);
        }
        break;
      case 'atacar':
        e.t -= dt;
        if (e.t <= 0) e.estado = 'perseguir';
        break;
      default: e.estado = 'perseguir';
    }
  },

  // ---------------- NINJA ----------------
  // Pelea cuerpo a cuerpo como el stickman normal, pero además esquiva y lanza shurikens.
  ninja(e, dt, m) {
    const c = e.cfg;
    const obj = m.jugadorMasCercano(e.x, e.y);
    e.cdEsquiva = (e.cdEsquiva ?? 0) - dt;
    e.cdShuriken = (e.cdShuriken ?? m.rng.rango(1, 3)) - dt;
    if (obj && e.estado === 'perseguir' && e.enSuelo) {
      const dx = obj.x - e.x, dist = Math.abs(dx);
      // Esquivar: salta hacia atrás justo cuando el jugador ataca cerca
      if (dist < 170 && obj.anim.ataque > 0.75 && e.cdEsquiva <= 0) {
        e.cdEsquiva = 1.6;
        if (m.rng() < 0.55) {
          e.vy = -760; e.vx = -Math.sign(dx) * 330; e.enSuelo = false;
          m.emitir('polvo', { x: e.x, y: e.y, cantidad: 4 });
          return;
        }
      }
      // Shuriken a media distancia
      if (dist > 200 && dist < 480 && e.cdShuriken <= 0) {
        e.dir = dx > 0 ? 1 : -1;
        e.estado = 'prepShuriken'; e.t = 0.3;
        return;
      }
    }
    if (e.estado === 'prepShuriken') {
      e.vx = U.aproximar(e.vx, 0, 2000 * dt);
      e.t -= dt;
      if (e.t <= 0) {
        DISPAROS.shuriken(e, m, 0, Math.round(c.danio * 0.7));
        e.estado = 'atacar'; e.t = 0.2;
        e.cdShuriken = m.rng.rango(2.8, 4.2);
      }
      return;
    }
    IA_ENEMIGOS.normal(e, dt, m);
  },
});

// ---------------- AVE VOLADORA ----------------
// Vuela a media altura, guarda distancia y lanza una bola de fuego en LÍNEA RECTA
// hacia donde estaba el jugador al lanzarla (no lo persigue).
IA_ENEMIGOS.ave = function (e, dt, m) {
  const c = e.cfg;
  const ba = BALANCE.aves;
  e.ignorarPlataformasHasta = Infinity; // vuela: no se posa en las plataformas
  // Mantener la altura de vuelo con un pequeño vaivén
  const yObj = m.sueloY - ba.alturaVuelo + Math.sin(m.tiempo * 2.2 + e.anim.fase) * 14;
  e.vy = U.clamp((yObj - e.y) * 3, -260, 260);
  e.anim.fase += dt * 0.5;
  const obj = m.jugadorMasCercano(e.x, e.y);
  if (!obj) { e.vx = U.aproximar(e.vx, 0, 600 * dt); e.estado = 'perseguir'; return; }
  const dx = obj.x - e.x, dist = Math.abs(dx);
  switch (e.estado) {
    case 'perseguir':
      e.dir = dx > 0 ? 1 : -1;
      mantenerDistancia(e, dt, dx, 200, 360, c.velocidad);
      if (e.enfriamientoAtaque <= 0 && dist < c.alcance && Math.abs(e.y - yObj) < 60) { e.estado = 'preparar'; e.t = c.preparacion; }
      break;
    case 'preparar':
      e.vx = U.aproximar(e.vx, 0, 1200 * dt);
      e.dir = dx > 0 ? 1 : -1;
      e.t -= dt;
      if (e.t <= 0) {
        // Apunta UNA vez, al lugar donde está el jugador ahora; luego va recta
        const x0 = e.x + e.dir * 18, y0 = e.y - e.alto * 0.55;
        const ang = Math.atan2((obj.y - obj.alto * 0.5) - y0, obj.x - x0);
        m.agregarProyectil(new Proyectil({
          duenio: e, tipo: 'bolaFuego', x: x0, y: y0, vx: Math.cos(ang) * ba.velocidadBola, vy: Math.sin(ang) * ba.velocidadBola,
          radio: 13, danio: c.danio, vida: 3, empujeX: 160, empujeY: 120, color: '#ff922b',
        }));
        e.estado = 'atacar'; e.t = 0.3;
        e.enfriamientoAtaque = m.rng.rango(2.4, 3.4);
      }
      break;
    case 'atacar':
      e.t -= dt;
      if (e.t <= 0) e.estado = 'perseguir';
      break;
    default: e.estado = 'perseguir';
  }
};
