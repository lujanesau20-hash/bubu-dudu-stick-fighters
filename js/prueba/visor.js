/* =====================================================================
   VISOR DE ANIMACIONES (arriba a la derecha)
   Para revisar que no haya distorsión: elige personaje y animación,
   velocidad lenta/normal, línea de los pies y caja de cada cuadro.
   ===================================================================== */
const Visor = {
  personaje: 'bubu',
  anim: 'reposo',
  lento: false,
  debug: { pies: true, cajas: false },
  t: 0,

  init(alCambiarPersonaje) {
    this.alCambiarPersonaje = alCambiarPersonaje;
    this.panel = document.getElementById('visor');
    this.dibujarPanel();
  },

  get velocidad() { return this.lento ? 0.25 : 1; },

  dibujarPanel() {
    const anims = Object.keys(PRUEBA_CONFIG.animaciones);
    this.panel.innerHTML = `
      <div class="visor-titulo">Visor de animaciones</div>
      <div class="fila">
        ${['bubu', 'dudu'].map((p) => `<button class="sel-pj ${p === this.personaje ? 'activo' : ''}" data-pj="${p}">${p === 'bubu' ? 'Bubu (panda)' : 'Dudu (oso)'}</button>`).join('')}
      </div>
      <canvas id="visor-lienzo" width="300" height="230"></canvas>
      <div id="visor-info"></div>
      <div class="botones-anim">
        ${anims.map((a) => {
          const d = Cuadros.datos[this.personaje][a];
          const c = PRUEBA_CONFIG.hojas[this.personaje][a];
          let marca = '';
          if (c.provisional) marca = '<b class="prov">PROV</b>';
          else if (c.falta) marca = c.codigo ? '<b class="cod">CÓDIGO</b>' : '<b class="falta">FALTA</b>';
          else if (d.avisos.length) marca = '<b class="falta">!</b>';
          return `<button class="btn-anim ${a === this.anim ? 'activo' : ''}" data-anim="${a}">${a.replace('_', ' ')} ${marca}</button>`;
        }).join('')}
      </div>
      <div class="fila opciones">
        <label><input type="checkbox" id="op-lento" ${this.lento ? 'checked' : ''}> Lento</label>
        <label><input type="checkbox" id="op-pies" ${this.debug.pies ? 'checked' : ''}> Línea de pies</label>
        <label><input type="checkbox" id="op-cajas" ${this.debug.cajas ? 'checked' : ''}> Cajas</label>
      </div>
      <button id="op-guardar" class="btn-chico" title="Descarga cuadros_datos.js para que la prueba funcione con doble clic">Guardar datos de cuadros</button>`;

    this.panel.querySelectorAll('[data-pj]').forEach((b) => b.onclick = () => {
      this.personaje = b.dataset.pj; this.t = 0; this.dibujarPanel(); this.alCambiarPersonaje(this.personaje);
    });
    this.panel.querySelectorAll('[data-anim]').forEach((b) => b.onclick = () => {
      this.anim = b.dataset.anim; this.t = 0; this.dibujarPanel();
    });
    this.panel.querySelector('#op-lento').onchange = (e) => { this.lento = e.target.checked; };
    this.panel.querySelector('#op-pies').onchange = (e) => { this.debug.pies = e.target.checked; };
    this.panel.querySelector('#op-cajas').onchange = (e) => { this.debug.cajas = e.target.checked; };
    this.panel.querySelector('#op-guardar').onclick = () => this.guardarDatos();
    // Que las teclas del juego no activen los botones del panel
    this.panel.querySelectorAll('button, input').forEach((el) => el.addEventListener('keydown', (e) => e.preventDefault()));
    this.lienzo = this.panel.querySelector('#visor-lienzo');
    this.info = this.panel.querySelector('#visor-info');
  },

  guardarDatos() {
    if (Cuadros.lecturaBloqueada) { alert('Abre la prueba con un servidor local para poder detectar y guardar los cuadros.'); return; }
    const blob = new Blob([Cuadros.exportar()], { type: 'text/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cuadros_datos.js';
    a.click();
  },

  actualizar(dt) {
    this.t += dt * this.velocidad;
    const ctx = this.lienzo.getContext('2d');
    const W = this.lienzo.width, H = this.lienzo.height;
    ctx.clearRect(0, 0, W, H);
    const sueloY = H - 30;
    ctx.fillStyle = '#e9edf2'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#cfd6de'; ctx.fillRect(0, sueloY, W, H - sueloY);

    const d = Cuadros.datos[this.personaje][this.anim];
    const def = PRUEBA_CONFIG.animaciones[this.anim];
    const c = PRUEBA_CONFIG.hojas[this.personaje][this.anim];
    const lineas = [];
    if (!d.cuadros.length) {
      ctx.fillStyle = '#c92a2a';
      ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
      ctx.fillText(c.codigo ? 'POR CÓDIGO' : 'FALTA', W / 2, H / 2);
      lineas.push(c.nota || 'No hay hoja para esta animación');
    } else {
      // Bucle continuo en el visor (con una pausa al final si no es bucle)
      const n = d.cuadros.length;
      let k = Math.floor(this.t * def.fps);
      if (def.modo !== 'bucle') k = k % (n + 4); // muestra el último cuadro un rato
      const i = Math.min(k % (def.modo === 'bucle' ? n : n + 4), n - 1);
      const cu = d.cuadros[i];
      // Misma escala que en el juego, reducida para que quepa
      const escalaJuego = PRUEBA_CONFIG.escalaBase * PRUEBA_CONFIG.escalaPersonaje[this.personaje] * c.escala;
      const escala = escalaJuego * 0.9;
      ctx.save();
      ctx.translate(W / 2, sueloY);
      dibujarCuadro(ctx, d.img, cu, escala, 1, 1, 1, this.debug);
      ctx.restore();
      if (this.debug.pies) {
        ctx.strokeStyle = '#ff2d55'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, sueloY + 0.5); ctx.lineTo(W, sueloY + 0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W / 2 + 0.5, sueloY - 6); ctx.lineTo(W / 2 + 0.5, sueloY + 6); ctx.stroke();
      }
      const archivo = c.archivo.split('/').pop();
      lineas.push(`<b>${archivo}</b>`);
      lineas.push(`Cuadro <b>${i + 1} / ${n}</b> · ${def.modo} · ${def.fps} fps${this.lento ? ' (lento)' : ''}`);
      lineas.push(`Detectados ${d.detectados} (esperados ${d.esperados})${c.usar ? ' · se usan ' + c.usar.map((u) => u + 1).join(',') : ''} · ${d.fuente}`);
      lineas.push(`Caja ${cu.w}×${cu.h}px · escala hoja ${c.escala}`);
      if (c.nota) lineas.push(`<span class="nota">${c.nota}</span>`);
    }
    if (c.provisional) lineas.push('<span class="prov">PROVISIONAL</span>');
    d.avisos.forEach((a) => lineas.push(`<span class="aviso">⚠ ${a}</span>`));
    this.info.innerHTML = lineas.join('<br>');
  },
};
