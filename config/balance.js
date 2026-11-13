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
    curaPorTramo: 0.4,        // al limpiar un tramo ("¡ADELANTE!") cada jugador vivo recupera 40% de su vida máxima
  },

  // ---------- 1-3. Habilidades (H1..H4) ----------
  // mana: costo · enfriamiento: segundos · danio: daño base (sin mejoras de la tienda)
  // bloqueo: segundos en que no se puede lanzar OTRO ataque (un ataque no interrumpe a otro)
  // Daños de v1.02 (antes: 4, 10, 30, 80). La espada de cerca (H2) mata a un enemigo del nivel 1 (70) en 4 golpes.
  habilidades: [
    { tecla: 'H1', nombre: 'Daga (cuchilla)',     mana: 2,  enfriamiento: 0, danio: 16, bloqueo: 0.30 },
    { tecla: 'H2', nombre: 'Espada (tajo)',       mana: 4,  enfriamiento: 0, danio: 22, bloqueo: 0.35 },
    // H3 (v1.05): retroceso 0 y aturdimiento 0 contra enemigos y jefes, igual que Corte volador y Torbellino
    // (1 = empujón / pausa de impacto normal; ver la explicación en "combos"). En versus no se usan.
    { tecla: 'H3', nombre: 'Flash (dash)',        mana: 10, enfriamiento: 3, danio: 35, bloqueo: 0, retroceso: 0, aturdimiento: 0 }, // antes 2 s
    { tecla: 'H4', nombre: 'Onda de choque',      mana: 20, enfriamiento: 7, danio: 70, bloqueo: 0.35, area: true, radio: 250 }, // antes 5 s; en el borde 40% = 28
  ],

  // ---------- 1-3. Combinaciones ----------
  // danio del Torbellino = daño TOTAL repartido entre sus golpes
  // Daños de v1.02 (antes: 28, 70, 160). Con mejoras al máximo, el Cataclismo llega a 200.
  // retroceso y aturdimiento (v1.04), solo contra enemigos y jefes (en versus no se usan):
  //   retroceso: 1 = empujón normal (BALANCE.empujon), 0 = sin empujón.
  //   aturdimiento: 1 = pausa de impacto normal (el mundo se frena un instante), 0 = sin pausa.
  //   Corte volador y Torbellino van en 0: el enemigo sigue caminando o atacando mientras recibe daño.
  combos: [
    { teclas: 'H1+H2', nombre: 'Corte volador',        mana: 12, enfriamiento: 3,  danio: 40, retroceso: 0, aturdimiento: 0 },
    { teclas: 'H2+H3', nombre: 'Torbellino relámpago', mana: 25, enfriamiento: 10, danio: 84, golpes: 6, area: true, radio: 135, retroceso: 0, aturdimiento: 0 }, // antes 6 s; 14 por golpe
    // Cataclismo (v1.03): radio 380 (antes 260; al principio 520) para alcanzar a los magos que se quedan lejos,
    // y en el borde hace 60% (minimoArea; las demás áreas siguen con areaDanio.minimo = 40%)
    { teclas: 'H3+H4', nombre: 'Cataclismo',           mana: 45, enfriamiento: 20, danio: 100, area: true, radio: 380, minimoArea: 0.6 }, // antes 10 s
  ],

  // ---------- Empujón al golpear enemigos ----------
  // H1 y H2: no aturden ni empujan (el enemigo puede seguir atacando).
  // H3, H4 y los combos: no aturden; dan un empujón corto hacia atrás.
  // Distancia del empujón = pasos x pasoPx (1 paso ≈ el ancho del personaje).
  empujon: { pasos: 1.5, pasoPx: 40, velocidad: 700 },

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

  // Daño que hacen enemigos y jefes.
  // Enemigos comunes y Gigante ajustados con la simulación (antes: normal 8, arquero 7, mago 9,
  // ninja 9, espadachín 10; Gigante puño 18, pisotón 15, embestida 22).
  danioEnemigos: {
    normal: 4, arquero: 3, mago: 4, ninja: 4,
    ave: 4,                   // ave voladora (bola de fuego recta)
    espadachin: 5,            // enemigo con espada (más alcance)
    gigante: { punio: 9, pisoton: 8, embestida: 11 },
    // Jefes de los niveles 2, 3 y 4
    arqueroMaestro: { flecha: 7, lluvia: 9 },
    magoCosmico: { orbe: 6, meteoro: 11 },
    ninjaSombra: { corte: 9, shuriken: 4 },
  },

  // ---------- Monedas que sueltan los enemigos ----------
  // Caen al suelo o a la plataforma donde estaba el enemigo, se quedan quietas
  // y hay que ir a tocarlas (sin imán). En pareja, para el primero que la toque.
  monedas: {
    monedasPorEnemigo: 1,       // normales, arqueros, magos, ninjas, espadachines, aves y refuerzos (antes 3 a 5 según el tipo)
    duracionMonedaSuelo: 10,    // segundos en el suelo antes de desaparecer
    parpadeoMoneda: 3,          // parpadea los últimos segundos (como los corazones)
    radioRecogida: { celular: 45, laptop: 20 }, // px del mundo alrededor del cuerpo del jugador (en línea se usa el de celular)
    // El JEFE no cambia: suelta CONFIG.jefes[...].monedas (80 a 110) con imán, como antes.
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
    tiposDesde: { normal: 1, espadachin: 1, arquero: 1, ninja: 4, mago: 5 }, // arqueros desde el nivel 1 (antes 3)
    pesos: { normal: 3, espadachin: 2, arquero: 1.5, ninja: 1.5, mago: 1 },
    anchoTramo: 1000,         // largo del mapa por tramo (px)
  },

  // ---------- Enemigos a distancia (arqueros y magos), en TODOS los mundos ----------
  // Por tramo: entre min y max según el nivel dentro del mundo (1..10; después se usa el último valor).
  // Cuentan dentro del máximo por oleada y de vivos a la vez.
  distancia: {
    tipos: ['arquero', 'mago'],
    minPorTramo: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3],
    maxPorTramo: [3, 3, 3, 3, 4, 4, 4, 5, 5, 5],
    maxVivos: 5,              // nunca más de 5 a distancia vivos a la vez
  },

  // ---------- Ave voladora (en TODOS los mundos) ----------
  // Cantidad de aves en el nivel completo según el nivel dentro del mundo (1..10).
  aves: {
    porNivel: [1, 1, 1, 2, 2, 3, 3, 4, 4, 5],
    alturaVuelo: 180,         // px sobre el suelo
    velocidadBola: 420,       // la bola de fuego va recta hacia donde estaba el jugador
  },

  // ---------- Tienda / mejoras de daño (pestaña "Mejoras") ----------
  // Una mejora por habilidad y POR PERSONAJE (lo de Bubu solo lo usa Bubu; lo de Dudu, solo Dudu).
  // Cada nivel sube el daño "subidaPorNivel" del daño BASE (lineal): nivel 5 = base x 2.0.
  // El área, la caída por distancia, el maná y los enfriamientos no cambian.
  // Precio del nivel n (1..5) = precioBase x crecimientoPrecio^(n-1), redondeado a "redondeoPrecio".
  // Precios calculados con herramientas/simular_mejoras.js (todas las monedas del Mundo 1 en un
  // personaje): ~7 mejoras al desbloquear (fin del nivel 5) y ~14 de 35 al terminar el nivel 10.
  mejoras: {
    desbloqueaAlSuperar: 'isla-5', // la pestaña se abre al completar el nivel 5
    niveles: 5,
    subidaPorNivel: 0.20,
    crecimientoPrecio: 1.5,
    redondeoPrecio: 5,
    // tipo 'habilidad' -> BALANCE.habilidades[indice]; tipo 'combo' -> BALANCE.combos[indice]
    lista: [
      { id: 'h1',          tipo: 'habilidad', indice: 0, icono: '🗡', nombre: 'Cuchilla (H1)',  precioBase: 115 },
      { id: 'h2',          tipo: 'habilidad', indice: 1, icono: '⚔', nombre: 'Espada (H2)',    precioBase: 115 },
      { id: 'h3',          tipo: 'habilidad', indice: 2, icono: '⚡', nombre: 'Flash (H3)',     precioBase: 175 },
      { id: 'h4',          tipo: 'habilidad', indice: 3, icono: '💥', nombre: 'Onda (H4)',      precioBase: 175 },
      { id: 'corte',       tipo: 'combo',     indice: 0, icono: '🌙', nombre: 'Corte volador',  precioBase: 230 },
      { id: 'torbellino',  tipo: 'combo',     indice: 1, icono: '🌀', nombre: 'Torbellino',     precioBase: 230 },
      { id: 'cataclismo',  tipo: 'combo',     indice: 2, icono: '☄️', nombre: 'Cataclismo',     precioBase: 345 },
    ],
  },

  // ---------- Versus ----------
  versus: {
    vida: 500,                // vida de Bubu y Dudu al empezar cada ronda (antes 100)
    usarMejoras: false,       // false: el versus usa SIEMPRE el daño base (justo para los dos)
    // Sin regeneración: no caen corazones (corazones.enVersus) y no hay curación por tramo ni por golpe.
    // El versus además multiplica todo el daño por CONFIG.versus.multiplicadorDanio (0.8, en js/config.js).
  },

  // ---------- Reentrada del invitado en línea ----------
  reentrada: {
    distanciaEsquina: 420,    // aparece a un costado de la pantalla, lejos del líder
    alturaCaida: 480,         // cae desde arriba "como si reapareciera"
    invulnerable: 2.5,        // segundos sin recibir daño al volver
    vidaSiEstabaCaido: 0.3,   // si salió estando caído, vuelve con 30% de vida
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
// minimo: opcional, para un área con su propio mínimo (Cataclismo); si no, areaDanio.minimo
BALANCE.factorArea = (fraccion, minimo) => {
  const a = BALANCE.areaDanio;
  const f = Math.pow(U.clamp(fraccion, 0, 1), a.curva);
  return 1 - (1 - (minimo ?? a.minimo)) * f;
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
    Object.assign(CONFIG.habilidades[i], { energia: h.mana, enfriamiento: h.enfriamiento, danio: h.danio, bloqueo: h.bloqueo,
      retroceso: h.retroceso ?? 1, aturdimiento: h.aturdimiento ?? 1 });
  });
  b.combos.forEach((c, i) => {
    const d = CONFIG.combos.lista[i];
    d.energia = c.mana;
    d.enfriamiento = c.enfriamiento;
    d.danio = c.golpes ? c.danio / c.golpes : c.danio; // por golpe
    if (c.golpes) d.golpes = c.golpes;
    if (c.radio) d.radio = c.radio;
    if (c.minimoArea != null) d.minimoArea = c.minimoArea;
    d.retroceso = c.retroceso ?? 1;
    d.aturdimiento = c.aturdimiento ?? 1;
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
