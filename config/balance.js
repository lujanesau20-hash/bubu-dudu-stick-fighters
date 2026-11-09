/* =====================================================================
   BALANCE DEL JUEGO — todos los números ajustables en un solo lugar.
   Se carga después de js/config.js y aplica estos valores sobre CONFIG.
   Cambia un número aquí, recarga la página y listo.
   ===================================================================== */
const BALANCE = {
  // ---------- 1. Vida y maná de cada jugador ----------
  jugador: {
    vidaMax: 100,
    manaMax: 100,
    manaInicial: 50,          // maná al empezar cada nivel/ronda
    manaPorSegundo: 5,        // recuperación con el tiempo
    manaPorGolpe: 2,          // extra por cada golpe que acierta
  },

  // ---------- 1-3. Habilidades (H1..H4) ----------
  // mana: costo · enfriamiento: segundos · danio: daño base
  // bloqueo: segundos en que no se puede lanzar OTRO ataque (un ataque no interrumpe a otro)
  habilidades: [
    { tecla: 'H1', nombre: 'Daga (cuchilla)',     mana: 2,  enfriamiento: 0, danio: 4,  bloqueo: 0.30 },
    { tecla: 'H2', nombre: 'Espada (tajo)',       mana: 4,  enfriamiento: 0, danio: 10, bloqueo: 0.35 },
    { tecla: 'H3', nombre: 'Flash (dash)',        mana: 10, enfriamiento: 2, danio: 30, bloqueo: 0 },
    { tecla: 'H4', nombre: 'Onda de choque',      mana: 20, enfriamiento: 5, danio: 80, bloqueo: 0.35, area: true },
  ],

  // ---------- 1-3. Combinaciones ----------
  // danio del Torbellino = daño TOTAL repartido entre sus golpes
  combos: [
    { teclas: 'H1+H2', nombre: 'Corte volador',        mana: 12, enfriamiento: 3,  danio: 28 },
    { teclas: 'H2+H3', nombre: 'Torbellino relámpago', mana: 25, enfriamiento: 6,  danio: 70, golpes: 6, area: true },
    { teclas: 'H3+H4', nombre: 'Cataclismo',           mana: 45, enfriamiento: 10, danio: 160, area: true },
  ],

  // ---------- 3. Vida de enemigos y jefes por nivel ----------
  enemigos: {
    vidaBase: 50,             // enemigo normal en el nivel 1
    subidaPorNivel: 0.15,     // +15% por nivel: 50 x (1 + 0.15 x (nivel - 1))
    multiplicadorJefe: 25,    // jefe = 25 x enemigo normal del mismo nivel (ajustado por la simulación; antes 10)
    // En modo pareja (ya existía): más enemigos y jefe con más vida
    parejaCantidad: 1.5,
    parejaVidaJefe: 1.6,
  },

  // Daño ACTUAL que hacen enemigos y jefes (sin modificar; para ajustarlo después)
  danioEnemigos: {
    normal: 8, arquero: 7, mago: 9, ninja: 9,
    gigante: { punio: 18, pisoton: 15, embestida: 22 },
    // Jefes de los niveles 2, 3 y 4
    arqueroMaestro: { flecha: 7, lluvia: 9 },
    magoCosmico: { orbe: 6, meteoro: 11 },
    ninjaSombra: { corte: 9, shuriken: 4 },
  },

  // ---------- 4. Corazones de curación ----------
  corazones: {
    intervalo: 10,            // segundos de juego entre corazones (se detiene en pausa; antes 25)
    duracion: 12,             // segundos que dura si nadie lo toma
    parpadeo: 3,              // parpadea los últimos segundos
    curacion: 0.5,            // fracción de la vida máxima que cura
    velocidadCaida: 260,
    enVersus: false,
  },
};

// Tabla de vida por nivel (se calcula con la fórmula de arriba)
BALANCE.vidaEnemigo = (nivel) => Math.round(BALANCE.enemigos.vidaBase * (1 + BALANCE.enemigos.subidaPorNivel * (nivel - 1)) + 1e-9);
BALANCE.vidaJefe = (nivel) => BALANCE.vidaEnemigo(nivel) * BALANCE.enemigos.multiplicadorJefe;
BALANCE.tablaVidas = [1, 2, 3, 4].map((n) => ({ nivel: n, enemigo: BALANCE.vidaEnemigo(n), jefe: BALANCE.vidaJefe(n) }));
// nivel 1: 50 / 1250 · nivel 2: 58 / 1450 · nivel 3: 65 / 1625 · nivel 4: 73 / 1825

// ---------- Aplicar sobre CONFIG ----------
(function aplicarBalance() {
  const b = BALANCE;
  CONFIG.jugador.vidaMax = b.jugador.vidaMax;
  CONFIG.energia.max = b.jugador.manaMax;
  CONFIG.energia.regenPorSegundo = b.jugador.manaPorSegundo;
  CONFIG.energia.porGolpe = b.jugador.manaPorGolpe;
  CONFIG.energia.inicial = b.jugador.manaInicial;

  b.habilidades.forEach((h, i) => {
    Object.assign(CONFIG.habilidades[i], { energia: h.mana, enfriamiento: h.enfriamiento, danio: h.danio, bloqueo: h.bloqueo });
  });
  b.combos.forEach((c, i) => {
    const d = CONFIG.combos.lista[i];
    d.energia = c.mana;
    d.enfriamiento = c.enfriamiento;
    d.danio = c.golpes ? c.danio / c.golpes : c.danio; // por golpe
    if (c.golpes) d.golpes = c.golpes;
  });

  for (const tipo of Object.keys(CONFIG.enemigos)) {
    CONFIG.enemigos[tipo].vida = b.vidaEnemigo(1);
    if (b.danioEnemigos[tipo] !== undefined) CONFIG.enemigos[tipo].danio = b.danioEnemigos[tipo];
  }
  for (const tipo of Object.keys(CONFIG.jefes)) CONFIG.jefes[tipo].vida = b.vidaJefe(1);
  const g = b.danioEnemigos.gigante;
  Object.assign(CONFIG.jefes.gigante, { danioPunio: g.punio, danioPisoton: g.pisoton, danioEmbestida: g.embestida });
  const am = b.danioEnemigos.arqueroMaestro, mc = b.danioEnemigos.magoCosmico, ns = b.danioEnemigos.ninjaSombra;
  Object.assign(CONFIG.jefes.arqueroMaestro, { danioFlecha: am.flecha, danioLluvia: am.lluvia });
  Object.assign(CONFIG.jefes.magoCosmico, { danioOrbe: mc.orbe, danioMeteoro: mc.meteoro });
  Object.assign(CONFIG.jefes.ninjaSombra, { danioCorte: ns.corte, danioShuriken: ns.shuriken });
  CONFIG.multiplicadorPareja.enemigos = b.enemigos.parejaCantidad;
  CONFIG.multiplicadorPareja.vidaJefe = b.enemigos.parejaVidaJefe;
})();
