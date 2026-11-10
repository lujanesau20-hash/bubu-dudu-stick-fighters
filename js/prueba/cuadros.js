/* =====================================================================
   CARGA Y DETECCIÓN DE CUADROS
   No se divide la hoja en partes iguales: se buscan las columnas
   transparentes que separan los dibujos y cada cuadro se recorta por su
   contenido. El punto de apoyo (pies) se toma de la parte MÁS GRANDE del
   dibujo de cada cuadro: así las líneas de velocidad o las marcas de
   impacto no mueven al personaje.

   Si la página se abre con doble clic (file://), el navegador no deja leer
   los píxeles. En ese caso se usan los datos guardados en
   cuadros_datos.js (se regeneran desde el visor con "Guardar datos").
   ===================================================================== */
const Cuadros = {
  datos: {},          // datos[personaje][animacion] = { img, cuadros, ... }
  lecturaBloqueada: false,

  cargarImagen(src) {
    return new Promise((ok) => {
      const img = new Image();
      // Se decodifica al cargar (no la primera vez que se dibuja en el juego)
      img.onload = () => { if (img.decode) img.decode().then(() => ok(img), () => ok(img)); else ok(img); };
      img.onerror = () => ok(null);
      img.src = src;
    });
  },

  async cargarTodo() {
    const cfg = PRUEBA_CONFIG;
    const tareas = [];
    for (const [personaje, hojas] of Object.entries(cfg.hojas)) {
      this.datos[personaje] = {};
      for (const [anim, h] of Object.entries(hojas)) {
        const d = { personaje, anim, cfg: h, img: null, cuadros: [], detectados: 0, esperados: h.cuadros || 0, avisos: [] };
        this.datos[personaje][anim] = d;
        if (h.falta) continue;
        tareas.push(this.cargarImagen(h.archivo).then((img) => {
          if (!img) { d.avisos.push('No se pudo cargar ' + h.archivo); return; }
          d.img = img;
          let todos = null;
          const guardado = window.CUADROS_RESPALDO && CUADROS_RESPALDO[personaje] && CUADROS_RESPALDO[personaje][anim];
          if (this.preferirGuardados && guardado) {
            todos = guardado; d.fuente = 'guardado';
          } else try {
            todos = this.detectar(img);
            d.fuente = 'detectado';
          } catch (e) {
            // Lienzo bloqueado (file://): usar datos guardados
            this.lecturaBloqueada = true;
            const r = window.CUADROS_RESPALDO && CUADROS_RESPALDO[personaje] && CUADROS_RESPALDO[personaje][anim];
            if (r) { todos = r; d.fuente = 'guardado'; }
            else { d.avisos.push('No se pueden leer los píxeles y no hay datos guardados'); todos = []; }
          }
          d.todos = todos;
          d.detectados = todos.length;
          if (d.detectados !== d.esperados) d.avisos.push(`Se esperaban ${d.esperados} cuadros y se detectaron ${d.detectados}`);
          d.cuadros = h.usar ? h.usar.map((i) => todos[i]).filter(Boolean) : todos;
        }));
      }
    }
    await Promise.all(tareas);
    return this.datos;
  },

  // Devuelve [{x,y,w,h,pieX,pieY}] en coordenadas de la hoja
  detectar(img) {
    const W = img.naturalWidth, H = img.naturalHeight;
    const lienzo = document.createElement('canvas');
    lienzo.width = W; lienzo.height = H;
    const ctx = lienzo.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, W, H).data; // lanza error si el lienzo está bloqueado
    const U = PRUEBA_CONFIG.umbralAlfa;
    const opaco = (x, y) => px[(y * W + x) * 4 + 3] > U;

    // 1) Columnas con dibujo
    const colLlena = new Uint8Array(W);
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y += 2) { if (opaco(x, y)) { colLlena[x] = 1; break; } }
    }
    // 2) Tramos de columnas separados por huecos transparentes
    const tramos = [];
    for (let x = 0; x < W; x++) {
      if (!colLlena[x]) continue;
      const ini = x;
      while (x < W && colLlena[x]) x++;
      const ult = tramos[tramos.length - 1];
      if (ult && ini - ult[1] - 1 < PRUEBA_CONFIG.huecoMinimo) ult[1] = x - 1;
      else tramos.push([ini, x - 1]);
    }
    // 3) Caja de cada cuadro y punto de apoyo
    return tramos.map(([x0, x1]) => {
      let y0 = H, y1 = -1;
      for (let y = 0; y < H; y++) {
        for (let x = x0; x <= x1; x++) { if (opaco(x, y)) { if (y < y0) y0 = y; y1 = y; break; } }
      }
      const caja = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
      Object.assign(caja, this.puntoDeApoyo(opaco, caja));
      return caja;
    });
  },

  // Componente conectado más grande (en una rejilla reducida a la mitad)
  puntoDeApoyo(opaco, c) {
    const P = 2;
    const gw = Math.ceil(c.w / P), gh = Math.ceil(c.h / P);
    const marca = new Int32Array(gw * gh).fill(-1);
    const lleno = new Uint8Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) {
      for (let gx = 0; gx < gw; gx++) {
        const x = c.x + gx * P, y = c.y + gy * P;
        if (opaco(Math.min(x, c.x + c.w - 1), Math.min(y, c.y + c.h - 1))) lleno[gy * gw + gx] = 1;
      }
    }
    let mejor = null;
    const pila = [];
    let id = 0;
    for (let i = 0; i < lleno.length; i++) {
      if (!lleno[i] || marca[i] >= 0) continue;
      let n = 0, sumX = 0, maxY = 0;
      pila.push(i); marca[i] = id;
      while (pila.length) {
        const k = pila.pop();
        const gx = k % gw, gy = (k / gw) | 0;
        n++; sumX += gx; if (gy > maxY) maxY = gy;
        const vecinos = [gx > 0 ? k - 1 : -1, gx < gw - 1 ? k + 1 : -1, gy > 0 ? k - gw : -1, gy < gh - 1 ? k + gw : -1];
        for (const v of vecinos) {
          if (v >= 0 && lleno[v] && marca[v] < 0) { marca[v] = id; pila.push(v); }
        }
      }
      if (!mejor || n > mejor.n) mejor = { n, sumX, maxY };
      id++;
    }
    if (!mejor) return { pieX: c.x + c.w / 2, pieY: c.y + c.h };
    return {
      pieX: Math.round(c.x + (mejor.sumX / mejor.n) * P),   // centro horizontal del cuerpo
      pieY: Math.min(c.y + c.h, c.y + mejor.maxY * P + P),  // parte inferior del cuerpo
    };
  },

  // Texto de cuadros_datos.js con lo detectado (para abrir con doble clic)
  exportar() {
    const salida = {};
    for (const [p, anims] of Object.entries(this.datos)) {
      salida[p] = {};
      for (const [a, d] of Object.entries(anims)) if (d.todos) salida[p][a] = d.todos;
    }
    return '/* Generado desde el visor de prueba-personajes.html. No editar a mano. */\n' +
      'window.CUADROS_RESPALDO = ' + JSON.stringify(salida) + ';\n';
  },
};
