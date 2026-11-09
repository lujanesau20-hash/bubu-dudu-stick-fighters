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
    { tecla: 'H4', nombre: 'Onda de choque',      mana: 20, enfriamiento: 5, danio: 80, bloqueo: 0.35, area: true, radio: 250 },
  ],

  // ---------- 1-3. Combinaciones ----------
  // danio del Torbellino = daño TOTAL repartido entre sus golpes
  combos: [
    { teclas: 'H1+H2', nombre: 'Corte volador',        mana: 12, enfriamiento: 3,  danio: 28 },
    { teclas: 'H2+H3', nombre: 'Torbellino relámpago', mana: 25, enfriamiento: 6,  danio: 70, golpes: 6, area: true, radio: 135 },
    { teclas: 'H3+H4', nombre: 'Cataclismo',           mana: 45, enfriamiento: 10, danio: 160, area: true, radio: 520 },
  ],

  // ---------- Daño de área con caída por distancia ----------
  // Las habilidades de área hacen 100% al enemigo más cercano al centro y el daño
  // baja con la distancia (medida al borde más cercano del enemigo) hasta "minimo" en el borde.
  // curva: 1 = baja en línea recta; 2 = baja poco al principio y más cerca del borde.
  areaDanio: { minimo: 0.4, curva: 1, completoAlMasCercano: true },

  // ---------- Vida de enemigos y jefes por nivel ----------
  enemigos: {
    vidaBase: 70,             // enemigo normal en el nivel 1 (Isla Flotante)
    crecimientoPorNivel: 1.15, // compuesto: vida = 70 x 1.15^(nivel - 1)
    multiplicadorJefe: 10,    // jefe = 10 x enemigo normal de SU nivel (nivel 10: 10 x 246 = 2460)
    // En modo pareja (ya existía): más enemigos y jefe con más vida
    parejaCantidad: 1.5,
    parejaVidaJefe: 1.6,
  },

  // Daño ACTUAL que hacen enemigos y jefes (sin modificar; para ajustarlo después)
  danioEnemigos: {
    normal: 8, arquero: 7, mago: 9, ninja: 9,
    espadachin: 10,           // nuevo enemigo (espada, más alcance)
    gigante: { punio: 18, pisoton: 15, embestida: 22 },
    // Jefes de los niveles 2, 3 y 4
    arqueroMaestro: { flecha: 7, lluvia: 9 },
    magoCosmico: { orbe: 6, meteoro: 11 },
    ninjaSombra: { corte: 9, shuriken: 4 },
  },

  // ---------- 4. Corazones de curación ----------
  corazones: {
    intervalo: 18,            // segundos de juego entre caídas (se detiene en pausa; se reinicia en cada nivel)
    duracion: 12,             // segundos que dura si nadie lo toma
    parpadeo: 3,              // parpadea los últimos segundos
    curacion: 0.3,            // fracción de la vida máxima que cura (30 con 100 de vida)
    porCaida: { solo: 1, pareja: 2 }, // en pareja (local o en línea) caen dos, uno cerca de cada jugador
    separacionMin: 300,       // distancia mínima entre los dos corazones
    velocidadCaida: 260,
    enVersus: false,
  },

  // ---------- Refuerzos durante la pelea con el jefe ----------
  refuerzos: {
    intervalo: 15,            // cada 15 s cae UN enemigo
    maxVivos: 2,              // nunca más de 2 refuerzos vivos a la vez
    tipos: ['normal', 'espadachin', 'ninja', 'arquero', 'mago'],
    cuerpoACuerpo: ['normal', 'espadachin', 'ninja'], // caen cerca de los jugadores
    cerca: [120, 320],        // distancia a los jugadores (cuerpo a cuerpo)
    lejos: [420, 620],        // distancia a los jugadores (a distancia), dentro de la pantalla
  },

  // ---------- Mundo 1: Isla Flotante (10 niveles) ----------
  // Un nivel es una secuencia de TRAMOS; cada tramo es una secuencia de OLEADAS.
  // Al limpiar la última oleada de un tramo aparece "¡ADELANTE!" y se pasa al siguiente.
  isla: {
    // Tramos por nivel: se partió de 2,3,4,5,6,7,8,9,10,10 y se ajustó con la simulación
    // (herramientas/simular_niveles.js) para acercarse a 2-4 min (nivel 1) ... ~12 min (niveles 9 y 10)
    niveles: [
      { tramos: 7 }, { tramos: 8 }, { tramos: 9 }, { tramos: 10 }, { tramos: 11 },
      { tramos: 11 }, { tramos: 11 }, { tramos: 12 }, { tramos: 12 },
      { tramos: 10, jefe: 'gigante', vidaJefe: 1700 }, // jefe final: vida fija (en pareja x1.6)
    ],
    oleadasBase: [3, 4, 7],   // enemigos de cada oleada en un tramo (antes de multiplicar)
    // multiplicador m = 1 + 0.12 x (tramo - 1) + 0.06 x (nivel - 1), redondeando
    crecimientoTramo: 0.12,
    crecimientoNivel: 0.06,
    maxPorOleada: 15,
    maxVivos: 12,             // enemigos vivos a la vez (el resto de la oleada entra al ir muriendo)
    // Tipos de enemigo según el nivel (y su frecuencia relativa)
    tiposDesde: { normal: 1, espadachin: 1, arquero: 3, ninja: 4, mago: 5 },
    pesos: { normal: 3, espadachin: 2, arquero: 1.5, ninja: 1.5, mago: 1 },
    anchoTramo: 1000,         // largo del mapa por tramo (px)
  },

  // ---------- Mundos (se desbloquean en orden) ----------
  // nivelVida: nivel que usan para la vida de sus enemigos y jefe
  mundos: [
    { id: 'isla', nombre: 'Isla Flotante' },
    { id: 'cielo', nombre: 'Cielo con Nubes', nivelVida: 11 },
    { id: 'espacio', nombre: 'Espacio', nivelVida: 12 },
    { id: 'ciudad', nombre: 'Calle de la Ciudad', nivelVida: 13 },
  ],
};

// Tabla de vida por nivel (se calcula con la fórmula de arriba)
BALANCE.vidaEnemigo = (nivel) => Math.round(BALANCE.enemigos.vidaBase * Math.pow(BALANCE.enemigos.crecimientoPorNivel, nivel - 1));
BALANCE.vidaJefe = (nivel) => BALANCE.vidaEnemigo(nivel) * BALANCE.enemigos.multiplicadorJefe;
BALANCE.tablaVidas = Array.from({ length: 13 }, (_, i) => ({ nivel: i + 1, enemigo: BALANCE.vidaEnemigo(i + 1), jefe: BALANCE.vidaJefe(i + 1) }));
// nivel 1: 70 · 2: 81 · 3: 93 · 4: 106 · 5: 122 · 6: 141 · 7: 162 · 8: 186 · 9: 214 · 10: 246 (jefe 2460)

// Factor de daño de área según la distancia (0 = centro, 1 = borde del área)
BALANCE.factorArea = (fraccion) => {
  const a = BALANCE.areaDanio;
  const f = Math.pow(U.clamp(fraccion, 0, 1), a.curva);
  return 1 - (1 - a.minimo) * f;
};

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
    if (c.radio) d.radio = c.radio;
  });
  if (b.habilidades[3].radio) CONFIG.habilidades[3].radio = b.habilidades[3].radio;

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
