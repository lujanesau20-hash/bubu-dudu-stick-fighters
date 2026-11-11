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
    this.cont.innerHTML = `
      <div class="joy-zona"><div class="joy-base"><div class="joy-palanca"></div></div></div>
      <div class="zona-botones ${disp}">
        ${CONFIG.habilidades.map((h, i) => `
          <div class="btn-hab" data-i="${i}">
            <span class="hab-icono">${h.icono}</span><span class="hab-tecla">H${i + 1}</span>
            <div class="hab-cd"></div>
          </div>`).join('')}
        <div class="btn-salto">▲</div>
        <div class="btn-revivir oculto">♥<small>REVIVIR</small></div>
      </div>
      <div class="btn-pausa-tactil">II</div>`;

    this.zonaJoy = this.cont.querySelector('.joy-zona');
    this.base = this.cont.querySelector('.joy-base');
    this.palanca = this.cont.querySelector('.joy-palanca');
    this.botonesHab = [...this.cont.querySelectorAll('.btn-hab')];
    this.btnSalto = this.cont.querySelector('.btn-salto');
    this.btnRevivir = this.cont.querySelector('.btn-revivir');
    const btnPausa = this.cont.querySelector('.btn-pausa-tactil');

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
    if (!dedo.comboHecho && Math.abs(j - dedo.actual) === 1 && tiempo <= CONFIG.combos.ventanaTactilMs) {
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
    this.botonesHab.forEach((b, i) => {
      const h = CONFIG.habilidades[i];
      const cd = jugador.enfriamientos[i] / h.enfriamiento;
      b.style.setProperty('--cd', Math.max(0, cd).toFixed(3));
      b.classList.toggle('sin-energia', jugador.energia < h.energia);
    });
    this.btnRevivir.classList.toggle('oculto', !mostrarRevivir);
  }
}

// ¿El dispositivo es táctil?
function esDispositivoTactil() {
  return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
}
