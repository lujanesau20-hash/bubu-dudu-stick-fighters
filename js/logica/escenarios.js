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

  // ---------- PREPARADOS (faltan fondo y enemigos propios) ----------
  cielo: {
    nombre: 'Cielo con Nubes', fondo: 'cielo', pendiente: true, enemigo: 'arquero', jefe: 'arqueroMaestro',
    ancho: 4700, sueloY: 620, inicio: [180, 260], plataformas: [], oleadas: [], zonaJefe: { gatillo: 3550, zona: [3300, 4700] },
  },
  espacio: {
    nombre: 'Espacio', fondo: 'espacio', pendiente: true, enemigo: 'mago', jefe: 'magoCosmico',
    ancho: 4700, sueloY: 620, inicio: [180, 260], plataformas: [], oleadas: [], zonaJefe: { gatillo: 3550, zona: [3300, 4700] },
  },
  ciudad: {
    nombre: 'Calle de Ciudad', fondo: 'ciudad', pendiente: true, enemigo: 'ninja', jefe: 'ninjaSombra',
    ancho: 4700, sueloY: 620, inicio: [180, 260], plataformas: [], oleadas: [], zonaJefe: { gatillo: 3550, zona: [3300, 4700] },
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
