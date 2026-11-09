/* =====================================================================
   RED (FASE 2 - preparado, todavía no activo)

   Idea: "anfitrión con autoridad".
   1. Un jugador crea la sala -> el servidor WebSocket devuelve un código (ej. "K7QX").
   2. El otro jugador se une con ese código desde su PC o celular.
   3. Cada cliente envía SOLO sus controles (EstadoControl.aObjeto()) en cada tick.
   4. El anfitrión ejecuta la simulación (Mundo.actualizar) con los controles de ambos
      y envía instantáneas del estado (crearInstantanea) a la otra persona.
   5. El invitado dibuja la instantánea (el dibujo ya está separado de la lógica).

   Para activarlo hace falta:
   - Un servidor WebSocket sencillo que reenvíe mensajes entre los dos de la sala.
   - Poner CONFIG.red.habilitada = true y la dirección en CONFIG.red.servidor.
   - En main.js: entrada.fuentesRemotas[1] = () => clienteRed.controlRemoto();

   Mensajes (JSON):
     { tipo: 'crearSala' }                      -> { tipo: 'salaCreada', codigo }
     { tipo: 'unirse', codigo }                 -> { tipo: 'unido', jugador: 1 }
     { tipo: 'control', tick, datos }           (invitado -> anfitrión)
     { tipo: 'estado', tick, datos }            (anfitrión -> invitado)
     { tipo: 'inicio', modo, personajes }       (anfitrión -> invitado)
   ===================================================================== */
class ClienteRed {
  constructor(url = CONFIG.red.servidor) {
    this.url = url;
    this.socket = null;
    this.codigoSala = null;
    this.esAnfitrion = false;
    this.ultimoControlRemoto = new EstadoControl();
    this.ultimoEstado = null;
    this.alEvento = () => {}; // callback para la interfaz
  }

  conectar() {
    return new Promise((resolver, rechazar) => {
      if (!CONFIG.red.habilitada) { rechazar(new Error('El modo online aún no está activado')); return; }
      this.socket = new WebSocket(this.url);
      this.socket.onopen = () => resolver();
      this.socket.onerror = (e) => rechazar(e);
      this.socket.onmessage = (m) => this.recibir(JSON.parse(m.data));
      this.socket.onclose = () => this.alEvento({ tipo: 'desconectado' });
    });
  }

  enviar(obj) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(obj));
  }

  crearSala() { this.esAnfitrion = true; this.enviar({ tipo: 'crearSala' }); }
  unirse(codigo) { this.esAnfitrion = false; this.enviar({ tipo: 'unirse', codigo: codigo.toUpperCase() }); }

  enviarControl(tick, estadoControl) { this.enviar({ tipo: 'control', tick, datos: estadoControl.aObjeto() }); }
  enviarEstado(tick, mundo) { this.enviar({ tipo: 'estado', tick, datos: crearInstantanea(mundo) }); }

  recibir(msg) {
    switch (msg.tipo) {
      case 'salaCreada': this.codigoSala = msg.codigo; break;
      case 'control': this.ultimoControlRemoto = EstadoControl.desdeObjeto(msg.datos); break;
      case 'estado': this.ultimoEstado = msg.datos; break;
    }
    this.alEvento(msg);
  }

  // Para Entrada.fuentesRemotas: devuelve el último control recibido
  controlRemoto() {
    const c = this.ultimoControlRemoto;
    const copia = EstadoControl.desdeObjeto(c.aObjeto());
    c.saltoPulsado = false; c.habilidades = [false, false, false, false]; c.combo = null;
    return copia;
  }
}

// Código de sala de 4 letras (sin letras confusas)
function generarCodigoSala(rng = Math.random) {
  const letras = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) c += letras[Math.floor(rng() * letras.length)];
  return c;
}

// Estado mínimo del mundo para que el invitado lo dibuje
function crearInstantanea(mundo) {
  const ent = (e) => ({ x: Math.round(e.x), y: Math.round(e.y), vx: Math.round(e.vx), vy: Math.round(e.vy),
    dir: e.dir, estado: e.estado, vida: e.vida });
  return {
    t: mundo.tiempo,
    jugadores: mundo.jugadores.map((j) => ({ ...ent(j), energia: j.energia, personaje: j.personaje })),
    enemigos: mundo.enemigos.map((e) => ({ ...ent(e), tipo: e.tipo })),
    jefe: mundo.jefe ? ent(mundo.jefe) : null,
    proyectiles: mundo.proyectiles.map((p) => ({ x: p.x, y: p.y, tipo: p.tipo })),
    monedas: mundo.monedasGanadas,
  };
}
