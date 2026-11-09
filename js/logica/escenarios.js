/* =====================================================================
   ESCENARIOS (datos de los niveles)
   Para agregar uno nuevo:
     1. Copia el bloque "isla" y cambia sus datos (plataformas, oleadas, jefe).
     2. Agrega su fondo en dibujo/fondos.js (FONDOS.<id>).
     3. Quita "pendiente: true".
   Oleadas: cuando un jugador pasa "gatillo", la zona se cierra entre
   zona[0] y zona[1] hasta derrotar a todos los enemigos de la oleada.
   ===================================================================== */
const ESCENARIOS = {
  isla: {
    nombre: 'Isla Flotante',
    fondo: 'isla',
    ancho: 4700,
    sueloY: 620,
    enemigo: 'normal',
    jefe: 'gigante',
    inicio: [180, 260],
    plataformas: [
      { x: 650, y: 470, w: 230 },
      { x: 1000, y: 380, w: 200 },
      { x: 1450, y: 465, w: 260 },
      { x: 1900, y: 360, w: 210 },
      { x: 2250, y: 460, w: 240 },
      { x: 2620, y: 330, w: 190 },
      { x: 2980, y: 450, w: 230 },
      // arena del jefe
      { x: 3700, y: 455, w: 210 },
      { x: 4280, y: 455, w: 210 },
    ],
    oleadas: [
      { gatillo: 520, zona: [0, 1500], grupos: [{ cantidad: 3, retraso: 0 }] },
      { gatillo: 1500, zona: [800, 2400], grupos: [{ cantidad: 3, retraso: 0 }, { cantidad: 2, retraso: 3 }] },
      { gatillo: 2500, zona: [1800, 3350], grupos: [{ cantidad: 3, retraso: 0 }, { cantidad: 3, retraso: 3.5 }] },
    ],
    zonaJefe: { gatillo: 3550, zona: [3300, 4700] },
  },

  // ---------- NIVEL 2: CIELO ----------
  cielo: {
    nombre: 'Cielo con Nubes',
    fondo: 'cielo',
    ancho: 4700,
    sueloY: 620,
    enemigo: 'arquero',
    jefe: 'arqueroMaestro',
    inicio: [180, 260],
    plataformas: [
      { x: 560, y: 480, w: 200 },
      { x: 860, y: 370, w: 180 },
      { x: 1180, y: 460, w: 220 },
      { x: 1560, y: 340, w: 200 },
      { x: 1900, y: 450, w: 240 },
      { x: 2300, y: 360, w: 180 },
      { x: 2650, y: 470, w: 220 },
      { x: 3000, y: 350, w: 200 },
      // arena del jefe: escalones de nubes
      { x: 3560, y: 470, w: 180 },
      { x: 3900, y: 360, w: 200 },
      { x: 4300, y: 470, w: 180 },
    ],
    oleadas: [
      { gatillo: 520, zona: [0, 1500], grupos: [{ tipo: 'arquero', cantidad: 2, retraso: 0 }, { tipo: 'normal', cantidad: 2, retraso: 2 }] },
      { gatillo: 1500, zona: [800, 2400], grupos: [{ tipo: 'normal', cantidad: 2, retraso: 0 }, { tipo: 'arquero', cantidad: 2, retraso: 2.5 }, { tipo: 'arquero', cantidad: 1, retraso: 5 }] },
      { gatillo: 2500, zona: [1800, 3350], grupos: [{ tipo: 'arquero', cantidad: 3, retraso: 0 }, { tipo: 'normal', cantidad: 3, retraso: 4 }] },
    ],
    zonaJefe: { gatillo: 3550, zona: [3300, 4700] },
  },

  // ---------- NIVEL 3: ESPACIO ----------
  espacio: {
    nombre: 'Espacio',
    fondo: 'espacio',
    ancho: 4700,
    sueloY: 620,
    enemigo: 'mago',
    jefe: 'magoCosmico',
    inicio: [180, 260],
    plataformas: [
      { x: 620, y: 450, w: 220 },
      { x: 980, y: 340, w: 160 },
      { x: 1320, y: 470, w: 240 },
      { x: 1700, y: 370, w: 200 },
      { x: 2050, y: 470, w: 180 },
      { x: 2380, y: 330, w: 220 },
      { x: 2800, y: 450, w: 200 },
      { x: 3120, y: 340, w: 160 },
      // arena del jefe: plataformas en los extremos y una alta en el centro
      { x: 3480, y: 450, w: 200 },
      { x: 3920, y: 330, w: 220 },
      { x: 4380, y: 450, w: 200 },
    ],
    oleadas: [
      { gatillo: 520, zona: [0, 1500], grupos: [{ tipo: 'mago', cantidad: 2, retraso: 0 }, { tipo: 'normal', cantidad: 2, retraso: 2 }] },
      { gatillo: 1500, zona: [800, 2400], grupos: [{ tipo: 'mago', cantidad: 2, retraso: 0 }, { tipo: 'arquero', cantidad: 2, retraso: 3 }] },
      { gatillo: 2500, zona: [1800, 3350], grupos: [{ tipo: 'mago', cantidad: 3, retraso: 0 }, { tipo: 'normal', cantidad: 2, retraso: 3 }, { tipo: 'arquero', cantidad: 1, retraso: 5 }] },
    ],
    zonaJefe: { gatillo: 3550, zona: [3300, 4700] },
  },

  // ---------- NIVEL 4: CALLE DE CIUDAD ----------
  ciudad: {
    nombre: 'Calle de Ciudad',
    fondo: 'ciudad',
    ancho: 4700,
    sueloY: 620,
    enemigo: 'ninja',
    jefe: 'ninjaSombra',
    inicio: [180, 260],
    plataformas: [
      { x: 600, y: 470, w: 240 },
      { x: 950, y: 380, w: 200 },
      { x: 1350, y: 470, w: 260 },
      { x: 1750, y: 360, w: 220 },
      { x: 2150, y: 470, w: 240 },
      { x: 2550, y: 380, w: 200 },
      { x: 2950, y: 470, w: 260 },
      // arena del jefe
      { x: 3600, y: 460, w: 220 },
      { x: 4000, y: 360, w: 200 },
      { x: 4350, y: 460, w: 220 },
    ],
    oleadas: [
      { gatillo: 520, zona: [0, 1500], grupos: [{ tipo: 'ninja', cantidad: 2, retraso: 0 }, { tipo: 'normal', cantidad: 2, retraso: 2 }] },
      { gatillo: 1500, zona: [800, 2400], grupos: [{ tipo: 'ninja', cantidad: 3, retraso: 0 }, { tipo: 'arquero', cantidad: 1, retraso: 3 }] },
      { gatillo: 2500, zona: [1800, 3350], grupos: [{ tipo: 'ninja', cantidad: 3, retraso: 0 }, { tipo: 'mago', cantidad: 2, retraso: 3 }, { tipo: 'ninja', cantidad: 2, retraso: 6 }] },
    ],
    zonaJefe: { gatillo: 3550, zona: [3300, 4700] },
  },
};

// Orden de los niveles en la campaña
const ORDEN_NIVELES = ['isla', 'cielo', 'espacio', 'ciudad'];

// Arenas del modo Versus
const ARENAS_VERSUS = {
  isla: {
    nombre: 'Arena de la Isla',
    fondo: 'isla',
    ancho: 1500,
    sueloY: 620,
    inicio: [450, 1050],
    plataformas: [
      { x: 260, y: 455, w: 240 },
      { x: 1000, y: 455, w: 240 },
      { x: 630, y: 320, w: 240 },
    ],
  },
};
