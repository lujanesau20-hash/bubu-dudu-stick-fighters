/* =====================================================================
   CONFIGURACIÓN GENERAL DEL JUEGO
   Aquí se ajusta casi todo: física, controles, habilidades, combos,
   enemigos, jefes, revivir, tienda y red. Cambia valores y recarga.
   ===================================================================== */
const CONFIG = {
  // Alto del mundo visible (en unidades del juego) con zoom 1.
  // El ancho se calcula según la pantalla.
  vista: { alto: 720, zoomMinimo: 0.62 },

  fisica: {
    gravedad: 2300,
    velocidadCaidaMax: 1500,
  },

  // ---------------- Jugadores ----------------
  jugador: {
    velocidad: 340,
    velocidadAgachado: 130,
    aceleracion: 2800,
    aceleracionAire: 1700,
    salto: 860,
    dobleSalto: 760,
    tiempoCoyote: 0.1,       // margen para saltar justo después de dejar el borde
    bufferSalto: 0.12,       // margen para saltar justo antes de tocar el suelo
    ancho: 52,
    alto: 80,
    altoAgachado: 50,
    altoSprite: 104,         // alto con el que se dibuja el sprite
    vidaMax: 100,
    invulnerableTrasGolpe: 0.6,
    aturdidoTrasGolpe: 0.22,
    separacionMaxPareja: 820, // distancia máxima entre Bubu y Dudu en modo pareja
  },

  energia: {
    max: 100,
    regenPorSegundo: 6,
    porGolpe: 3.5,           // energía extra por cada golpe acertado
  },

  // ---------------- Personajes ----------------
  // Las imágenes de los personajes salen de config/personajes.js (hojas de sprites actuales).
  // anclas: posiciones (0..1 dentro del retrato) donde se dibuja la ropa en la tienda y el HUD.
  // Bubu = oso panda BLANCO (orejas y parches negros, moño negro).
  // Dudu = oso MARRÓN (sin moño).
  personajes: {
    bubu: {
      nombre: 'Bubu',
      color: '#f2f2f2',
      anclas: {
        cabeza: { x: 0.55, y: 0.08, ancho: 0.55 },
        torso: { x: 0.53, y: 0.74, ancho: 0.5, alto: 0.32 },
      },
    },
    dudu: {
      nombre: 'Dudu',
      color: '#c98f7c',
      anclas: {
        cabeza: { x: 0.5, y: 0.07, ancho: 0.62 },
        torso: { x: 0.52, y: 0.73, ancho: 0.62, alto: 0.34 },
      },
    },
  },

  // ---------------- Controles (códigos de KeyboardEvent.code) ----------------
  controles: {
    // Un solo jugador
    solo: {
      izquierda: ['KeyA', 'ArrowLeft'],
      derecha: ['KeyD', 'ArrowRight'],
      saltar: ['KeyW', 'Space', 'ArrowUp'],
      agachar: ['KeyS', 'ArrowDown'],
      habilidades: [['Digit1', 'KeyJ'], ['Digit2', 'KeyK'], ['Digit3', 'KeyL'], ['Digit4', 'KeyI']],
      revivir: ['KeyE'],
    },
    // Dos jugadores en el mismo teclado
    j1: {
      izquierda: ['KeyA'],
      derecha: ['KeyD'],
      saltar: ['KeyW', 'Space'],
      agachar: ['KeyS'],
      habilidades: [['Digit1'], ['Digit2'], ['Digit3'], ['Digit4']],
      revivir: ['KeyE'],
    },
    j2: {
      izquierda: ['ArrowLeft'],
      derecha: ['ArrowRight'],
      saltar: ['ArrowUp'],
      agachar: ['ArrowDown'],
      habilidades: [['Digit7', 'Numpad1'], ['Digit8', 'Numpad2'], ['Digit9', 'Numpad3'], ['Digit0', 'Numpad4']],
      revivir: ['ShiftRight', 'Numpad0', 'Enter'],
    },
    generales: { pausa: ['Escape', 'KeyP'] },
  },

  // Controles táctiles
  tactil: {
    radioJoystick: 58,
    zonaMuerta: 0.22,
    umbralAgachar: 0.6,      // cuánto bajar el joystick para agacharse
    disposicion: 'arco',     // 'arco' o 'fila'
  },

  // ---------------- Habilidades (de menos a más poderosa) ----------------
  habilidades: [
    { id: 'cuchilla', nombre: 'Cuchilla', icono: '🗡', danio: 9, energia: 8, enfriamiento: 0.35,
      velocidad: 950, saltito: 330, empuje: 120 },
    { id: 'tajo', nombre: 'Tajo de espada', icono: '⚔', danio: 18, energia: 15, enfriamiento: 0.55,
      alcance: 120, empuje: 300 },
    { id: 'dash', nombre: 'Dash relámpago', icono: '⚡', danio: 26, energia: 25, enfriamiento: 1.3,
      distancia: 360, duracion: 0.18, empuje: 380 },
    { id: 'onda', nombre: 'Onda de choque', icono: '💥', danio: 40, energia: 38, enfriamiento: 5,
      radio: 250, empuje: 620 },
  ],

  // ---------------- Combinaciones ----------------
  combos: {
    ventanaMs: 250,          // PC: tiempo máximo entre las dos teclas
    ventanaTactilMs: 900,    // táctil: tiempo para deslizar al botón vecino
    enfriamiento: 1.0,
    lista: [
      { id: 'corteVolador', nombre: '¡CORTE VOLADOR!', icono: '🌙', habilidades: [0, 1], energia: 70,
        danio: 48, velocidad: 820, color: '#7fe3ff' },
      { id: 'torbellino', nombre: '¡TORBELLINO RELÁMPAGO!', icono: '🌀', habilidades: [1, 2], energia: 80,
        danio: 16, golpes: 6, duracion: 0.75, velocidad: 650, radio: 135, color: '#ffe066' },
      { id: 'cataclismo', nombre: '¡CATACLISMO!', icono: '☄️', habilidades: [2, 3], energia: 92,
        danio: 120, radio: 520, empuje: 950, color: '#ff6a3d' },
    ],
  },

  // ---------------- Revivir (modo pareja) ----------------
  revivir: {
    tiempoCaido: 15,
    tiempoRevivir: 4,
    distancia: 115,
    vidaAlRevivir: 0.3,
    maxPorNivel: 2,
  },

  // ---------------- Enemigos ----------------
  // "monedas" de cada enemigo ya no se usa: todos sueltan config/balance.js -> monedas.monedasPorEnemigo
  // (se deja el número de antes como referencia). Los jefes sí siguen usando su "monedas".
  // Cada escenario usa un tipo. "normal" está completo; el resto usa la IA base
  // hasta que se programe su comportamiento propio (ver logica/enemigos.js).
  enemigos: {
    normal: { nombre: 'Stickman', color: '#e0413b', vida: 42, velocidad: 135, danio: 8,
      alcance: 62, preparacion: 0.42, ancho: 34, alto: 82, monedas: 3 },
    arquero: { nombre: 'Arquero', color: '#3a9b4a', vida: 34, velocidad: 110, danio: 7,
      alcance: 520, preparacion: 0.6, ancho: 34, alto: 82, monedas: 4 },
    mago: { nombre: 'Mago', color: '#8a4fd8', vida: 38, velocidad: 100, danio: 9,
      alcance: 460, preparacion: 0.7, ancho: 34, alto: 82, monedas: 5 },
    // Espadachín: como el normal pero con espada (más alcance y daño)
    espadachin: { nombre: 'Espadachín', color: '#e8590c', vida: 50, velocidad: 125, danio: 10,
      alcance: 92, preparacion: 0.5, ancho: 34, alto: 82, monedas: 4 },
    // Ave voladora: vuela por arriba y lanza una bola de fuego recta hacia donde estaba el jugador
    ave: { nombre: 'Ave de fuego', color: '#f76707', vida: 50, velocidad: 170, danio: 4, vuela: true,
      alcance: 520, preparacion: 0.55, ancho: 40, alto: 46, monedas: 4 },
    ninja: { nombre: 'Ninja', color: '#5c677d', vida: 36, velocidad: 230, danio: 9,
      alcance: 64, preparacion: 0.25, ancho: 32, alto: 80, monedas: 5 },
  },

  // ---------------- Jefes ----------------
  jefes: {
    gigante: { nombre: 'EL GIGANTE', color: '#5b3a8c', vida: 1100, velocidad: 75, ancho: 96,
      alto: 235, monedas: 80, danioPunio: 18, danioPisoton: 15, danioEmbestida: 22 },
    // Jefes de los niveles 2, 3 y 4 (su vida y daño se ajustan en config/balance.js)
    arqueroMaestro: { nombre: 'ARQUERO MAESTRO', color: '#1f6b2c', vida: 900, velocidad: 130, ancho: 56,
      alto: 150, monedas: 90, danioFlecha: 7, danioLluvia: 9 },
    magoCosmico: { nombre: 'MAGO CÓSMICO', color: '#6a3fd1', vida: 1000, velocidad: 95, ancho: 58,
      alto: 160, monedas: 100, danioOrbe: 6, danioMeteoro: 11 },
    ninjaSombra: { nombre: 'NINJA SOMBRA', color: '#7d8597', vida: 950, velocidad: 250, ancho: 46,
      alto: 140, monedas: 110, danioCorte: 9, danioShuriken: 4 },
  },
  multiplicadorPareja: { enemigos: 1.5, vidaJefe: 1.6 },

  // ---------------- Versus ----------------
  versus: { rondasParaGanar: 2, invulnerableTrasGolpe: 0.35, multiplicadorDanio: 0.8 },

  // ---------------- Monedas y tienda ----------------
  monedas: { bonoNivel: 60 },
  tienda: {
    // Conjuntos de ropa en orden de precio
    ropa: [
      { id: 'calle', nombre: 'Ropa de calle', precio: 40 },
      { id: 'trabajo', nombre: 'Ropa de trabajo', precio: 90 },
      { id: 'oficinista', nombre: 'Oficinista', precio: 160 },
      { id: 'formal', nombre: 'Formal (terno)', precio: 260 },
      { id: 'guerrero', nombre: 'Guerrero', precio: 400 },
      { id: 'rey', nombre: 'Rey', precio: 600 },
      { id: 'oro', nombre: 'Oro', precio: 900 },
    ],
    // Piezas de cabeza (se combinan con cualquier conjunto)
    cabeza: [
      { id: 'gorra', nombre: 'Gorra', precio: 30 },
      { id: 'casco', nombre: 'Casco', precio: 80 },
      { id: 'sombrero', nombre: 'Sombrero', precio: 140 },
      { id: 'corona', nombre: 'Corona de rey', precio: 500 },
    ],
  },

  // ---------------- Red (fase 2) ----------------
  red: {
    habilitada: false,
    servidor: 'wss://tu-servidor.ejemplo.com/bubududu',
    ticksPorSegundo: 60,
  },

  guardado: { clave: 'bubududu_guardado_v1' },
};
