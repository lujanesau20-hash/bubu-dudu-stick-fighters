/* =====================================================================
   MENÚS (HTML sobre el canvas): principal, selección de personaje,
   pausa, game over, victoria, fin de versus y tienda.
   ===================================================================== */
const Menus = {
  init(juego) {
    this.juego = juego;
    this.cont = document.getElementById('pantallas');
    this.tienda = new TiendaUI(this.cont);
    window.addEventListener('keydown', (e) => this.teclasMenu(e)); // Esc = Atrás, flechas = moverse
  },

  ocultar() { this.cont.innerHTML = ''; this.cont.classList.add('oculto'); },
  mostrarHTML(html) {
    this.cont.classList.remove('oculto'); this.cont.innerHTML = html;
    if (typeof PERSONAJES !== 'undefined') PERSONAJES.pintarRetratos(this.cont); // retratos con las hojas actuales
  },

  // Asigna funciones a botones con data-ir
  // ---------- Versus: opción "Robo de vida" (config/balance.js -> roboVida.versus) ----------
  // Se guarda en este equipo; en línea vale la del líder (él calcula la pelea).
  roboVersusActivo() {
    const d = typeof Guardado !== 'undefined' && Guardado.datos;
    return d && typeof d.versusRoboVida === 'boolean' ? d.versusRoboVida : BALANCE.roboVida.versus.porDefecto;
  },
  htmlOpcionRoboVersus() {
    const si = this.roboVersusActivo();
    return `<div class="fila-botones"><button class="btn ${si ? 'verde' : ''}" data-robo-versus="1">🩸 Robo de vida: ${si ? 'Sí' : 'No'}
      <small>(${Math.round(BALANCE.roboVida.versus.porcentaje * 100)}% del daño con H1–H4)</small></button></div>`;
  },
  conectarOpcionRoboVersus(repintar) {
    const b = this.cont.querySelector('[data-robo-versus]');
    if (b) b.onclick = () => { Guardado.datos.versusRoboVida = !this.roboVersusActivo(); Guardado.guardar(); repintar(); };
  },

  conectar(acciones) {
    this.cont.querySelectorAll('[data-ir]').forEach((b) => {
      b.onclick = () => acciones[b.dataset.ir] && acciones[b.dataset.ir](b);
    });
  },

  principal() {
    // Celular: la pareja local y el versus local se ocultan (necesitan teclado para el jugador 2).
    // Textos pequeños de cada modo: config/interfaz.js -> textosMenu
    // v1.17: menú nuevo. Cada modo abre un submenú (Normal / Infinito; en línea también Versus).
    // El botón Versus salió del menú principal: ahora está dentro de "Jugar en línea" (el código es el mismo).
    const tactil = esDispositivoTactil();
    const sub = (k) => `<small class="sub-modo">${CONFIG.interfaz.textosMenu[k]}</small>`;
    this.mostrarHTML(`
      <div class="panel panel-principal">
        <h1 class="titulo"><span class="t-bubu">Bubu</span> <span class="t-y">&</span> <span class="t-dudu">Dudu</span></h1>
        <p class="subtitulo">Stick Fighters</p>
        <button class="btn grande" data-ir="solo">Nivel solitario${sub('solo')}</button>
        ${tactil ? '' : `<button class="btn grande" data-ir="pareja">Niveles en pareja${sub('pareja')}</button>`}
        <button class="btn grande" data-ir="enlinea">🌐 Jugar en línea${sub('enlinea')}</button>
        <div class="fila-botones">
          <button class="btn" data-ir="tienda">🛍 Tienda</button>
          <button class="btn" data-ir="como">❓ Cómo jugar</button>
          <button class="btn" data-ir="pantalla">⛶</button>
        </div>
        <div class="monedas-menu">🪙 ${Guardado.datos.monedas}</div>
      </div>
      <div class="version-esquina">v${VERSION_VISIBLE}</div>`);
    this.conectar({
      solo: () => this.submenuModo('solo'),
      pareja: () => this.submenuModo('pareja'),
      enlinea: () => this.submenuModo('enlinea'),
      tienda: () => this.tienda.abrir(() => this.principal()),
      como: () => this.comoJugar(() => this.principal()),
      pantalla: () => pantallaCompleta(),
    });
    this.enfocarPrimero();
  },

  // Submenú de cada modo: Normal / Infinito (y Versus en línea). Botón "Atrás" (o Esc).
  submenuModo(tipo) {
    const tactil = esDispositivoTactil();
    const titulos = { solo: 'Nivel solitario', pareja: 'Niveles en pareja', enlinea: '🌐 Jugar en línea' };
    const notas = { solo: CONFIG.interfaz.textosMenu.solo, pareja: CONFIG.interfaz.textosMenu.pareja, enlinea: CONFIG.interfaz.textosMenu.enlinea };
    this.mostrarHTML(`
      <div class="panel panel-submenu">
        <h2>${titulos[tipo]}</h2>
        <small class="sub-modo">${notas[tipo]}</small>
        <button class="btn grande" data-ir="normal">Normal<small class="sub-modo">${CONFIG.interfaz.textosMenu.normal}</small></button>
        <button class="btn grande" data-ir="infinito">♾ Infinito<small class="sub-modo">${CONFIG.interfaz.textosMenu.infinito}</small></button>
        ${tipo === 'enlinea' ? `<button class="btn grande" data-ir="versus">⚔ Versus<small class="sub-modo">${CONFIG.interfaz.textosMenu.versusSub}</small></button>` : ''}
        <button class="btn" data-ir="atras" data-atras="1">← Atrás</button>
      </div>
      <div class="version-esquina">v${VERSION_VISIBLE}</div>`);
    this.conectar({
      normal: () => (tipo === 'enlinea' ? this.enLineaInicio('', 'pareja') : this.seleccion(tipo)),
      infinito: () => (tipo === 'enlinea' ? this.enLineaInicio('', 'infinito') : this.seleccion(tipo, true)),
      // Versus: en celular solo en línea; en PC/laptop se elige local o en línea
      versus: () => (tactil ? this.enLineaInicio('', 'versus') : this.elegirVersus(() => this.submenuModo('enlinea'))),
      atras: () => this.principal(),
    });
    this.enfocarPrimero();
  },

  // Récord del modo infinito para mostrar en los menús (por modo: solo, pareja local, en línea)
  textoRecordInfinito(modo) {
    const r = (Guardado.datos.recordInfinito || {})[modo] || 0;
    return r ? `Mejor: oleada ${r}` : 'sin récord todavía';
  },

  // Empezar una partida en modo infinito (escenario 'infinito-<mundo>', ver js/logica/infinito.js)
  iniciarInfinito(modo, personajes, mundo) {
    const id = 'infinito-' + mundo;
    if (!ESCENARIOS[id]) { this.enLineaToast('El modo infinito llega en la próxima actualización'); return; }
    if (!Guardado.datos.vioComoJugar) {
      this.comoJugar(() => { Guardado.datos.vioComoJugar = true; Guardado.guardar(); this.juego.iniciarPartida(modo, personajes, id); }, '¡A jugar!');
      return;
    }
    this.juego.iniciarPartida(modo, personajes, id);
  },

  // Teclado en los menús: Esc = Atrás; flechas arriba/abajo = moverse entre botones (Enter = elegir)
  enfocarPrimero() {
    if (esDispositivoTactil()) return; // en celular no se marca ningún botón
    const b = this.cont.querySelector('button.btn:not([disabled])');
    if (b) b.focus({ preventScroll: true });
  },
  teclasMenu(e) {
    if (!this.juego || this.juego.estado !== 'menu' || this.cont.classList.contains('oculto')) return;
    if (e.code === 'Escape') {
      const atras = this.cont.querySelector('[data-atras]');
      if (atras) { e.preventDefault(); atras.click(); }
      return;
    }
    // Enter / Espacio eligen el botón marcado (el juego los usa como teclas y no dejaba que el botón los recibiera)
    if ((e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') && document.activeElement
      && document.activeElement.tagName === 'BUTTON' && this.cont.contains(document.activeElement)) {
      e.preventDefault(); document.activeElement.click(); return;
    }
    if (e.code !== 'ArrowDown' && e.code !== 'ArrowUp') return;
    const botones = [...this.cont.querySelectorAll('button:not([disabled])')];
    if (!botones.length) return;
    e.preventDefault();
    const i = botones.indexOf(document.activeElement);
    const sig = e.code === 'ArrowDown' ? (i + 1) % botones.length : (i - 1 + botones.length) % botones.length;
    botones[i < 0 ? 0 : sig].focus({ preventScroll: true });
  },

  // PC/laptop: versus local (dos personas en este equipo) o en línea (dos dispositivos)
  elegirVersus(volver = () => this.principal()) {
    this.mostrarHTML(`
      <div class="panel">
        <h2>⚔ Versus</h2>
        <p>Bubu contra Dudu, al mejor de 3 rondas.</p>
        <button class="btn grande" data-ir="local">Local<small class="sub-modo">(2 jugadores en este equipo · sin internet)</small></button>
        <button class="btn grande" data-ir="enlinea">🌐 En línea<small class="sub-modo">(2 dispositivos con internet)</small></button>
        <button class="btn" data-ir="volver" data-atras="1">← Atrás</button>
      </div>
      <div class="version-esquina">v${VERSION_VISIBLE}</div>`);
    this.conectar({
      local: () => this.seleccion('versus', false, () => this.elegirVersus(volver)),
      enlinea: () => this.enLineaInicio('', 'versus'),
      volver,
    });
    this.enfocarPrimero();
  },

  // Modo infinito: elegir el escenario entre los mundos desbloqueados (por defecto Isla flotante)
  mundosInfinito() { return BALANCE.mundos.filter((mu) => PROGRESO.mundoDesbloqueado(mu.id)); },
  mundoInfinitoElegido() {
    const id = Guardado.datos.mundoInfinito;
    return this.mundosInfinito().some((mu) => mu.id === id) ? id : 'isla';
  },
  htmlSelectorMundoInfinito(elegido) {
    return `<div class="fila-botones mundos-infinito">${BALANCE.mundos.map((mu) => {
      const abierto = PROGRESO.mundoDesbloqueado(mu.id);
      return `<button class="btn ${mu.id === elegido ? 'verde' : ''}" data-mundo-inf="${mu.id}" ${abierto ? '' : 'disabled'}>${abierto ? '' : '🔒 '}${mu.nombre}</button>`;
    }).join('')}</div>`;
  },
  conectarSelectorMundoInfinito(repintar) {
    this.cont.querySelectorAll('[data-mundo-inf]').forEach((b) => b.onclick = () => {
      Guardado.datos.mundoInfinito = b.dataset.mundoInf; Guardado.guardar(); repintar();
    });
  },

  // modo: 'solo' | 'pareja' | 'versus'. infinito: true = modo infinito (se elige mundo, no nivel)
  seleccion(modo, infinito = false, volver = null) {
    volver = volver || (() => this.submenuModo(modo));
    const ids = Object.keys(CONFIG.personajes);
    let elegido = 'bubu';
    // Mundo y nivel: por defecto el primer nivel aún no superado
    const sel = this.nuevaSeleccionNivel();
    const titulos = infinito ? { solo: '♾ Infinito · solitario', pareja: '♾ Infinito · en pareja' }
      : { solo: 'Nivel solitario', pareja: 'Niveles en pareja', versus: 'Versus' };
    const tactil = esDispositivoTactil();
    const ayuda = modo === 'solo'
      ? (tactil ? 'Joystick: moverse / agacharse · ▲: saltar (2 toques = doble salto) · H1–H4: habilidades · Desliza de un botón al vecino para combinar'
        : 'A/D o ←/→ moverse · W/Espacio saltar (2 veces = doble salto) · S/↓ agacharse · 1-4 o J K L I habilidades · Dos vecinas casi a la vez = combinación')
      : 'J1: A/D mover · W/Espacio saltar · S agachar · 1-4 habilidades · E revivir<br>J2: ←/→ mover · ↑ saltar · ↓ agachar · 7 8 9 0 (o teclado num. 1-4) habilidades · Shift der./Enter revivir';

    const pintar = () => {
      const tarjetas = ids.map((id) => {
        let etiqueta = '';
        if (modo !== 'solo') etiqueta = `<div class="etiqueta-j ${id === elegido ? 'j1' : 'j2'}">${id === elegido ? 'J1' : 'J2'}</div>`;
        return `<div class="tarjeta ${modo === 'solo' && id === elegido ? 'elegida' : ''}" data-id="${id}">
          ${etiqueta}${PERSONAJES.htmlRetrato(id)}
          <div class="nombre">${CONFIG.personajes[id].nombre}</div></div>`;
      }).join('');
      this.mostrarHTML(`
        <div class="panel ${infinito ? 'panel-sel-infinito' : ''}">
          <h2>${titulos[modo]}</h2>
          <p>${modo === 'solo' ? 'Elige tu personaje' : 'Toca un personaje para que sea el Jugador 1'}</p>
          <div class="tarjetas">${tarjetas}</div>
          ${modo === 'versus' ? this.htmlOpcionRoboVersus()
            : infinito ? `<p>Elige el escenario: <small>(${this.textoRecordInfinito(modo)})</small></p>${this.htmlSelectorMundoInfinito(this.mundoInfinitoElegido())}`
            : `<p>Elige mundo y nivel:</p>${this.htmlSelectorNiveles(sel)}`}
          <p class="ayuda">${ayuda}</p>
          <div class="fila-botones">
            <button class="btn" data-ir="volver" data-atras="1">← Atrás</button>
            <button class="btn grande verde" data-ir="jugar">¡Jugar!</button>
          </div>
        </div>`);
      this.cont.querySelectorAll('.tarjeta').forEach((t) => t.onclick = () => { elegido = t.dataset.id; pintar(); });
      if (modo === 'versus') this.conectarOpcionRoboVersus(pintar);
      else if (infinito) this.conectarSelectorMundoInfinito(pintar);
      else this.conectarSelectorNiveles(sel, pintar);
      this.conectar({
        volver,
        jugar: () => {
          const otro = ids.find((i) => i !== elegido);
          const personajes = modo === 'solo' ? [elegido] : [elegido, otro];
          if (infinito) { this.iniciarInfinito(modo, personajes, this.mundoInfinitoElegido()); return; }
          // La primera vez se muestra "Cómo jugar" antes de empezar
          if (!Guardado.datos.vioComoJugar) {
            this.comoJugar(() => {
              Guardado.datos.vioComoJugar = true; Guardado.guardar();
              this.juego.iniciarPartida(modo, personajes, sel.nivel);
            }, '¡A jugar!');
            return;
          }
          this.juego.iniciarPartida(modo, personajes, sel.nivel);
        },
      });
    };
    pintar();
  },

  // Menú de pausa de solitario y pareja local (ver js/ui/pausa.js)
  pausa() {
    if (typeof Pausa !== 'undefined') { Pausa.menuLocal(); return; }
    this.mostrarHTML(`
      <div class="panel">
        <h2>Pausa</h2>
        <button class="btn grande" data-ir="seguir">Continuar</button>
        <button class="btn" data-ir="como">❓ Cómo jugar</button>
        <button class="btn" data-ir="reiniciar">Reiniciar nivel</button>
        <button class="btn" data-ir="menu">Menú principal</button>
      </div>`);
    this.conectar({
      seguir: () => this.juego.reanudar(),
      como: () => this.comoJugar(() => this.pausa()),
      reiniciar: () => this.juego.reiniciar(),
      menu: () => this.juego.irAlMenu(),
    });
  },

  gameOver(monedas) {
    this.mostrarHTML(`
      <div class="panel">
        <h2 class="rojo">GAME OVER</h2>
        <p>Monedas conseguidas: 🪙 ${monedas}</p>
        <button class="btn grande" data-ir="reintentar">Reintentar</button>
        <button class="btn" data-ir="menu">Menú principal</button>
      </div>`);
    this.conectar({ reintentar: () => this.juego.reiniciar(), menu: () => this.juego.irAlMenu() });
  },

  // Fin del modo infinito: oleada alcanzada, monedas ganadas y mejor récord. Reintentar o Menú.
  // invitado = true: el invitado en línea solo espera (el líder decide el reinicio)
  finInfinito(oleada, monedas, mejor, nuevo, invitado = false) {
    this.mostrarHTML(`
      <div class="panel panel-fin-infinito">
        <h2 class="rojo">FIN DEL INFINITO</h2>
        <p class="dato-grande">Llegaste a la <b>oleada ${oleada}</b></p>
        <p>Monedas ganadas: 🪙 ${monedas}</p>
        <p class="dorado">${nuevo ? '🏆 ¡Nuevo récord!' : `Mejor récord: oleada ${mejor}`}</p>
        ${invitado ? '<p class="esperando">⏳ Esperando a que el anfitrión elija qué hacer…</p><button class="btn" data-ir="salir">Salir de la sala</button>'
          : `<button class="btn grande verde" data-ir="reintentar">Reintentar</button>
        <button class="btn" data-ir="menu">${typeof EnLinea !== 'undefined' && EnLinea.esAnfitrion ? 'Volver a la sala' : 'Menú'}</button>`}
      </div>`);
    this.conectar({ reintentar: () => this.juego.reiniciar(), menu: () => this.juego.irAlMenu(), salir: () => EnLinea.cerrar() });
    this.enfocarPrimero();
  },

  // siguiente = id del próximo nivel (o null si era el último)
  victoria(monedas, siguiente) {
    const sig = siguiente && ESCENARIOS[siguiente];
    this.mostrarHTML(`
      <div class="panel">
        <h2 class="dorado">¡NIVEL SUPERADO!</h2>
        <p>Monedas ganadas: 🪙 ${monedas} · Total: 🪙 ${Guardado.datos.monedas}</p>
        ${sig ? `<button class="btn grande verde" data-ir="siguiente">➜ ${sig.mundo === 'isla' ? 'Siguiente nivel: ' + sig.nombreCorto
          : '¡Mundo desbloqueado! ' + sig.nombre}</button>`
          : '<p class="dorado"><b>🏆 ¡Completaste todos los niveles!</b></p>'}
        <button class="btn grande" data-ir="tienda">🛍 Ir a la tienda</button>
        <button class="btn" data-ir="otra">Jugar otra vez</button>
        <button class="btn" data-ir="menu">Menú principal</button>
      </div>`);
    this.conectar({
      siguiente: () => this.juego.siguienteNivel(),
      tienda: () => this.tienda.abrir(() => this.victoria(monedas, siguiente)),
      otra: () => this.juego.reiniciar(),
      menu: () => this.juego.irAlMenu(),
    });
  },

  finVersus(nombre) {
    // En línea (líder): "Revancha" empieza otro versus para los dos; el otro botón vuelve a la sala
    const enLinea = typeof EnLinea !== 'undefined' && EnLinea.esAnfitrion;
    const m = this.juego.mundo;
    this.mostrarHTML(`
      <div class="panel">
        <h2 class="dorado">¡${nombre} GANA!</h2>
        ${enLinea && m ? `<p>Rondas: Bubu ${m.rondas[0]} · Dudu ${m.rondas[1]}</p>` : ''}
        <button class="btn grande" data-ir="revancha">Revancha</button>
        <button class="btn" data-ir="menu">${enLinea ? 'Volver a la sala' : 'Menú principal'}</button>
      </div>`);
    this.conectar({ revancha: () => this.juego.reiniciar(), menu: () => this.juego.irAlMenu() });
  },
};

/* =====================================================================
   CÓMO JUGAR y CONSEJOS DE CARGA
   Todos los números salen de config/balance.js (y de CONFIG), así que
   las tablas siempre coinciden con el juego.
   ===================================================================== */
function nombreTecla(code) {
  const nombres = { Space: 'Espacio', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
    ShiftRight: 'Shift der.', Enter: 'Enter', Escape: 'Esc' };
  if (nombres[code]) return nombres[code];
  return code.replace('Digit', '').replace('Numpad', 'Num ').replace('Key', '');
}
const teclasTexto = (lista) => lista.map(nombreTecla).join(' / ');

// Consejos cortos (se muestran en las pantallas de carga)
function consejosCortos() {
  const b = BALANCE;
  return [
    `El maná se recupera ${b.jugador.manaPorSegundo} por segundo y ${b.jugador.manaPorGolpe} más por cada golpe que aciertas.`,
    `Cada ${b.esferasMana.intervalo} s cae una esfera azul: te da ${b.esferasMana.mana} de maná. ¡Recógela antes de ${b.esferasMana.duracion} s!`,
    `Combina dos habilidades vecinas: ${b.combos.map((c) => `${c.teclas} ${c.nombre}`).join(' · ')}.`,
    'En celular, desliza el dedo de un botón de habilidad al vecino sin soltar para hacer una combinación.',
    `Para revivir a tu compañero, quédate a su lado y mantén la tecla de revivir ${CONFIG.revivir.tiempoRevivir} segundos.`,
    `Las habilidades caras rinden más: ${b.habilidades[3].nombre} hace ${b.habilidades[3].danio} de daño por ${b.habilidades[3].mana} de maná.`,
    'Salta por encima de las ondas del Gigante cuando pisa fuerte el suelo.',
  ];
}

Object.assign(Menus, {
  comoJugar(alCerrar, textoBoton = 'Volver', pestana = 'controles') {
    const b = BALANCE, c = CONFIG.controles;
    const pestanas = { controles: 'Controles', habilidades: 'Habilidades', combos: 'Combos', consejos: 'Consejos' };
    let cuerpo = '';

    if (pestana === 'controles') {
      const fila = (accion, m) => `<tr><td>${accion}</td><td>${m}</td></tr>`;
      const tabla = (titulo, m, revivir = true) => `
        <h3>${titulo}</h3>
        <table class="tabla-ayuda"><tbody>
          ${fila('Moverse', teclasTexto([...m.izquierda, ...m.derecha]))}
          ${fila('Saltar (2 veces = doble salto)', teclasTexto(m.saltar))}
          ${fila('Agacharse', teclasTexto(m.agachar))}
          ${fila('Habilidades H1 · H2 · H3 · H4', m.habilidades.map(teclasTexto).join(' · '))}
          ${revivir ? fila('Revivir al compañero (mantener)', teclasTexto(m.revivir)) : ''}
          ${fila('Pausa', teclasTexto(c.generales.pausa))}
          ${fila('Pantalla completa (entrar / salir)', teclasTexto([CONFIG.interfaz.pantallaCompleta.tecla]))}
        </tbody></table>`;
      cuerpo = tabla('PC · un jugador', c.solo, false) + tabla('PC · Jugador 1 (dos en el teclado)', c.j1) + tabla('PC · Jugador 2', c.j2) + `
        <h3>Celular</h3>
        <table class="tabla-ayuda"><tbody>
          <tr><td>Moverse / agacharse</td><td>Joystick a la izquierda (abajo = agacharse)</td></tr>
          <tr><td>Saltar</td><td>Botón ▲ a la derecha (dos toques = doble salto)</td></tr>
          <tr><td>Habilidades</td><td>Botones H1 a H4 alrededor del salto</td></tr>
          <tr><td>Combinaciones</td><td>Desliza el dedo de un botón al vecino sin soltar</td></tr>
          <tr><td>Revivir</td><td>Mantén el botón ♥ que aparece junto al compañero caído</td></tr>
          <tr><td>Pantalla completa</td><td>Icono pequeño debajo de "Pausa" o botón en el menú de pausa</td></tr>
        </tbody></table>`;
    }
    if (pestana === 'habilidades') {
      cuerpo = `<table class="tabla-ayuda numeros">
        <thead><tr><th></th><th>Habilidad</th><th>Tecla (1 jugador)</th><th>Maná</th><th>Enfriamiento</th><th>Daño</th></tr></thead><tbody>
        ${b.habilidades.map((h, i) => `<tr><td>${CONFIG.habilidades[i].icono}</td><td>${h.tecla} · ${h.nombre}</td>
          <td>${teclasTexto(c.solo.habilidades[i])}</td><td>${h.mana}</td><td>${h.enfriamiento ? h.enfriamiento + ' s' : '—'}</td>
          <td>${h.danio}${h.area ? ' (área)' : ''}</td></tr>`).join('')}
        </tbody></table>
        <p class="ayuda">Jugador 1: ${c.j1.habilidades.map(teclasTexto).join(' · ')} · Jugador 2: ${c.j2.habilidades.map(teclasTexto).join(' · ')}.
        Un ataque no interrumpe a otro que ya está en curso.</p>
        <p class="ayuda"><b>Espada rápida:</b> H1 y H2 salen al instante en cada pulsación, aunque el corte anterior siga en pantalla
        (hasta ${BALANCE.espadaRapida.maxCortes} de cada una a la vez). Pulsa H2 tres veces y salen tres cortes; cada corte cobra su maná.</p>`;
    }
    if (pestana === 'combos') {
      cuerpo = `<table class="tabla-ayuda numeros">
        <thead><tr><th></th><th>Combinación</th><th>Botones</th><th>Maná</th><th>Enfriamiento</th><th>Daño</th></tr></thead><tbody>
        ${b.combos.map((k, i) => `<tr><td>${CONFIG.combos.lista[i].icono || ''}</td><td>${k.nombre}</td><td>${k.teclas}</td>
          <td>${k.mana}</td><td>${k.enfriamiento} s</td><td>${k.danio}${k.area ? ' (área)' : ''}${k.golpes ? ` en ${k.golpes} golpes` : ''}</td></tr>`).join('')}
        </tbody></table>
        <h3>Cómo activarlas</h3>
        <ul class="lista-ayuda">
          <li><b>Celular:</b> toca un botón de habilidad y, sin soltar, desliza el dedo al botón vecino.</li>
          <li><b>PC:</b> pulsa las dos teclas vecinas casi a la vez, o una y luego la otra en menos de ${CONFIG.combos.ventanaMs} ms.</li>
          <li>Solo se combinan habilidades vecinas: H1+H2, H2+H3 y H3+H4.</li>
          <li>Si no tienes el maná suficiente, el ícono se ve apagado y no se activa.</li>
        </ul>`;
    }
    if (pestana === 'consejos') {
      cuerpo = `<ul class="lista-ayuda">
        <li>Tienes ${b.jugador.vidaMax} de vida y ${b.jugador.manaMax} de maná (barra azul).</li>
        <li>El maná se recupera solo, ${b.jugador.manaPorSegundo} por segundo, y ${b.jugador.manaPorGolpe} más por cada golpe que acierta a un enemigo.</li>
        <li>Cada ${b.esferasMana.intervalo} segundos cae una esfera de maná (azul) cerca de ti: te da ${b.esferasMana.mana} de maná.
            Dura ${b.esferasMana.duracion} s y parpadea antes de desaparecer. Contra un jefe caen más. En pareja, la toma quien la toque primero.</li>
        <li>Al limpiar un tramo (cuando aparece "¡ADELANTE!") recuperas el ${Math.round((b.jugador.curaPorTramo || 0) * 100)}% de tu vida.</li>
        <li>Las habilidades caras rinden más daño por cada punto de maná: guarda maná para la Onda de choque y los combos.</li>
        <li><b>Modo infinito:</b> oleadas sin fin en el mundo que elijas (de los que tengas abiertos). Cada oleada los enemigos
            pegan, aguantan y corren un poco más; cada ${BALANCE.infinito ? BALANCE.infinito.jefeCada : 10} oleadas aparece un jefe.
            Al terminar una oleada recuperas vida. Se guarda tu mejor oleada en solitario, en pareja y en línea.</li>
        <li><b>Revivir (modo pareja):</b> si tu compañero cae, tienes ${CONFIG.revivir.tiempoCaido} s para llegar a su lado y mantener
            la tecla de revivir ${CONFIG.revivir.tiempoRevivir} s. Si te golpean, se interrumpe. Vuelve con el ${Math.round(CONFIG.revivir.vidaAlRevivir * 100)}% de vida.
            Hay ${CONFIG.revivir.maxPorNivel} revivires por nivel.</li>
        <li>Los enemigos tienen ${BALANCE.vidaEnemigo(1)} de vida en el nivel 1 y suben un ${Math.round((b.enemigos.crecimientoPorNivel - 1) * 100)}% por nivel.
            El Gigante (nivel 10 de la Isla) tiene ${ESCENARIOS['isla-10'].vidaJefe || BALANCE.vidaJefe(10)}. Durante la pelea con un jefe caen refuerzos cada ${b.refuerzos.intervalo} s.</li>
      </ul>`;
    }

    this.mostrarHTML(`
      <div class="panel panel-ayuda">
        <h2>Cómo jugar</h2>
        <div class="pestanas">
          ${Object.entries(pestanas).map(([id, t]) => `<button class="pestana ${id === pestana ? 'activa' : ''}" data-pestana="${id}">${t}</button>`).join('')}
        </div>
        <div class="cuerpo-ayuda">${cuerpo}</div>
        <button class="btn grande ${textoBoton !== 'Volver' ? 'verde' : ''}" data-ir="cerrar" ${textoBoton === 'Volver' ? 'data-atras="1"' : ''}>${textoBoton}</button>
      </div>`);
    this.cont.querySelectorAll('[data-pestana]').forEach((p) => p.onclick = () => this.comoJugar(alCerrar, textoBoton, p.dataset.pestana));
    this.conectar({ cerrar: () => alCerrar() });
  },

  // Pantalla de carga con consejos que van cambiando
  carga(titulo = 'Cargando…') {
    const lista = consejosCortos();
    let i = Math.floor(Math.random() * lista.length);
    this.mostrarHTML(`
      <div class="panel panel-carga">
        <h2>${titulo}</h2>
        <div class="barra-carga"><div></div></div>
        <p class="consejo">💡 <span id="texto-consejo">${lista[i]}</span></p>
      </div>`);
    clearInterval(this.rotarConsejos);
    this.rotarConsejos = setInterval(() => {
      const el = document.getElementById('texto-consejo');
      if (!el) { clearInterval(this.rotarConsejos); return; }
      i = (i + 1) % lista.length;
      el.textContent = lista[i];
    }, 2600);
  },
});

// Entra o sale de pantalla completa (ver PantallaCompleta en js/ui/pausa.js)
function pantallaCompleta() {
  if (typeof PantallaCompleta !== 'undefined') { PantallaCompleta.alternar(); return; }
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
  } else if (document.exitFullscreen) document.exitFullscreen();
}
