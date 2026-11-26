/* =====================================================================
   CONTROLES TÁCTILES (celular)
   - Joystick virtual a la izquierda (moverse y agacharse). En celular, FIJO (config/interfaz.js -> joystickFijo).
   - Botón de salto a la derecha (doble toque = doble salto).
   - 4 botones de habilidad en arco o fila.
   - Combinaciones: deslizar el dedo de un botón al botón vecino sin soltar.
   ===================================================================== */
class ControlesTactiles {
  constructor(contenedor) {
    this.cont = contenedor;
    this.activo = false;
    this.pausaPulsada = false;
    this.estado = {
      x: 0, abajo: false, saltoPulsado: false, saltoMantenido: false,
      habilidades: [false, false, false, false], combo: null, revivir: false,
    };
    this.dedoJoystick = null;
    this.dedosHabilidad = {}; // pointerId -> { actual, inicio, tiempo, comboHecho }
    this.construir();
  }

  construir() {
    const disp = CONFIG.tactil.disposicion;
    // v1.21: botones estilo Mobile Legends (config/interfaz.js -> botonesML)
    this.ml = !!(CONFIG.interfaz && CONFIG.interfaz.botonesML && CONFIG.interfaz.botonesML.activo);
    const botonHab = (h, i) => this.ml
      ? `<div class="btn-hab ${i === 1 ? 'basico' : ''}" data-i="${i}">
            <div class="hab-cd"></div><span class="hab-icono">${h.icono}</span>
            <span class="hab-num"></span>${h.energia > 0 ? `<span class="hab-mana">${h.energia}</span>` : ''}
          </div>`
      : `<div class="btn-hab" data-i="${i}">
            <span class="hab-icono">${h.icono}</span><span class="hab-tecla">H${i + 1}</span>
            <div class="hab-cd"></div>
          </div>`;
    this.cont.innerHTML = `
      <div class="joy-zona"><div class="joy-base"><div class="joy-palanca"></div></div></div>
      <div class="zona-botones ${this.ml ? 'ml' : disp}">
        ${CONFIG.habilidades.map(botonHab).join('')}
        <div class="btn-salto">▲</div>
        <div class="btn-revivir oculto">♥<small>REVIVIR</small></div>
        ${this.ml ? CONFIG.combos.lista.map((c, k) => `<div class="chip-combo" data-k="${k}">${c.icono || '✦'}</div>`).join('') : ''}
      </div>
      <div class="btn-pausa-tactil">II</div>`;

    this.zonaJoy = this.cont.querySelector('.joy-zona');
    this.base = this.cont.querySelector('.joy-base');
    this.palanca = this.cont.querySelector('.joy-palanca');
    this.botonesHab = [...this.cont.querySelectorAll('.btn-hab')];
    this.btnSalto = this.cont.querySelector('.btn-salto');
    this.btnRevivir = this.cont.querySelector('.btn-revivir');
    this.chipsCombo = [...this.cont.querySelectorAll('.chip-combo')];
    const btnPausa = this.cont.querySelector('.btn-pausa-tactil');
    if (this.ml) {
      this.colocarBotones();
      window.addEventListener('resize', () => this.colocarBotones());
      window.addEventListener('orientationchange', () => setTimeout(() => this.colocarBotones(), 300));
    }

    // --- Joystick ---
    // Fijo (config/interfaz.js -> joystickFijo): la base está siempre en el mismo lugar y la
    // dirección se mide desde SU centro, no desde donde empezó el toque. Así, aunque la pantalla
    // no registre el primer toque, jalar a un lado siempre camina.
    // Cada dedo se sigue por su identificador (pointerId): joystick y botones funcionan a la vez.
    this.jf = CONFIG.interfaz && CONFIG.interfaz.joystickFijo;
    this.fijo = !!(this.jf && this.jf.activo);
    if (this.fijo) {
      this.zonaJoy.classList.add('fija');
      this.colocarJoystick();
      window.addEventListener('resize', () => this.colocarJoystick());
      window.addEventListener('orientationchange', () => setTimeout(() => this.colocarJoystick(), 300));
    }
    this.zonaJoy.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      // Fijo: un toque nuevo siempre toma el joystick (si el sistema perdió el dedo anterior, no queda bloqueado)
      if (this.dedoJoystick !== null && !this.fijo) return;
      this.dedoJoystick = e.pointerId;
      try { this.zonaJoy.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
      if (this.fijo) {
        const rb = this.base.getBoundingClientRect();
        this.centro = { x: rb.left + rb.width / 2, y: rb.top + rb.height / 2 };
      } else {
        const r = this.zonaJoy.getBoundingClientRect();
        this.centro = { x: e.clientX, y: e.clientY };
        this.base.style.left = (e.clientX - r.left) + 'px';
        this.base.style.top = (e.clientY - r.top) + 'px';
      }
      this.base.classList.add('activa');
      this.moverJoystick(e);
    });
    this.zonaJoy.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.dedoJoystick) this.moverJoystick(e);
    });
    const soltarJoy = (e) => { if (e.pointerId === this.dedoJoystick) this.soltarJoystick(); };
    this.zonaJoy.addEventListener('pointerup', soltarJoy);
    this.zonaJoy.addEventListener('pointercancel', soltarJoy);
    this.zonaJoy.addEventListener('lostpointercapture', soltarJoy);
    window.addEventListener('pointerup', soltarJoy);
    window.addEventListener('pointercancel', soltarJoy);
    // Si el sistema cancela los toques (llamada, notificación, cambiar de app): nada queda "pegado"
    window.addEventListener('blur', () => this.soltarTodo());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.soltarTodo(); });

    // --- Salto ---
    this.btnSalto.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.estado.saltoPulsado = true;
      this.estado.saltoMantenido = true;
      this.btnSalto.classList.add('pulsado');
    });
    const soltarSalto = () => { this.estado.saltoMantenido = false; this.btnSalto.classList.remove('pulsado'); };
    this.btnSalto.addEventListener('pointerup', soltarSalto);
    this.btnSalto.addEventListener('pointercancel', soltarSalto);
    this.btnSalto.addEventListener('pointerleave', soltarSalto);

    // --- Revivir (mantener) ---
    this.btnRevivir.addEventListener('pointerdown', (e) => { e.preventDefault(); this.estado.revivir = true; });
    const soltarRev = () => { this.estado.revivir = false; };
    this.btnRevivir.addEventListener('pointerup', soltarRev);
    this.btnRevivir.addEventListener('pointercancel', soltarRev);
    this.btnRevivir.addEventListener('pointerleave', soltarRev);

    // --- Habilidades y deslizamiento para combos ---
    this.botonesHab.forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        // Soltar la captura: queremos saber sobre qué botón pasa el dedo
        try { if (b.hasPointerCapture(e.pointerId)) b.releasePointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
        const i = +b.dataset.i;
        this.estado.habilidades[i] = true;
        this.dedosHabilidad[e.pointerId] = { actual: i, inicio: performance.now(), comboHecho: false };
        b.classList.add('pulsado');
      });
    });
    const zonaBotones = this.cont.querySelector('.zona-botones');
    zonaBotones.addEventListener('pointermove', (e) => this.deslizar(e));
    window.addEventListener('pointermove', (e) => { if (this.dedosHabilidad[e.pointerId]) this.deslizar(e); });
    const soltarHab = (e) => {
      if (!this.dedosHabilidad[e.pointerId]) return;
      delete this.dedosHabilidad[e.pointerId];
      this.botonesHab.forEach((b) => b.classList.remove('pulsado', 'combo'));
    };
    window.addEventListener('pointerup', soltarHab);
    window.addEventListener('pointercancel', soltarHab);

    btnPausa.addEventListener('pointerdown', (e) => { e.preventDefault(); this.pausaPulsada = true; });
  }

  moverJoystick(e) {
    const jf = this.jf;
    const R = this.fijo ? this.recorrido : CONFIG.tactil.radioJoystick;
    let dx = e.clientX - this.centro.x;
    let dy = e.clientY - this.centro.y;
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    this.palanca.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const nx = dx / R, ny = dy / R;
    const muerta = this.fijo ? jf.zonaMuerta : CONFIG.tactil.zonaMuerta;
    this.estado.x = Math.abs(nx) < muerta ? 0 : U.clamp(nx * 1.25, -1, 1);
    const umbral = this.fijo ? jf.umbralAgachar : CONFIG.tactil.umbralAgachar;
    this.estado.abajo = ny > umbral && (!this.fijo || !jf.agacharSoloAbajo || ny > Math.abs(nx));
  }

  // Botones estilo Mobile Legends (v1.21): calcula el lugar y el tamaño de cada botón en px
  // según la pantalla (config/interfaz.js -> botonesML). También lo usan las pruebas.
  medidasBotones(W = window.innerWidth, H = window.innerHeight) {
    const b = CONFIG.interfaz.botonesML;
    const tam = (d) => U.clamp(H * d.diametro, d.min, d.max);
    const dB = tam(b.basico), dH = tam(b.habilidad);
    const cx = W - H * b.basico.margenDerecha - dB / 2, cy = H - H * b.basico.margenAbajo - dB / 2;
    const polar = (ang, dist, d) => {
      const r = (ang * Math.PI) / 180;
      return { x: cx + Math.cos(r) * dist * dB, y: cy - Math.sin(r) * dist * dB, d };
    };
    const lugares = { 1: { x: cx, y: cy, d: dB } };          // básico (H2)
    lugares[0] = polar(b.arco.H1[0], b.arco.H1[1], dH);       // H1
    lugares[2] = polar(b.arco.H3[0], b.arco.H3[1], dH);       // H3
    lugares[3] = polar(b.arco.H4[0], b.arco.H4[1], dH);       // H4
    // Salto: arriba de las habilidades, pegado al borde derecho
    const dS = tam(b.salto);
    const arribaHab = Math.min(lugares[2].y - dH / 2, lugares[3].y - dH / 2);
    const salto = { x: W - H * b.basico.margenDerecha - dS / 2, y: arribaHab - H * b.salto.separacion - dS / 2, d: dS };
    const revivir = polar(b.revivir.angulo, b.revivir.distancia, tam(b.revivir));
    const combos = b.combos.angulos.map((a) => polar(a, b.combos.distancia, tam(b.combos)));
    return { lugares, salto, revivir, combos };
  }

  colocarBotones() {
    if (!this.ml) return;
    const md = this.medidasBotones();
    const poner = (el, p) => {
      if (!el || !p) return;
      const st = el.style;
      st.width = st.height = Math.round(p.d) + 'px';
      st.left = Math.round(p.x - p.d / 2) + 'px'; st.top = Math.round(p.y - p.d / 2) + 'px';
      st.right = 'auto'; st.bottom = 'auto';
      st.fontSize = Math.round(p.d * 0.42) + 'px';
    };
    this.botonesHab.forEach((el) => poner(el, md.lugares[+el.dataset.i]));
    poner(this.btnSalto, md.salto);
    poner(this.btnRevivir, md.revivir);
    this.chipsCombo.forEach((el, k) => poner(el, md.combos[k]));
  }

  // Joystick fijo: coloca la base y la zona de toque según el tamaño de la pantalla
  colocarJoystick() {
    if (!this.fijo) return;
    const jf = this.jf, W = window.innerWidth, H = window.innerHeight;
    const d = U.clamp(H * jf.diametro, jf.diametroMin, jf.diametroMax);
    const zona = d * jf.zonaToque;
    const cx = U.clamp(W * jf.x, d / 2 + 4, W - d / 2 - 4);
    const cy = U.clamp(H * jf.y, d / 2 + 4, H - d / 2 - 4);
    const izq = Math.max(0, cx - zona / 2), arr = Math.max(0, cy - zona / 2);
    const z = this.zonaJoy.style;
    z.left = izq + 'px'; z.top = arr + 'px'; z.bottom = 'auto';
    z.width = Math.min(zona, W - izq) + 'px'; z.height = Math.min(zona, H - arr) + 'px';
    const b = this.base.style;
    b.width = b.height = d + 'px'; b.margin = `${-d / 2}px 0 0 ${-d / 2}px`;
    b.left = (cx - izq) + 'px'; b.top = (cy - arr) + 'px';
    const p = Math.round(d * 0.46);
    this.palanca.style.width = this.palanca.style.height = p + 'px';
    this.recorrido = d * jf.recorrido;
  }

  soltarJoystick() {
    this.dedoJoystick = null;
    this.estado.x = 0; this.estado.abajo = false;
    this.palanca.style.transform = 'translate(-50%,-50%)';
    this.base.classList.remove('activa');
  }

  // Suelta todo lo que esté apretado (el sistema canceló los toques o se ocultaron los controles)
  soltarTodo() {
    this.soltarJoystick();
    this.estado.saltoMantenido = false; this.estado.revivir = false;
    this.dedosHabilidad = {};
    if (this.btnSalto) this.btnSalto.classList.remove('pulsado');
    if (this.botonesHab) this.botonesHab.forEach((b) => b.classList.remove('pulsado', 'combo'));
  }

  // Si el dedo pasa de un botón al vecino (sin soltar) => combinación
  deslizar(e) {
    const dedo = this.dedosHabilidad[e.pointerId];
    if (!dedo) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const btn = el && el.closest ? el.closest('.btn-hab') : null;
    if (!btn) return;
    const j = +btn.dataset.i;
    if (j === dedo.actual) return;
    const tiempo = performance.now() - dedo.inicio;
    // v1.21: vale cualquier par que forme una combinación (H1+H3, H1+H4, H3+H4), no solo vecinos
    if (!dedo.comboHecho && COMBOS.buscar(j, dedo.actual) && tiempo <= CONFIG.combos.ventanaTactilMs) {
      this.estado.combo = [Math.min(j, dedo.actual), Math.max(j, dedo.actual)];
      dedo.comboHecho = true;
      this.botonesHab[j].classList.add('combo');
      this.botonesHab[dedo.actual].classList.add('combo');
      if (navigator.vibrate) navigator.vibrate(40);
    }
    dedo.actual = j;
  }

  // Devuelve el estado y limpia los pulsos de un solo paso
  leer() {
    const s = this.estado;
    const copia = { x: s.x, abajo: s.abajo, saltoPulsado: s.saltoPulsado, saltoMantenido: s.saltoMantenido,
      habilidades: s.habilidades.slice(), combo: s.combo, revivir: s.revivir };
    s.saltoPulsado = false;
    s.habilidades = [false, false, false, false];
    s.combo = null;
    return copia;
  }

  mostrar(si) {
    if (!si && this.activo) this.soltarTodo();
    this.activo = si;
    this.cont.classList.toggle('oculto', !si);
  }

  // Actualiza enfriamientos/energía en los botones y el botón de revivir
  actualizarVisual(jugador, mostrarRevivir) {
    if (!this.activo || !jugador) return;
    this.botonesHab.forEach((b) => {
      const i = +b.dataset.i;
      const h = CONFIG.habilidades[i];
      const resta = jugador.enfriamientos[i];
      const cd = h.enfriamiento > 0 ? resta / h.enfriamiento : 0;
      const txtCd = Math.max(0, cd).toFixed(3);
      if (b._cd !== txtCd) { b._cd = txtCd; b.style.setProperty('--cd', txtCd); }
      const sin = jugador.energia < h.energia;
      if (b._sin !== sin) { b._sin = sin; b.classList.toggle('sin-energia', sin); }
      if (this.ml) {
        // Estilo Mobile Legends: segundos que faltan en el centro (la capa oscura gira y se vacía)
        const num = b._num || (b._num = b.querySelector('.hab-num'));
        const t = resta > 0.05 ? (resta >= 1 ? String(Math.ceil(resta)) : resta.toFixed(1)) : '';
        if (num && num.textContent !== t) num.textContent = t;
      }
    });
    // Combos disponibles: hay maná y no están en enfriamiento
    this.chipsCombo.forEach((el, k) => {
      const def = CONFIG.combos.lista[k];
      const ok = jugador.energia >= def.energia && !(jugador.enfriamientoCombo > 0) && !(jugador.enfriamientosCombo && jugador.enfriamientosCombo[k] > 0);
      if (el._ok !== ok) { el._ok = ok; el.classList.toggle('lista', ok); }
    });
    this.btnRevivir.classList.toggle('oculto', !mostrarRevivir);
  }
}

// ¿El dispositivo es táctil?
function esDispositivoTactil() {
  return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
}
