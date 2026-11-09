/* =====================================================================
   SIMULACIÓN DE RED EN UNA SOLA PÁGINA (para medir la suavidad del invitado)
   Corre el anfitrión real (Mundo) y el invitado real (Sincro) con un reloj
   simulado y un retraso de red con variación. No usa PeerJS.

   Uso (consola de index.html con servidor local):
     const s = document.createElement('script'); s.src = 'herramientas/simular_red.js'; document.body.append(s);
     simularRed({ pingMs: 150, variacionMs: 25 })
   ===================================================================== */
function simularRed({ pingMs = 150, variacionMs = 25, segundos = 9, semilla = 7 } = {}) {
  const rng = U.crearAleatorio(semilla);
  const ida = pingMs / 2;
  const PASO_MS = 1000 / 60;
  let T = 0;
  const relojOriginal = Sincro.reloj;
  const pingOriginal = EnLinea.ping;
  Sincro.reloj = () => T;
  EnLinea.ping = pingMs;

  // Anfitrión
  const mh = new Mundo({ modo: 'pareja', personajes: ['bubu', 'dudu'], escenario: 'isla', semilla: 1 });
  mh.indiceOleada = mh.escenario.oleadas.length; // sin enemigos para medir solo el movimiento
  const remoto = new ControlRemoto();
  // Invitado
  const espejo = Sincro.crearEspejo({ modo: 'pareja', personajes: ['bubu', 'dudu'], escenario: 'isla', semilla: 1 }, 1);
  const acum = new AcumuladorControl();
  const efectosFalsos = { procesar() {} };

  // Canales con retraso (mantienen el orden, como un canal fiable)
  const canal = () => ({ cola: [], ultimo: 0 });
  const aAnfitrion = canal(), aInvitado = canal();
  const enviar = (c, msg) => { const t = Math.max(c.ultimo, T + ida + (rng() * 2 - 1) * variacionMs); c.ultimo = t; c.cola.push({ t, msg }); };
  const entregar = (c, fn) => { while (c.cola.length && c.cola[0].t <= T) fn(c.cola.shift().msg); };

  // Guion de teclas del invitado (Dudu) y de Bubu
  const guion = (t) => {
    const c = new EstadoControl();
    if (t < 1.5) c.x = 1; else if (t < 2.2) c.x = 0; else if (t < 3.4) c.x = -1; else if (t < 4.0) c.x = 0;
    else if (t < 6.0) c.x = 1; else if (t < 6.4) c.x = 0; else if (t < 7.4) { c.x = Math.floor(t * 4) % 2 ? 1 : -1; } else c.x = 0;
    c.saltoMantenido = (t > 4.3 && t < 4.6) || (t > 4.75 && t < 5.0);
    return c;
  };
  let saltoAntes = false;
  const reg = [];
  let tEnvioC = 0, tEnvioE = 0;

  for (let f = 0; f < segundos * 60; f++) {
    T += PASO_MS;
    const ts = T / 1000;
    // --- Invitado: leer teclas, predecir, enviar controles ---
    const c = guion(ts);
    c.saltoPulsado = c.saltoMantenido && !saltoAntes;
    saltoAntes = c.saltoMantenido;
    entregar(aInvitado, (msg) => Sincro.recibirInstantanea(msg));
    Sincro.predecir(PASO_MS / 1000, c);
    acum.agregar(c);
    tEnvioC += PASO_MS;
    if (tEnvioC >= 1000 / RED_CONFIG.controlesPorSegundo) { tEnvioC = 0; enviar(aAnfitrion, acum.sacar()); }

    // --- Anfitrión: recibir controles, simular, enviar estado ---
    entregar(aAnfitrion, (msg) => remoto.recibir(msg));
    const bubu = new EstadoControl(); bubu.x = Math.floor(ts / 0.9) % 2 ? -1 : 1;
    mh.actualizar(PASO_MS / 1000, [bubu, remoto.leer()]);
    const ev = mh.eventos.splice(0);
    tEnvioE += PASO_MS;
    if (tEnvioE >= 1000 / RED_CONFIG.estadosPorSegundo) { tEnvioE = 0; enviar(aInvitado, Sincro.instantanea(mh, ev)); }

    // --- Invitado: preparar dibujo y registrar lo que se ve ---
    Sincro.prepararDibujo(T, efectosFalsos);
    const j = espejo.jugadores[1], b = espejo.jugadores[0];
    reg.push({ t: ts, x: j.x, y: j.y, bx: b.x, tecla: c.x, hostX: mh.jugadores[1].x });
  }

  Sincro.reloj = relojOriginal;
  EnLinea.ping = pingOriginal;
  Sincro.espejo = null;

  // --- Medidas ---
  let retrocesos = 0, saltosBruscos = 0, maxSalto = 0, derivaQuieto = 0, aceBubu = 0, n = 0;
  for (let i = 2; i < reg.length; i++) {
    const dx = reg[i].x - reg[i - 1].x;
    if (reg[i].tecla && reg[i - 1].tecla === reg[i].tecla && dx * reg[i].tecla < -0.5) retrocesos++;
    const vMax = CONFIG.jugador.velocidad * PASO_MS / 1000;
    if (Math.abs(dx) > vMax * 1.6) saltosBruscos++;
    maxSalto = Math.max(maxSalto, Math.abs(dx));
    if (!reg[i].tecla && !reg[i - 1].tecla && i > 30) derivaQuieto += Math.abs(dx);
    aceBubu += Math.abs(reg[i].bx - 2 * reg[i - 1].bx + reg[i - 2].bx); n++;
  }
  const ultimo = reg[reg.length - 1];
  return {
    pingMs, variacionMs,
    retrocesos,                                   // cuadros en que Dudu va hacia atrás con la tecla pulsada
    saltosBruscos,                                // cuadros con un salto de posición anormal
    maxSaltoPx: +maxSalto.toFixed(1),
    derivaQuietoPx: +derivaQuieto.toFixed(1),     // movimiento sin tocar teclas (correcciones visibles)
    sacudidaBubuRemoto: +(aceBubu / n).toFixed(2), // suavidad del compañero (menor = más suave)
    diferenciaFinalPx: +Math.abs(ultimo.x - ultimo.hostX).toFixed(1),
  };
}
