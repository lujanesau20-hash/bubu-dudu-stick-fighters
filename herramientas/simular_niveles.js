/* =====================================================================
   SIMULACIONES DE NIVELES (jugador "promedio" controlado por el ordenador)
   Usa la lógica real del juego, sin dibujar.

   Uso (consola de index.html con servidor local):
     const s = document.createElement('script'); s.src = 'herramientas/simular_niveles.js'; document.body.append(s);
     simularOleada7(20)            // oleada de 7 enemigos juntos (nivel 1)
     simularNivel('isla-3', 5)     // duración de un nivel completo
     tablaNiveles(3)               // tabla de los 10 niveles de la Isla
   ===================================================================== */

// ---------- El "jugador promedio" ----------
function crearBot(semilla) {
  const azar = U.crearAleatorio(semilla);
  return {
    azar, tDecision: 0, esquivando: 0, saltadas: new Set(),
    usos: { H1: 0, H2: 0, H3: 0, H4: 0, 'Corte volador': 0, Torbellino: 0, Cataclismo: 0 },

    controlar(m, j, dt) {
      const c = new EstadoControl();
      this.tDecision -= dt; this.esquivando -= dt;
      const enemigos = m.enemigos.filter((e) => e.vivo && e.estado !== 'entrando');
      if (m.jefe && m.jefe.vivo && m.jefe.estado !== 'entrando') enemigos.push(m.jefe);

      // Corazón cerca y con menos de 75% de vida
      const corazon = (m.corazones || []).find((h) => h.enSuelo && Math.abs(h.x - j.x) < 700);
      if (corazon && j.vida < 0.75 * j.vidaMax) {
        c.x = Math.sign(corazon.x - j.x);
        if (corazon.y < j.y - 60 && Math.abs(corazon.x - j.x) < 120 && j.enSuelo) c.saltoPulsado = true;
        return c;
      }
      if (!enemigos.length) { c.x = 1; return c; } // avanzar al siguiente tramo

      let obj = enemigos[0];
      for (const e of enemigos) if (Math.abs(e.x - j.x) < Math.abs(obj.x - j.x)) obj = e;
      // Como una persona: si no tiene a nadie encima, va a por los que disparan de lejos
      const aDistancia = enemigos.filter((e) => e.tipo === 'arquero' || e.tipo === 'mago');
      if (aDistancia.length && Math.abs(obj.x - j.x) > 160) {
        obj = aDistancia.reduce((a, e) => (Math.abs(e.x - j.x) < Math.abs(a.x - j.x) ? e : a));
      }
      // Esquiva (saltando) una parte de las flechas, orbes y shurikens que se le acercan
      for (const p of m.proyectiles) {
        if (!p.duenio || p.duenio.esJugador || this.saltadas.has(p)) continue;
        const viene = Math.sign(j.x - p.x) === Math.sign(p.vx || (j.x - p.x));
        if (viene && Math.abs(j.x - p.x) < 170 && Math.abs(j.y - 40 - p.y) < 120) {
          this.saltadas.add(p);
          if (this.azar() < 0.4 && j.enSuelo) c.saltoPulsado = true;
        }
      }
      const dx = obj.x - j.x, dist = Math.abs(dx), hacia = Math.sign(dx) || 1;

      // Esquivar a veces y saltar ondas del suelo
      if (enemigos.some((e) => (e.estado === 'preparar' || e.estado === 'prepPunio') && Math.abs(e.x - j.x) < 110) && this.esquivando <= 0 && this.azar() < 0.3 * dt * 12) this.esquivando = 0.3;
      for (const p of m.proyectiles) {
        if (p.tipo !== 'ondaSuelo' || this.saltadas.has(p)) continue;
        if (Math.sign(j.x - p.x) === Math.sign(p.vx) && Math.abs(j.x - p.x) < 150) { this.saltadas.add(p); if (this.azar() < 0.55) c.saltoPulsado = true; }
      }
      if (this.esquivando > 0) c.x = -hacia;
      else if (dist > 120) c.x = hacia;
      else if (dist < 50) c.x = -hacia;
      // Si el objetivo está arriba en una plataforma, saltar
      if (obj.y < j.y - 80 && dist < 200 && j.enSuelo && this.azar() < 0.1) c.saltoPulsado = true;

      if (this.tDecision <= 0 && this.esquivando <= 0) {
        this.tDecision = 0.2;
        if (this.azar() < 0.85) {
          const mana = j.energia, cd = j.enfriamientos, cc = j.enfriamientosCombo;
          const cerca = (r) => enemigos.filter((e) => Math.abs(e.x - j.x) < r && Math.abs(e.y - j.y) < 160).length;
          const r = this.azar();
          let a = null;
          if (mana >= 45 && cc[2] <= 0 && cerca(400) >= 3 && r < 0.7) a = ['Cataclismo', [2, 3]];
          else if (mana >= 20 && cd[3] <= 0 && cerca(200) >= 2 && r < 0.75) a = ['H4', [3]];
          else if (mana >= 25 && cc[1] <= 0 && cerca(160) >= 2 && r < 0.5) a = ['Torbellino', [1, 2]];
          else if (mana >= 12 && cc[0] <= 0 && r < 0.35) a = ['Corte volador', [0, 1]];
          else if (mana >= 10 && cd[2] <= 0 && dist < 300 && r < 0.35) a = ['H3', [2]];
          else if (mana >= 4 && dist < 150) a = ['H2', [1]];
          else if (mana >= 2) a = ['H1', [0]];
          if (a) {
            c.x = hacia;
            a[1].forEach((i) => { c.habilidades[i] = true; });
            this.pendiente = a;
          }
        }
      }
      return c;
    },

    // Contar si la acción realmente salió
    registrar(j, antes) {
      if (!this.pendiente) return;
      const [nombre, teclas] = this.pendiente;
      const ok = teclas.length === 2
        ? j.enfriamientosCombo.some((v, i) => v > antes.cc[i]) || (nombre === 'Corte volador' && j.energia < antes.mana - 5)
        : j.energia < antes.mana - 0.5 || j.enfriamientos[teclas[0]] > antes.cd[teclas[0]];
      if (ok) this.usos[nombre]++;
      this.pendiente = null;
    },
  };
}

function pasoBot(m, bot, j, dt) {
  const antes = { mana: j.energia, cd: j.enfriamientos.slice(), cc: j.enfriamientosCombo.slice() };
  const c = bot.controlar(m, j, dt);
  m.actualizar(dt, [c]);
  m.eventos.length = 0;
  bot.registrar(j, antes);
}

// ---------- 1) Oleada de 7 enemigos juntos (nivel 1) ----------
function simularOleada7(cantidad = 20, opciones = {}) {
  const PASO = 1 / 60;
  const res = [];
  for (let n = 0; n < cantidad; n++) {
    const m = new Mundo({ modo: 'solo', personajes: ['bubu'], escenario: opciones.escenario || 'isla-1', semilla: 500 + n * 131 });
    const j = m.jugadores[0];
    m.indiceOleada = m.escenario.oleadas.length; // sin oleadas automáticas
    m.tCorazon = -9999;                          // sin corazones en esta prueba
    j.x = 700;
    m.limiteIzq = 100; m.limiteDer = 1500;
    for (let k = 0; k < 7; k++) m.crearEnemigo(m.elegirTipoOleada(), k % 4);
    const bot = crearBot(900 + n);
    const vida0 = j.vida;
    let t = 0;
    while (t < 120 && m.enemigos.some((e) => e.vivo) && j.vivo) { pasoBot(m, bot, j, PASO); t += PASO; }
    res.push({ segundos: +t.toFixed(1), limpio: !m.enemigos.some((e) => e.vivo), vidaPerdida: Math.round(vida0 - j.vida), H4: bot.usos.H4, Cataclismo: bot.usos.Cataclismo, usos: bot.usos });
  }
  const ok = res.filter((r) => r.limpio);
  const prom = (k) => +(ok.reduce((s, r) => s + r[k], 0) / Math.max(1, ok.length)).toFixed(1);
  return { pruebas: res.length, limpias: ok.length, segundos: prom('segundos'), H4: prom('H4'), Cataclismo: prom('Cataclismo'), vidaPerdida: prom('vidaPerdida'), vidaEnemigo: BALANCE.vidaEnemigo(1), detalle: res };
}

// ---------- 2) Un nivel completo ----------
function simularNivel(id, cantidad = 3, opciones = {}) {
  const PASO = 1 / 60;
  const res = [];
  for (let n = 0; n < cantidad; n++) {
    const m = new Mundo({ modo: opciones.modo || 'solo', personajes: opciones.modo === 'pareja' ? ['bubu', 'dudu'] : ['bubu'], escenario: id, semilla: 77 + n * 911 });
    const bots = m.jugadores.map((_, i) => crearBot(3000 + n * 10 + i));
    let t = 0, danio = 0, curado = 0, corazones = 0;
    const vidaAntes = () => m.jugadores.reduce((s, j) => s + j.vida, 0);
    const limite = opciones.limite || 1500;
    while (t < limite && m.estado === 'jugando') {
      const antes = m.jugadores.map((j) => ({ mana: j.energia, cd: j.enfriamientos.slice(), cc: j.enfriamientosCombo.slice() }));
      const v0 = vidaAntes(), c0 = m.corazones.length;
      // Invencibilidad opcional para medir solo la duración
      if (opciones.invencible) m.jugadores.forEach((j) => { j.vida = j.vidaMax; });
      const ctrls = m.jugadores.map((j, i) => (j.vivo ? bots[i].controlar(m, j, PASO) : new EstadoControl()));
      m.actualizar(PASO, ctrls);
      m.eventos.length = 0;
      m.jugadores.forEach((j, i) => bots[i].registrar(j, antes[i]));
      const v1 = vidaAntes();
      if (v1 < v0) danio += v0 - v1;
      if (v1 > v0 && m.corazones.length < c0) { curado += v1 - v0; corazones++; }
      t += PASO;
    }
    res.push({ segundos: Math.round(t), estado: m.estado, tramo: `${m.tramoActual}/${m.totalTramos}`, danio: Math.round(danio), curado: Math.round(curado), corazones });
  }
  const e = ESCENARIOS[id];
  const enemigos = e.oleadas.reduce((s, tr) => s + (tr.fases ? tr.fases.reduce((a, b) => a + b, 0) : tr.grupos.reduce((a, g) => a + g.cantidad, 0)), 0);
  const gan = res.filter((r) => r.estado === 'victoria');
  return {
    nivel: id, tramos: e.oleadas.length, enemigos, jefe: e.jefe || '-',
    ganadas: `${gan.length}/${res.length}`,
    minutos: gan.length ? +(gan.reduce((s, r) => s + r.segundos, 0) / gan.length / 60).toFixed(1) : null,
    detalle: res,
  };
}

// ---------- 2b) Solo la pelea con el jefe (con refuerzos y corazones) ----------
function simularJefeNivel(id = 'isla-10', cantidad = 10, opciones = {}) {
  const PASO = 1 / 60;
  const res = [];
  for (let n = 0; n < cantidad; n++) {
    const pareja = opciones.modo === 'pareja';
    const m = new Mundo({ modo: pareja ? 'pareja' : 'solo', personajes: pareja ? ['bubu', 'dudu'] : ['bubu'], escenario: id, semilla: 40 + n * 313 });
    m.indiceOleada = m.escenario.oleadas.length;
    m.jugadores.forEach((j, i) => { j.x = m.escenario.zonaJefe.gatillo + 10 - i * 60; });
    const bots = m.jugadores.map((_, i) => crearBot(7000 + n * 10 + i));
    let t = 0, inicio = null, danio = 0, refuerzos = 0;
    while (t < 400 && m.estado === 'jugando') {
      const antes = m.jugadores.map((j) => ({ mana: j.energia, cd: j.enfriamientos.slice(), cc: j.enfriamientosCombo.slice() }));
      const v0 = m.jugadores.reduce((s, j) => s + j.vida, 0);
      const ctrls = m.jugadores.map((j, i) => (j.vivo ? bots[i].controlar(m, j, PASO) : new EstadoControl()));
      m.actualizar(PASO, ctrls);
      refuerzos += m.eventos.filter((e) => e.tipo === 'refuerzo').length;
      m.eventos.length = 0;
      m.jugadores.forEach((j, i) => bots[i].registrar(j, antes[i]));
      const v1 = m.jugadores.reduce((s, j) => s + j.vida, 0);
      if (v1 < v0) danio += v0 - v1;
      if (m.jefe && inicio === null && m.jefe.estado !== 'entrando') inicio = t;
      t += PASO;
    }
    res.push({ estado: m.estado, segundos: inicio !== null ? Math.round(t - inicio) : null, danio: Math.round(danio), refuerzos, vidaJefe: m.jefe ? m.jefe.vidaMax : null });
  }
  const gan = res.filter((r) => r.estado === 'victoria');
  return { nivel: id, ganadas: `${gan.length}/${res.length}`, segundos: gan.length ? Math.round(gan.reduce((s, r) => s + r.segundos, 0) / gan.length) : null,
    danioRecibido: gan.length ? Math.round(gan.reduce((s, r) => s + r.danio, 0) / gan.length) : null, vidaJefe: res[0].vidaJefe, refuerzos: res.map((r) => r.refuerzos) };
}

// ---------- 3) Tabla de los 10 niveles ----------
function tablaNiveles(cantidad = 2, opciones = {}) {
  return ORDEN_NIVELES.filter((id) => id.startsWith('isla-')).map((id) => {
    const r = simularNivel(id, cantidad, opciones);
    return { nivel: id, tramos: r.tramos, enemigos: r.enemigos, ganadas: r.ganadas, minutos: r.minutos };
  });
}
