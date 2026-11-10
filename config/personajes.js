/* =====================================================================
   PERSONAJES: UNA SOLA FUENTE PARA BUBU Y DUDU
   Todas las pantallas dibujan a los personajes desde aquí, con las hojas de
   sprites ACTUALES: selección de personaje, sala en línea, avatar del HUD,
   vista previa de la tienda, jugador local y jugador remoto.
   - Las hojas, sus cuadros y sus escalas están en js/prueba/animaciones.js
     (la misma definición que usa prueba-personajes.html); este archivo las
     conecta al juego y elige la versión para celular.
   - Si una hoja falla, NO se usa ninguna imagen vieja: el error se muestra en
     el panel de depuración (F3 o 5 toques en la esquina superior izquierda).
   ===================================================================== */
const PERSONAJES = {
  ids: ['bubu', 'dudu'],

  // Cuadro que se usa como "foto" (selección, sala en línea, HUD y tienda)
  retrato: { animacion: 'reposo', cuadro: 0 },

  // En celular se usan hojas a mitad de tamaño (assets/personajes/movil/, creadas con
  // herramientas/hojas_movil.py): 33 MB de memoria en vez de 131 MB. Las originales no cambian.
  movil: { activo: true, carpeta: 'assets/personajes/movil/', factor: 0.5 },

  errores: [],       // problemas al cargar las hojas (se muestran en el panel)
  usaMovil: false,

  esCelular() { return typeof esDispositivoTactil === 'function' && esDispositivoTactil(); },

  // Antes de cargar: elegir la versión de cada hoja (celular o normal) y agregar ?v=VERSION_JUEGO
  prepararRutas() {
    const v = typeof VERSION_JUEGO !== 'undefined' ? VERSION_JUEGO : '';
    this.usaMovil = this.movil.activo && this.esCelular();
    for (const p of this.ids) {
      for (const h of Object.values(PRUEBA_CONFIG.hojas[p])) {
        if (h.falta) continue;
        if (!h.archivoOriginal) h.archivoOriginal = h.archivo;
        let ruta = h.archivoOriginal;
        h.factorImagen = 1;
        if (this.usaMovil) { ruta = ruta.replace('assets/personajes/', this.movil.carpeta); h.factorImagen = this.movil.factor; }
        h.archivo = v ? `${ruta}?v=${encodeURIComponent(v)}` : ruta;
      }
    }
  },

  // Después de cargar: comprobar que cada hoja se cargó, se puede decodificar y tiene cuadros
  async verificar() {
    const errores = [];
    // Para comprobar que una hoja se puede decodificar se dibuja en un lienzo de 1×1 px
    // (img.decode() puede quedarse esperando si la página no está a la vista)
    const prueba = document.createElement('canvas').getContext('2d');
    prueba.canvas.width = prueba.canvas.height = 1;
    for (const p of this.ids) {
      const datos = (typeof Cuadros !== 'undefined' && Cuadros.datos[p]) || {};
      if (!Object.keys(datos).length) errores.push(`${p}: no se cargaron las hojas`);
      for (const [anim, d] of Object.entries(datos)) {
        if (d.cfg.falta) continue;
        if (!d.img || !d.img.naturalWidth) { errores.push(`${p}/${anim}: no se pudo cargar`); continue; }
        try { prueba.drawImage(d.img, 0, 0, 1, 1); } catch (e) { errores.push(`${p}/${anim}: no se pudo decodificar (¿poca memoria?)`); }
        if (!d.cuadros.length) errores.push(`${p}/${anim}: sin cuadros`);
      }
    }
    this.errores = errores;
    if (errores.length) console.warn('Hojas de sprites con errores:', errores);
  },

  error(texto) { if (!this.errores.includes(texto)) this.errores.push(texto); },

  // Hoja y cuadro del retrato de un personaje (null si la hoja no está lista)
  cuadroRetrato(p) {
    const d = typeof Cuadros !== 'undefined' && Cuadros.datos[p] && Cuadros.datos[p][this.retrato.animacion];
    if (!d || !d.img || !d.cuadros.length) return null;
    return { hoja: d, c: d.cuadros[this.retrato.cuadro] || d.cuadros[0] };
  },

  // Dibuja un cuadro de una hoja (coordenadas guardadas en tamaño original; la hoja de celular es más chica)
  dibujarCuadro(ctx, hoja, c, x, y, w, h) {
    const f = hoja.cfg.factorImagen || 1;
    ctx.drawImage(hoja.img, c.x * f, c.y * f, c.w * f, c.h * f, x, y, w, h);
  },

  // Tarjeta de selección: un lienzo que se pinta con el retrato (ver pintarRetratos)
  htmlRetrato(p) {
    const nombre = CONFIG.personajes[p].nombre;
    return `<canvas class="retrato-pj" data-pj="${p}" width="240" height="260" aria-label="${nombre}"></canvas>`;
  },

  // Pinta todos los retratos de una pantalla (se llama al mostrar cada menú)
  pintarRetratos(raiz) {
    if (!raiz) return;
    raiz.querySelectorAll('canvas.retrato-pj').forEach((lienzo) => {
      const p = lienzo.dataset.pj;
      const ctx = lienzo.getContext('2d');
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
      const r = this.cuadroRetrato(p);
      if (!r) { this.error(`${p}: sin imagen para la selección`); return; }
      const k = Math.min(lienzo.width / r.c.w, lienzo.height / r.c.h);
      const w = r.c.w * k, h = r.c.h * k;
      this.dibujarCuadro(ctx, r.hoja, r.c, (lienzo.width - w) / 2, lienzo.height - h, w, h);
    });
  },
};
