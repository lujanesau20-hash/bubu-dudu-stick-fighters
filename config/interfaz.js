/* =====================================================================
   CONFIGURACIÓN DE LA INTERFAZ (tamaños, opacidades, colores, tiempos)
   Solo cambia cómo se VE el juego; no toca la jugabilidad.
   Se carga después de js/config.js y queda en CONFIG.interfaz.
   ===================================================================== */
CONFIG.interfaz = {
  // Indicadores de habilidades y combos debajo de las barras (no los botones táctiles)
  habilidades: {
    escalaCelular: 2.6,    // celular (con controles táctiles): 65% de la escala anterior (antes 4.0)
    escalaLaptop: 1.76,    // laptop / PC: 80% de la escala anterior (antes 2.2)
    // Los dos jugadores usan SIEMPRE la misma escala: si un lado no cabe, se achican los dos por igual.
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

  // Pantalla completa: icono debajo del botón "Pausa", botón en el menú de pausa y tecla F
  pantallaCompleta: {
    icono: { celular: 34, laptop: 28 }, // lado del icono (px de pantalla)
    separacion: 6,            // px entre el botón "Pausa" y el icono
    opacidad: 0.6,            // discreto
    tecla: 'KeyF',            // laptop: F para entrar y salir
    bloquearHorizontal: true, // celular: al entrar, intenta dejar la pantalla fija en horizontal
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
    celular: { maxParticulas: 180, factorParticulas: 0.5, maxTextos: 14, sinSombras: true, topeTotal: 120 },
    laptop: { maxParticulas: 450, factorParticulas: 1, maxTextos: 30, sinSombras: false, topeTotal: 300 },
    // sinSombras: quita el brillo borroso (shadowBlur), lo más caro de dibujar en un celular
    // topeTotal: máximo de efectos a la vez (partículas + textos + efectos de área + carteles).
    //   Al llegar al tope se descartan primero las partículas más viejas y luego los textos menos
    //   importantes. Los anillos, ondas y carteles de las habilidades nunca se descartan.
    juntarDanioMs: 150,      // los golpes al mismo enemigo dentro de este tiempo muestran UN número con el total
  },

  // Resolución interna del lienzo del juego (se escala con CSS a la pantalla)
  lienzo: {
    dprMax: 2,                // nunca más de 2 píxeles reales por píxel de pantalla
    anchoMaxCelular: 1280,    // celular: ancho interno máximo (misma proporción). 0 = sin límite
    anchoMaxLaptop: 0,        // laptop / PC: sin límite (como antes)
    // Celular: píxeles internos por unidad del mundo visible (1 = el lienzo mide lo mismo que
    // el mundo que se ve, por ejemplo 1152 de ancho). Manda el menor entre esto y anchoMaxCelular.
    pxPorUnidadCelular: 1,
  },

  // Encuadre en celular: se ve el MISMO ancho de mundo que en una laptop 16:10 (solo celular)
  encuadreCelular: {
    activo: true,
    relacionLaptop: 1.6,      // 16:10 -> ancho visible = 720 x 1.6 = 1152 unidades del mundo
    sueloEnPantalla: 0.88,    // el suelo queda al 88% del alto (un poco más abajo que en laptop: más cielo arriba)
    // Cámara vertical: sube solo si el personaje LOCAL quedaría bajo el HUD o tocando el borde
    franjaHud: 0.25,          // parte de arriba reservada al HUD (no se tapa la cabeza)
    margenCabeza: 12,         // unidades del mundo entre la cabeza y el HUD
    subidaMax: 230,           // máximo que sube (≈ 2 personajes: así un doble salto alto nunca sale de la pantalla)
    zonaMuerta: 14,           // cambios menores no mueven la cámara (no tiembla)
    suavizado: 10,            // rapidez del movimiento vertical (lerp por segundo)
    paralajeFondo: 0.25,      // cuánto acompaña el fondo cuando la cámara sube
  },

  // HUD en celular (solo celular; en laptop no cambia nada)
  hudCelular: {
    altoMaximo: 0.25,         // el HUD ocupa como máximo el 25% del alto de la pantalla
    unaFila: true,            // habilidades y combos en una sola fila (los combos al lado)
    separacionGrupos: 12,     // espacio entre las habilidades y los combos (en "si", como los cuadros)
    etiquetaComboAbajo: true, // "H1+H2" debajo del cuadro (no encima del ícono); el maná va en la esquina
    separacionRevivirTramo: 8,// espacio entre "Revivir ♥♥" y "Nivel · Tramo" (x escala del HUD)
  },

  // Monedas en el mundo: radio del dibujo (no cambia la zona para recogerlas)
  // v1.04: el doble que antes (13 y 8). hud: radio de la moneda del contador de arriba (x escala del HUD)
  monedas: { radioCelular: 26, radioLaptop: 16, hud: 13 },

  // Registro de atrasos (panel de depuración y "Copiar registro")
  rendimiento: {
    umbralAtrasoMs: 50,       // se guarda cada bloqueo de al menos esto
    cuadroLargoMs: 100,       // y cada cuadro que tarde al menos esto (aunque no sea culpa del código)
    maxAtrasos: 60,           // últimos atrasos guardados
    ventanaPrimeraVezMs: 150, // "primera vez" cuenta si una imagen se dibujó por primera vez en este margen
  },

  // Calidad automática (cada dispositivo decide la suya; también en línea)
  calidad: {
    automatica: true,
    inicial: 'alta',
    bajarSiFpsMenorA: 45, segundosParaBajar: 2,   // FPS bajo durante 2 s -> baja un nivel
    subirSiFpsMayorA: 55, segundosParaSubir: 5,   // FPS alto durante 5 s -> sube un nivel
    // factorParticulas: cuántas partículas sale por efecto · factorTope: parte del topeTotal
    // brillos: brillo borroso (shadowBlur) · efectosMenores: polvo, chispas pequeñas, "¡PUM!", anillo del doble salto
    niveles: {
      alta: { factorParticulas: 1, factorTope: 1, brillos: true, efectosMenores: true },
      media: { factorParticulas: 0.6, factorTope: 0.75, brillos: false, efectosMenores: true },
      baja: { factorParticulas: 0.3, factorTope: 0.5, brillos: false, efectosMenores: false },
    },
  },

  // Texto "Nivel X · Tramo Y/Z" arriba al centro
  // (laptop: antes 1.0; ahora más grande para leerlo cómodo. Celular sin cambios)
  textoTramo: { escalaCelular: 2.0, escalaLaptop: 1.4 },
  // Texto "Revivir ♥♥" (pareja, debajo de las monedas). Laptop más grande; celular sin cambios.
  textoRevivir: { escalaCelular: 1.0, escalaLaptop: 1.4 },

  // Textos pequeños debajo de cada modo en el menú de inicio (cambian según el dispositivo)
  textosMenu: {
    solo: '(sin internet)',
    pareja: '(2 jugadores en este equipo · sin internet)',
    versus: '(en este equipo sin internet · o en línea)',        // PC/laptop: se elige local o en línea
    versusCelular: '(en línea · 2 dispositivos)',                // celular: solo en línea (el local se oculta)
    enlinea: '(pareja o versus · 2 dispositivos con internet)',
  },

  // Joystick FIJO en celular: la base siempre en el mismo lugar y la dirección se mide
  // desde su centro (antes aparecía donde se tocaba). Posiciones en fracción de la pantalla.
  joystickFijo: {
    activo: true,
    x: 0.16,              // centro: 16% desde el borde izquierdo
    y: 0.72,              // centro: 72% de la altura
    diametro: 0.30,       // tamaño de la base: 30% del alto de la pantalla…
    diametroMin: 110,     // …pero entre 110 y 170 px (cómodo para el pulgar)
    diametroMax: 170,
    zonaToque: 1.7,       // la zona que se puede tocar es 1.7 veces la base (algo más grande que el dibujo)
    recorrido: 0.42,      // cuánto se mueve la palanca (fracción del diámetro) = joystick al máximo
    zonaMuerta: 0.12,     // movimientos menores al 12% no mueven al personaje
    umbralAgachar: 0.6,   // bajar más del 60% = agacharse…
    agacharSoloAbajo: true, // …solo si el dedo va más hacia abajo que hacia el lado (en diagonal se camina)
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
