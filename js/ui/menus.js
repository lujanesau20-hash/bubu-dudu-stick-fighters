/* =====================================================================
   MENÚS (HTML sobre el canvas): principal, selección de personaje,
   pausa, game over, victoria, fin de versus y tienda.
   ===================================================================== */
const Menus = {
  init(juego) {
    this.juego = juego;
    this.cont = document.getElementById('pantallas');
    this.tienda = new TiendaUI(this.cont);
  },

  ocultar() { this.cont.innerHTML = ''; this.cont.classList.add('oculto'); },
  mostrarHTML(html) { this.cont.classList.remove('oculto'); this.cont.innerHTML = html; },

  // Asigna funciones a botones con data-ir
  conectar(acciones) {
    this.cont.querySelectorAll('[data-ir]').forEach((b) => {
      b.onclick = () => acciones[b.dataset.ir] && acciones[b.dataset.ir](b);
    });
  },

  principal() {
    this.mostrarHTML(`
      <div class="panel panel-principal">
        <h1 class="titulo"><span class="t-bubu">Bubu</span> <span class="t-y">&</span> <span class="t-dudu">Dudu</span></h1>
        <p class="subtitulo">Stick Fighters</p>
        <button class="btn grande" data-ir="solo">Niveles en solitario</button>
        <button class="btn grande" data-ir="pareja">Niveles en pareja</button>
        <button class="btn grande" data-ir="versus">Versus</button>
        <button class="btn grande" data-ir="enlinea">🌐 Jugar en línea</button>
        <div class="fila-botones">
          <button class="btn" data-ir="tienda">🛍 Tienda</button>
          <button class="btn" data-ir="como">❓ Cómo jugar</button>
          <button class="btn" data-ir="pantalla">⛶</button>
        </div>
        <div class="monedas-menu">🪙 ${Guardado.datos.monedas}</div>
      </div>`);
    this.conectar({
      solo: () => this.seleccion('solo'),
      pareja: () => this.seleccion('pareja'),
      versus: () => this.seleccion('versus'),
      enlinea: () => this.enLineaInicio(),
      tienda: () => this.tienda.abrir(() => this.principal()),
      como: () => this.comoJugar(() => this.principal()),
      pantalla: () => pantallaCompleta(),
    });
  },

  seleccion(modo) {
    const ids = Object.keys(CONFIG.personajes);
    let elegido = 'bubu';
    const titulos = { solo: 'Niveles en solitario', pareja: 'Niveles en pareja', versus: 'Versus' };
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
          ${etiqueta}<img src="${CONFIG.personajes[id].sprite}" alt="${CONFIG.personajes[id].nombre}">
          <div class="nombre">${CONFIG.personajes[id].nombre}</div></div>`;
      }).join('');
      this.mostrarHTML(`
        <div class="panel">
          <h2>${titulos[modo]}</h2>
          <p>${modo === 'solo' ? 'Elige tu personaje' : 'Toca un personaje para que sea el Jugador 1'}</p>
          <div class="tarjetas">${tarjetas}</div>
          <p class="ayuda">${ayuda}</p>
          <div class="fila-botones">
            <button class="btn" data-ir="volver">Volver</button>
            <button class="btn grande verde" data-ir="jugar">¡Jugar!</button>
          </div>
        </div>`);
      this.cont.querySelectorAll('.tarjeta').forEach((t) => t.onclick = () => { elegido = t.dataset.id; pintar(); });
      this.conectar({
        volver: () => this.principal(),
        jugar: () => {
          const otro = ids.find((i) => i !== elegido);
          const personajes = modo === 'solo' ? [elegido] : [elegido, otro];
          // La primera vez se muestra "Cómo jugar" antes de empezar
          if (!Guardado.datos.vioComoJugar) {
            this.comoJugar(() => {
              Guardado.datos.vioComoJugar = true; Guardado.guardar();
              this.juego.iniciarPartida(modo, personajes);
            }, '¡A jugar!');
            return;
          }
          this.juego.iniciarPartida(modo, personajes);
        },
      });
    };
    pintar();
  },

  pausa() {
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

  victoria(monedas, hayMas) {
    this.mostrarHTML(`
      <div class="panel">
        <h2 class="dorado">¡NIVEL SUPERADO!</h2>
        <p>Monedas ganadas: 🪙 ${monedas} · Total: 🪙 ${Guardado.datos.monedas}</p>
        <button class="btn grande verde" data-ir="tienda">🛍 Ir a la tienda</button>
        ${hayMas ? '' : '<p class="ayuda">Los siguientes escenarios (Cielo, Espacio y Ciudad) llegarán pronto.</p>'}
        <button class="btn" data-ir="otra">Jugar otra vez</button>
        <button class="btn" data-ir="menu">Menú principal</button>
      </div>`);
    this.conectar({
      tienda: () => this.tienda.abrir(() => this.victoria(monedas, hayMas)),
      otra: () => this.juego.reiniciar(),
      menu: () => this.juego.irAlMenu(),
    });
  },

  finVersus(nombre) {
    this.mostrarHTML(`
      <div class="panel">
        <h2 class="dorado">¡${nombre} GANA!</h2>
        <button class="btn grande" data-ir="revancha">Revancha</button>
        <button class="btn" data-ir="menu">Menú principal</button>
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
    `Cada ${b.corazones.intervalo} s cae un corazón: cura el ${Math.round(b.corazones.curacion * 100)}% de tu vida. ¡Recógelo antes de ${b.corazones.duracion} s!`,
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
        </tbody></table>`;
      cuerpo = tabla('PC · un jugador', c.solo, false) + tabla('PC · Jugador 1 (dos en el teclado)', c.j1) + tabla('PC · Jugador 2', c.j2) + `
        <h3>Celular</h3>
        <table class="tabla-ayuda"><tbody>
          <tr><td>Moverse / agacharse</td><td>Joystick a la izquierda (abajo = agacharse)</td></tr>
          <tr><td>Saltar</td><td>Botón ▲ a la derecha (dos toques = doble salto)</td></tr>
          <tr><td>Habilidades</td><td>Botones H1 a H4 alrededor del salto</td></tr>
          <tr><td>Combinaciones</td><td>Desliza el dedo de un botón al vecino sin soltar</td></tr>
          <tr><td>Revivir</td><td>Mantén el botón ♥ que aparece junto al compañero caído</td></tr>
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
        Un ataque no interrumpe a otro que ya está en curso.</p>`;
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
        <li>Cada ${b.corazones.intervalo} segundos cae un corazón cerca de ti: cura el ${Math.round(b.corazones.curacion * 100)}% de tu vida.
            Dura ${b.corazones.duracion} s y parpadea antes de desaparecer. En pareja, lo recibe quien lo toque primero.</li>
        <li>Las habilidades caras rinden más daño por cada punto de maná: guarda maná para la Onda de choque y los combos.</li>
        <li><b>Revivir (modo pareja):</b> si tu compañero cae, tienes ${CONFIG.revivir.tiempoCaido} s para llegar a su lado y mantener
            la tecla de revivir ${CONFIG.revivir.tiempoRevivir} s. Si te golpean, se interrumpe. Vuelve con el ${Math.round(CONFIG.revivir.vidaAlRevivir * 100)}% de vida.
            Hay ${CONFIG.revivir.maxPorNivel} revivires por nivel.</li>
        <li>Los enemigos tienen ${BALANCE.vidaEnemigo(1)} de vida en el nivel 1 y el jefe ${BALANCE.vidaJefe(1)}. Suben un ${Math.round(b.enemigos.subidaPorNivel * 100)}% por nivel.</li>
      </ul>`;
    }

    this.mostrarHTML(`
      <div class="panel panel-ayuda">
        <h2>Cómo jugar</h2>
        <div class="pestanas">
          ${Object.entries(pestanas).map(([id, t]) => `<button class="pestana ${id === pestana ? 'activa' : ''}" data-pestana="${id}">${t}</button>`).join('')}
        </div>
        <div class="cuerpo-ayuda">${cuerpo}</div>
        <button class="btn grande ${textoBoton !== 'Volver' ? 'verde' : ''}" data-ir="cerrar">${textoBoton}</button>
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

function pantallaCompleta() {
  const el = document.documentElement;
  if (!document.fullscreenElement) {
    (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
  } else if (document.exitFullscreen) document.exitFullscreen();
}
