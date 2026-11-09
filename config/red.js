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

  // Ritmos de envío
  controlesPorSegundo: 30,      // invitado -> anfitrión
  estadosPorSegundo: 25,        // anfitrión -> invitado
  retrasoInterpolacion: 110,    // ms de "colchón" para dibujar suave al invitado

  // Tiempos
  avisoTurnSegundos: 15,        // si conectar tarda más, sugerir TURN
  silencioDesconexion: 6,       // s sin mensajes = desconectado
  pingCadaSegundos: 1,

  // Modos que se pueden jugar en línea (la arquitectura sirve también para versus)
  modos: ['pareja'],
};

RED_CONFIG.iceServers = () => [...RED_CONFIG.stun, ...RED_CONFIG.turn];
