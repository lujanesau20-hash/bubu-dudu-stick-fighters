/* =====================================================================
   CONFIGURACIÓN DEL JUEGO EN LÍNEA (WebRTC con PeerJS)
   Todo lo de la red se ajusta aquí.
   ===================================================================== */
const RED_CONFIG = {
  // Prefijo propio para que los IDs de sala no choquen con otras apps
  prefijoSala: 'bubududu-',
  digitosCodigo: 4,

  // Servidor de emparejamiento: el público y gratuito de PeerJS (0.peerjs.com).
  // Si algún día usas uno propio, pon aquí { host, port, path, secure }.
  servidorPeer: null,

  // Servidores ICE. STUN públicos (gratis). Si alguna red móvil no logra
  // conectar, agrega un servidor TURN en "turn" (ejemplo comentado).
  stun: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
  turn: [
    // { urls: 'turn:tu-servidor-turn.com:3478', username: 'usuario', credential: 'clave' },
  ],

  // Servidor TURN de Cloudflare: el juego pide credenciales de corta duración al Worker
  // de la carpeta turn-worker/ al crear o unirse a una sala. Si no responde en "esperaMs",
  // se juega solo con STUN (como antes). Dejar url vacía para no usarlo.
  turnWorker: { url: 'https://bubududu-turn.lujanesau20.workers.dev', esperaMs: 4000, reusarMinutos: 60 },

  // Ritmos de envío
  controlesPorSegundo: 30,      // invitado -> anfitrión (además se envía apenas cambia una tecla)
  estadosPorSegundo: 20,        // anfitrión -> invitado (antes 25, pero en la práctica salían ~20 irregulares)
  retrasoInterpolacion: 100,    // ms de "colchón" para dibujar suave al invitado (antes 110)

  // Si el líder va lento (pocos FPS, p. ej. un celular), envía menos snapshots
  liderLento: { fpsMinimo: 40, estadosPorSegundo: 15, segundosParaCambiar: 2 },

  // Canal rápido para los snapshots: sin orden y sin reenvíos (un snapshot perdido
  // se reemplaza con el siguiente). Los eventos importantes van por el canal fiable.
  canalRapido: { activo: true, id: 50, idPing: 51 },

  // Cola de envío: si los datos pendientes pasan de estos bytes, el snapshot se descarta
  // (el siguiente, más nuevo, sale cuando la cola baja). Así nunca se acumulan segundos de retraso.
  cola: { maxRapidoBytes: 4000, maxFiableBytes: 16000 },

  // Formato compacto de snapshots: números redondeados y datos fijos (tipo, vida máxima,
  // color...) solo cuando aparece algo nuevo o cada "cadaClave" snapshots.
  compacto: { activo: true, repetirFijosNuevos: 10, cadaClave: 20, avisoBytes: 1500 }, // avisoBytes: el panel lo marca en rojo si se pasa

  // Panel de depuración oculto: F3 o 5 toques en la esquina superior izquierda
  depuracion: { tecla: 'F3', toques: 5, segundosToques: 2, esquinaPx: 70 },

  // Tiempos
  avisoTurnSegundos: 15,        // si conectar tarda más, sugerir TURN
  silencioDesconexion: 6,       // s sin mensajes = desconectado
  pingCadaSegundos: 1,

  // SOLO PARA PRUEBAS: simula retraso de red al recibir mensajes (ms de ida y variación).
  // Ej.: { ms: 75, variacion: 25 } en los dos dispositivos ≈ 150 ms de ping. Dejar en 0.
  latenciaPrueba: { ms: 0, variacion: 0 },

  // Modos que se pueden jugar en línea (la arquitectura sirve también para versus)
  modos: ['pareja'],
};

// Servidores TURN recibidos del Worker (se llenan solos al crear o unirse a una sala)
RED_CONFIG.iceExtra = [];
// Orden: STUN y TURN fijos, luego los de Cloudflare. WebRTC prueba primero la conexión
// directa (red local o por el router) y usa el relevo TURN solo si la directa falla.
RED_CONFIG.iceServers = () => [...RED_CONFIG.stun, ...RED_CONFIG.turn, ...RED_CONFIG.iceExtra];
