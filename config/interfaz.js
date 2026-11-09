/* =====================================================================
   CONFIGURACIÓN DE LA INTERFAZ (tamaños, opacidades, colores, tiempos)
   Solo cambia cómo se VE el juego; no toca la jugabilidad.
   Se carga después de js/config.js y queda en CONFIG.interfaz.
   ===================================================================== */
CONFIG.interfaz = {
  // Indicadores de habilidades y combos debajo de las barras (no los botones táctiles)
  habilidades: {
    escalaCelular: 1.35,   // +35% en celular (cuando se usan los controles táctiles)
    escalaLaptop: 1.1,     // +10% en laptop / PC
    opacidad: 0.75,        // 75%: dejan ver el juego detrás (sin desenfoque)
    contorno: 1.5,         // grosor del contorno oscuro de cada ícono (px)
  },

  // Botón "Pausa" (esquina superior derecha). Medidas en px de pantalla.
  botonPausa: {
    celular: { alto: 44, ancho: 78, letra: 16 },   // 44 px = área táctil mínima recomendada
    laptop: { alto: 34, ancho: 74, letra: 15 },
    margen: 6,                // separación de los bordes de la pantalla
    opacidad: 0.85,
    apartarHudJugador2: true, // corre a la izquierda la barra del jugador 2 para que el botón no tape su retrato
  },

  // Aviso al líder "[nombre] quiere pausar" (en línea)
  avisoPausa: {
    segundos: 5,              // se cierra solo si no se toca (y NO se pausa)
    fondo: '#ffb52e',         // amarillo-naranja
    opacidadFondo: 0.96,      // casi opaco
    texto: '#1a1a2e',
    botonAceptar: '#40c057',  // verde
    botonIgnorar: '#adb5bd',  // gris
    altoBarraTiempo: 3,       // barra fina con el tiempo restante (px)
  },

  // Ave enemiga estilo stickman (solo dibujo)
  ave: {
    escala: 1.2,              // tamaño del dibujo (1.2 ≈ alto de un stickman normal); no cambia su zona de golpe
    aleteosPorSegundo: 3,     // velocidad del batir de alas
    cuadrosAleteo: 4,         // cuadros de la animación de aleteo (2 a 4)
    colorCuerpo: null,        // null = el color del enemigo (CONFIG.enemigos.ave.color)
    colorDetalles: '#e03131', // rojo: cresta, cola y patitas
    colorPico: '#ffc078',
    imagen: null,             // ruta de una imagen para reemplazar el dibujo (ej. 'assets/enemigos/ave.png')
  },
};
