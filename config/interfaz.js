/* =====================================================================
   CONFIGURACIÓN DE LA INTERFAZ (tamaños, opacidades, colores, tiempos)
   Solo cambia cómo se VE el juego; no toca la jugabilidad.
   Se carga después de js/config.js y queda en CONFIG.interfaz.
   ===================================================================== */
CONFIG.interfaz = {
  // Indicadores de habilidades y combos debajo de las barras (no los botones táctiles)
  habilidades: {
    escalaCelular: 4.0,    // celular (con controles táctiles): el doble de la versión 2026.11.09 (antes 2.0)
    escalaLaptop: 2.2,     // laptop / PC: el doble de antes (antes 1.1)
    opacidad: 0.8,         // 80%: dejan ver el juego detrás (sin desenfoque); usar entre 0.75 y 0.85
    contorno: 1.5,         // grosor del contorno oscuro de cada ícono (px)
    // Si no caben sin tapar el joystick, los botones, las monedas/nivel o la Pausa,
    // primero se corre la fila de combos y, si no alcanza, se achican solos (nunca menos que esto):
    achicarHasta: 0.4,     // fracción mínima de la escala de arriba (0.4 = hasta 40%)
    separacionObstaculos: 8, // espacio libre (px de pantalla) alrededor de joystick, botones, Pausa y centro
    altoMaximo: 0.65,      // los cuadros no bajan de este % del alto de la pantalla
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

  // Rendimiento de los efectos visuales (no cambian la jugabilidad, solo cuánto se dibuja)
  efectos: {
    celular: { maxParticulas: 180, factorParticulas: 0.5, maxTextos: 14, sinSombras: true },
    laptop: { maxParticulas: 450, factorParticulas: 1, maxTextos: 30, sinSombras: false },
    // sinSombras: quita el brillo borroso (shadowBlur), lo más caro de dibujar en un celular
  },

  // Medición de la conexión en línea (solo se muestra; no cambia el envío)
  medicion: {
    promedioPingSegundos: 2,     // el ping en pantalla es el promedio de estos segundos
    muestrasJitter: 10,          // variación del ping: cambio promedio entre las últimas muestras
    registroMinutos: 5,          // "Copiar registro": segundos guardados (5 min = 300 filas)
    // "Conexión inestable" si se cumple alguna:
    inestable: { pingMs: 250, jitterMs: 80, perdidaPorcentaje: 20 },
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
