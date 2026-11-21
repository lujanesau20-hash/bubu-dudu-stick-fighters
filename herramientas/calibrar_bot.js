/* =====================================================================
   CALIBRACIÓN CON EL "JUGADOR PROMEDIO" (v1.11)
   Juega niveles completos con el bot de herramientas/simular_niveles.js usando la lógica
   real del juego (esferas de maná, robo de vida, daño por tramo, curación por tramo).
   Uso (consola de index.html con servidor local):
     for (const f of ['herramientas/simular_niveles.js', 'herramientas/calibrar_bot.js']) {
       const s = document.createElement('script'); s.src = f; document.body.append(s); }
     calibrarNivel('cielo-5', { robo: 4, mejoras: 2 })   // robo: nivel 0..4 · mejoras: nivel de las 7 de daño
   Devuelve: si ganó, minutos, daño recibido, curado (robo y tramos), vida más baja,
   y cuánto tiempo tuvo H3 lista pero sin maná.
   No cambia nada del juego.
   ===================================================================== */
function calibrarNivel(id, opciones = {}) {
  const PASO = 1 / 60;
  const m = new Mundo({ modo: 'solo', personajes: ['bubu'], escenario: id, semilla: opciones.semilla || 77 });
  const j = m.jugadores[0];
  const mej = MEJORAS.vacias().map((_, i) => (BALANCE.mejoras.lista[i].tipo === 'robo' ? (opciones.robo || 0) : (opciones.mejoras || 0)));
  j.mejoras = MEJORAS.normalizar(mej);
  const bot = crearBot(opciones.semilla || 3000);
  let t = 0, recibido = 0, robo = 0, tramos = 0, minimo = j.vida, h3Sin = 0, sinMana = 0, esferas = 0;
  const limite = opciones.limite || 1500;
  while (t < limite && m.estado === 'jugando') {
    const antes = { mana: j.energia, cd: j.enfriamientos.slice(), cc: j.enfriamientosCombo.slice() };
    const v0 = j.vida;
    const c = j.vivo ? bot.controlar(m, j, PASO) : new EstadoControl();
    m.actualizar(PASO, [c]);
    for (const e of m.eventos) {
      if (e.tipo === 'roboVida') robo += e.cantidad;
      if (e.tipo === 'curar') tramos += e.cantidad;
      if (e.tipo === 'mana') esferas++;
    }
    m.eventos.length = 0;
    bot.registrar(j, antes);
    if (j.vida < v0) recibido += v0 - j.vida;
    minimo = Math.min(minimo, j.vida);
    if (j.enfriamientos[2] <= 0 && j.energia < CONFIG.habilidades[2].energia) h3Sin += PASO;
    if (j.energia < 5) sinMana += PASO;
    t += PASO;
  }
  return {
    nivel: id, estado: m.estado, minutos: +(t / 60).toFixed(1), tramo: `${m.tramoActual}/${m.totalTramos}`,
    recibido: Math.round(recibido), curaRobo: robo, curaTramos: tramos, vidaMinima: Math.round(minimo),
    h3ListaSinMana: Math.round((h3Sin / t) * 100) + '%', manaBajo5: Math.round((sinMana / t) * 100) + '%', esferas, usos: bot.usos,
  };
}
