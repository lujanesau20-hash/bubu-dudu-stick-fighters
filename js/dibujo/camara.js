/* =====================================================================
   CÁMARA: una sola cámara que sigue a todos los jugadores activos,
   con zoom para que quepan los dos y sacudidas de pantalla.
   ===================================================================== */
class Camara {
  constructor() {
    this.x = 640; this.y = 360; this.zoom = 1;
    this.sacudida = 0;
    this.offX = 0; this.offY = 0;
    this.subida = 0;            // celular: cuánto subió la cámara por el personaje local (suave)
    this.subidaObjetivo = 0;
  }

  // anchoBase / altoBase = mundo visible con zoom 1. celular = encuadre de celular
  // (mismo ancho que una laptop 16:10; ver Render.encuadreCelular). En laptop no cambia nada.
  objetivo(mundo, anchoBase, altoBase = CONFIG.vista.alto, celular = false) {
    let lista = mundo.jugadores.filter((j) => j.estado !== 'muerto');
    if (!lista.length) lista = mundo.jugadores;
    let minX = Infinity, maxX = -Infinity, sumY = 0;
    for (const j of lista) { minX = Math.min(minX, j.x); maxX = Math.max(maxX, j.x); sumY += j.y; }
    if (mundo.jefe && mundo.jefe.vivo && mundo.modo !== 'versus') {
      // Encuadrar un poco también al jefe
      const cxJ = mundo.jefe.x;
      if (Math.abs(cxJ - (minX + maxX) / 2) < anchoBase) { minX = Math.min(minX, cxJ - 80); maxX = Math.max(maxX, cxJ + 80); }
    }
    const separacion = maxX - minX + 420;
    let zoom = U.clamp((anchoBase * 0.95) / separacion, CONFIG.vista.zoomMinimo, 1);
    if (mundo.modo === 'versus') zoom = U.clamp(anchoBase / (mundo.ancho + 60), CONFIG.vista.zoomMinimo, 1);
    const anchoVis = anchoBase / zoom, altoVis = altoBase / zoom;
    let cx = (minX + maxX) / 2;
    // El suelo queda cerca de la parte de abajo (85% de la pantalla)...
    let cy = mundo.sueloY - altoVis * 0.35;
    if (celular) {
      // Celular: altura fija; sube un poco (máximo ≈ un personaje) solo si el personaje
      // LOCAL quedaría bajo el HUD o tocando el borde de arriba. Cada teléfono sigue al suyo.
      const ce = CONFIG.interfaz.encuadreCelular;
      cy = mundo.sueloY - altoVis * (ce.sueloEnPantalla - 0.5);
      const loc = mundo.jugadores[mundo.indiceLocal || 0] || lista[0];
      const lineaHud = cy - altoVis / 2 + altoVis * ce.franjaHud + ce.margenCabeza;
      // Cabeza del DIBUJO (el sprite es más alto que la zona de golpe)
      const cabeza = loc.y - Math.max(loc.alto || 0, CONFIG.jugador.altoSprite || 104);
      const falta = U.clamp(lineaHud - cabeza, 0, ce.subidaMax);
      // Zona muerta: cambios chicos no mueven la cámara (pero siempre vuelve del todo a 0)
      if (falta === 0 || falta === ce.subidaMax || Math.abs(falta - this.subidaObjetivo) > ce.zonaMuerta) this.subidaObjetivo = falta;
      cy -= this.subida;
    } else {
      // ...pero si alguien sube mucho, la cámara sube para no cortarle la cabeza
      const yMasAlto = Math.min(...lista.map((j) => j.y)) - 190;
      if (yMasAlto < cy - altoVis / 2) cy = yMasAlto + altoVis / 2;
    }
    cx = U.clamp(cx, anchoVis / 2 - 40, mundo.ancho - anchoVis / 2 + 40);
    if (anchoVis > mundo.ancho) cx = mundo.ancho / 2;
    return { x: cx, y: cy, zoom };
  }

  saltarA(mundo, anchoBase, altoBase, celular = false) {
    this.subida = 0; this.subidaObjetivo = 0;
    let o = this.objetivo(mundo, anchoBase, altoBase, celular);
    if (celular && this.subidaObjetivo) { this.subida = this.subidaObjetivo; o = this.objetivo(mundo, anchoBase, altoBase, celular); }
    this.x = o.x; this.y = o.y; this.zoom = o.zoom;
  }

  actualizar(dt, mundo, anchoBase, altoBase, celular = false) {
    // Subida vertical del celular: suave (lerp) hacia su objetivo
    if (celular) this.subida += (this.subidaObjetivo - this.subida) * Math.min(1, dt * CONFIG.interfaz.encuadreCelular.suavizado);
    else this.subida = 0;
    const o = this.objetivo(mundo, anchoBase, altoBase, celular);
    const k = Math.min(1, dt * 5);
    this.x += (o.x - this.x) * k;
    this.y += (o.y - this.y) * k;
    this.zoom += (o.zoom - this.zoom) * Math.min(1, dt * 3);
    this.sacudida = Math.max(0, this.sacudida - dt * 40);
    const s = this.sacudida;
    this.offX = (Math.random() * 2 - 1) * s;
    this.offY = (Math.random() * 2 - 1) * s;
  }

  sacudir(f) { this.sacudida = Math.max(this.sacudida, f); }
}
