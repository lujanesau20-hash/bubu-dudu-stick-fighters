/* =====================================================================
   SIMULACIÓN: pelea contra el jefe final del nivel 1 con un jugador
   "promedio" controlado por el ordenador. Usa la lógica real del juego
   (Mundo, Jugador, Jefe, habilidades, combos, corazones), sin dibujar.

   Cómo usarla: abre index.html (con servidor local), abre la consola y pega:
     const s = document.createElement('script'); s.src = 'herramientas/simular_jefe.js'; document.body.append(s);
   y luego:
     simularPeleaJefe(20)      // 20 peleas con semillas distintas
   ===================================================================== */
function simularPeleaJefe(cantidad = 20, opciones = {}) {
  const PASO = 1 / 60;
  const resultados = [];

  for (let n = 0; n < cantidad; n++) {
    const semilla = 1000 + n * 7919;
    const azar = U.crearAleatorio(semilla + 1); // decisiones del jugador
    const m = new Mundo({ modo: 'solo', personajes: ['bubu'], escenario: 'isla', semilla });
    const esc = m.escenario;
    m.indiceOleada = esc.oleadas.length; // saltar las oleadas: directo al jefe
    const j = m.jugadores[0];
    j.x = esc.zonaJefe.gatillo + 10;

    // Contadores
    let danioRecibido = 0, curado = 0, corazones = 0;
    const recibir = j.recibirDanio.bind(j);
    j.recibirDanio = (c, info) => { const v = j.vida; const ok = recibir(c, info); if (ok) danioRecibido += v - j.vida; return ok; };
    const usos = { H1: 0, H2: 0, H3: 0, H4: 0, 'Corte volador': 0, Torbellino: 0, Cataclismo: 0 };

    let inicio = null, fin = null;
    let decision = null, tDecision = 0, esquivando = 0;
    const saltadas = new Set();

    for (let t = 0; t < 240 && fin === null; t += PASO) {
      const jefe = m.jefe;
      if (jefe && inicio === null && jefe.estado !== 'entrando') inicio = m.tiempo;
      if (jefe && !jefe.vivo && fin === null) fin = m.tiempo;
      if (!j.vivo) { fin = m.tiempo; break; }

      const c = new EstadoControl();
      tDecision -= PASO;
      esquivando -= PASO;

      if (jefe && jefe.vivo && jefe.estado !== 'entrando') {
        const dx = jefe.x - j.x, dist = Math.abs(dx), haciaJefe = Math.sign(dx) || 1;

        // Esquivar (a veces): puñetazo y embestida
        if ((jefe.estado === 'prepPunio' && dist < 250) || jefe.estado === 'prepEmbestida') {
          if (esquivando <= 0 && azar() < 0.5 * PASO * 12) esquivando = 0.45;
        }
        // Saltar las ondas del pisotón (55% de las veces)
        for (const p of m.proyectiles) {
          if (p.tipo !== 'ondaSuelo' || saltadas.has(p)) continue;
          const acerca = Math.sign(j.x - p.x) === Math.sign(p.vx);
          if (acerca && Math.abs(j.x - p.x) < 150) {
            saltadas.add(p);
            if (azar() < 0.55) c.saltoPulsado = true;
          }
        }

        // Corazón: ir a buscarlo si tiene menos de 75% de vida
        const corazon = m.corazones.find((h) => h.enSuelo);
        if (corazon && j.vida < 0.75 * j.vidaMax) {
          c.x = Math.sign(corazon.x - j.x);
          if (corazon.y < j.y - 60 && Math.abs(corazon.x - j.x) < 120 && j.enSuelo) c.saltoPulsado = true;
        } else if (esquivando > 0) {
          c.x = -haciaJefe;
        } else {
          // Mantener distancia de pelea (~110)
          if (dist > 140) c.x = haciaJefe;
          else if (dist < 70) c.x = -haciaJefe;
        }

        // Decidir un ataque cada ~0.2 s (a veces se distrae)
        if (tDecision <= 0 && esquivando <= 0) {
          tDecision = 0.2;
          if (azar() < 0.85) {
            const mana = j.energia, cd = j.enfriamientos, cc = j.enfriamientosCombo;
            const r = azar();
            let accion = null;
            if (mana >= 45 && cc[2] <= 0 && dist < 400 && r < 0.7) accion = ['Cataclismo', [2, 3]];
            else if (mana >= 25 && cc[1] <= 0 && dist < 260 && r < 0.6) accion = ['Torbellino', [1, 2]];
            else if (mana >= 20 && cd[3] <= 0 && dist < 220 && r < 0.7) accion = ['H4', [3]];
            else if (mana >= 12 && cc[0] <= 0 && r < 0.5) accion = ['Corte volador', [0, 1]];
            else if (mana >= 10 && cd[2] <= 0 && dist < 300 && r < 0.5) accion = ['H3', [2]];
            else if (mana >= 4 && dist < 150) accion = ['H2', [1]];
            else if (mana >= 2) accion = ['H1', [0]];
            if (accion) {
              decision = accion;
              if (!c.x) c.x = haciaJefe;  // mirar al jefe
              if (Math.sign(c.x) !== haciaJefe && accion[0] !== 'H1') c.x = haciaJefe;
              accion[1].forEach((i) => { c.habilidades[i] = true; });
            }
          }
        }
      }

      const manaAntes = j.energia, vidaAntes = j.vida, corAntes = m.corazones.length;
      const cdAntes = j.enfriamientos.slice(), ccAntes = j.enfriamientosCombo.slice();
      m.actualizar(PASO, [c]);
      // Contar qué se usó realmente
      if (decision && c.habilidades.some(Boolean)) {
        const [nombre, teclas] = decision;
        const usada = teclas.length === 2
          ? j.enfriamientosCombo.some((v, i) => v > ccAntes[i])
          : j.energia < manaAntes - 0.5 || j.enfriamientos[teclas[0]] > cdAntes[teclas[0]];
        if (usada) usos[nombre]++;
        decision = null;
      }
      if (j.vida > vidaAntes && m.corazones.length < corAntes) { corazones++; curado += j.vida - vidaAntes; }
    }

    resultados.push({
      duracion: fin !== null && inicio !== null ? +(fin - inicio).toFixed(1) : null,
      gano: !!(m.jefe && !m.jefe.vivo),
      vidaPerdida: Math.round(danioRecibido),
      curado: Math.round(curado),
      vidaFinal: Math.round(j.vida),
      corazones,
      usos,
    });
  }

  const ok = resultados.filter((r) => r.gano);
  const prom = (k) => ok.length ? +(ok.reduce((s, r) => s + r[k], 0) / ok.length).toFixed(1) : null;
  const resumen = {
    peleas: resultados.length,
    ganadas: ok.length,
    duracionPromedio: prom('duracion'),
    duracionMin: ok.length ? Math.min(...ok.map((r) => r.duracion)) : null,
    duracionMax: ok.length ? Math.max(...ok.map((r) => r.duracion)) : null,
    vidaPerdidaPromedio: prom('vidaPerdida'),
    curadoPromedio: prom('curado'),
    vidaFinalPromedio: prom('vidaFinal'),
    corazonesPromedio: prom('corazones'),
    vidaJefe: BALANCE.vidaJefe(1),
  };
  if (!opciones.silencio) { console.table(resultados.map((r) => ({ ...r, usos: JSON.stringify(r.usos) }))); console.log(resumen); }
  return { resumen, resultados };
}
