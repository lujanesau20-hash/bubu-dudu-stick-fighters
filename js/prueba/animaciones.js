/* =====================================================================
   PRUEBA DE PERSONAJES - Configuración de hojas de sprites y animaciones
   Bubu = oso panda BLANCO (moño negro). Dudu = oso MARRÓN (sin moño).

   Cada hoja es UNA fila de cuadros, vista lateral mirando a la derecha.
   - cuadros: cuántos cuadros se esperan (se comprueba al cargar).
   - escala:  factor para igualar el tamaño entre hojas del MISMO personaje
              (las hojas vienen dibujadas a escalas distintas). Referencia:
              la hoja "caminar" = 1. Se midió por el ancho de la cabeza.
   - usar:    índices de cuadros a usar (si se omite, todos).
   - falta:   no hay hoja todavía. codigo: true = se simula por código.
   - provisional: usa la hoja de otro personaje (marcado en el visor).
   ===================================================================== */
const PRUEBA_CONFIG = {
  // Tamaño en pantalla: píxeles de pantalla por píxel de hoja (a escala 1)
  escalaBase: 0.36,
  // UNA escala por personaje (la misma para todas sus animaciones)
  escalaPersonaje: { bubu: 1.0, dudu: 1.06 }, // Dudu un poco más grande

  // Detección de cuadros
  umbralAlfa: 40,     // alfa mínimo para considerar que hay dibujo
  huecoMinimo: 6,     // columnas transparentes mínimas entre dos cuadros

  fisica: { gravedad: 2300, velocidad: 300, salto: 860, dobleSalto: 760, velocidadDash: 900, sueloY: 600 },

  // Cómo se reproduce cada animación
  //  bucle   = se repite
  //  unaVez  = se reproduce una vez y vuelve a reposo
  //  mantener = se reproduce una vez y se queda en el último cuadro
  animaciones: {
    reposo:          { modo: 'bucle',    fps: 6 },
    caminar:         { modo: 'bucle',    fps: 10 },
    agacharse:       { modo: 'mantener', fps: 12 },
    saltar:          { modo: 'mantener', fps: 12 },
    doble_salto:     { modo: 'unaVez',   fps: 12 },
    lanzar_cuchilla: { modo: 'unaVez',   fps: 12 },
    golpe_suelo:     { modo: 'unaVez',   fps: 12 },
    dash:            { modo: 'unaVez',   fps: 12, duracionMinima: 0.3 },
    herido:          { modo: 'unaVez',   fps: 12 },
    caido:           { modo: 'mantener', fps: 12 },
    espada:          { modo: 'unaVez',   fps: 12 },
  },

  hojas: {
    bubu: {
      reposo:          { archivo: 'assets/personajes/bubu/bubu_reposo.png',          cuadros: 4, escala: 0.75 },
      caminar:         { archivo: 'assets/personajes/bubu/bubu_caminar.png',         cuadros: 6, escala: 1.0 },
      agacharse:       { archivo: 'assets/personajes/bubu/bubu_agacharse.png',       cuadros: 2, escala: 0.62 },
      saltar:          { falta: true, codigo: true, nota: 'Sin hoja: salto hecho por código con el 1er cuadro de reposo' },
      doble_salto:     { archivo: 'assets/personajes/bubu/bubu_doble_salto.png',     cuadros: 4, escala: 0.90 },
      lanzar_cuchilla: { archivo: 'assets/personajes/bubu/bubu_lanzar_cuchilla.png', cuadros: 5, escala: 1.0 },
      golpe_suelo:     { archivo: 'assets/personajes/bubu/bubu_golpe_suelo.png',     cuadros: 5, escala: 0.96 },
      dash:            { archivo: 'assets/personajes/bubu/bubu_dash.png',            cuadros: 2, escala: 1.31, usar: [0],
                         nota: 'El cuadro 2 está cortado en el borde derecho de la hoja: no se usa' },
      herido:          { archivo: 'assets/personajes/bubu/bubu_herido.png',          cuadros: 2, escala: 0.68 },
      caido:           { archivo: 'assets/personajes/bubu/bubu_caido.png',           cuadros: 3, escala: 0.72 },
      espada:          { archivo: 'assets/personajes/bubu/bubu_espada.png',          cuadros: 5, escala: 0.97 },
    },
    dudu: {
      reposo:          { archivo: 'assets/personajes/dudu/dudu_reposo.png',          cuadros: 4, escala: 0.75 },
      caminar:         { archivo: 'assets/personajes/dudu/dudu_caminar.png',         cuadros: 6, escala: 1.0 },
      agacharse:       { archivo: 'assets/personajes/dudu/dudu_agacharse.png',       cuadros: 2, escala: 0.68 },
      saltar:          { archivo: 'assets/personajes/dudu/dudu_saltar.png',          cuadros: 4, escala: 0.79 },
      doble_salto:     { archivo: 'assets/personajes/dudu/dudu_doble_salto.png',     cuadros: 4, escala: 0.87 },
      lanzar_cuchilla: { archivo: 'assets/personajes/dudu/dudu_lanzar_cuchilla.png', cuadros: 5, escala: 0.97 },
      golpe_suelo:     { archivo: 'assets/personajes/dudu/dudu_golpe_suelo.png',     cuadros: 5, escala: 0.935 },
      dash:            { archivo: 'assets/personajes/dudu/dudu_dash.png',            cuadros: 3, escala: 0.94 },
      herido:          { archivo: 'assets/personajes/dudu/dudu_herido.png',          cuadros: 2, escala: 0.64 },
      caido:           { archivo: 'assets/personajes/dudu/dudu_caido.png',           cuadros: 3, escala: 0.78 },
      espada:          { archivo: 'assets/personajes/dudu/dudu_espada.png',          cuadros: 5, escala: 0.97 },
    },
  },

  // Controles de la prueba (KeyboardEvent.code)
  controles: {
    bubu: { izq: ['KeyA'], der: ['KeyD'], saltar: ['KeyW'], agachar: ['KeyS'],
            cuchilla: ['KeyJ'], dash: ['KeyK'], golpe: ['KeyL'], espada: ['KeyI'] },
    dudu: { izq: ['ArrowLeft'], der: ['ArrowRight'], saltar: ['ArrowUp'], agachar: ['ArrowDown'],
            cuchilla: ['Digit1', 'Numpad1'], dash: ['Digit2', 'Numpad2'], golpe: ['Digit3', 'Numpad3'], espada: ['Digit4', 'Numpad4'] },
    herido: ['KeyH'], caido: ['KeyG'], reiniciar: ['KeyR'],
  },
};
