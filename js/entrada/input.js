/* =====================================================================
   ENTRADA (teclado + mezcla con táctil)
   La lógica del juego NO lee el teclado directamente: recibe un
   EstadoControl por jugador en cada paso. Así se puede reemplazar la
   fuente (teclado, táctil o red) sin tocar la lógica.
   ===================================================================== */

// Estado de los controles de un jugador en un paso de la simulación
class EstadoControl {
  constructor() { this.reiniciar(); }

  reiniciar() {
    this.x = 0;                 // -1 izquierda, 1 derecha (analógico en táctil)
    this.abajo = false;         // agacharse
    this.saltoPulsado = false;  // se pulsó salto en este paso
    this.saltoMantenido = false;
    this.habilidades = [false, false, false, false]; // pulsadas en este paso
    this.combo = null;          // [i, j] si se deslizó entre dos botones (táctil)
    this.revivir = false;       // manteniendo la tecla de revivir
    return this;
  }

  // Versión compacta para enviar por la red (fase 2)
  aObjeto() {
    return { x: this.x, a: this.abajo, sp: this.saltoPulsado, sm: this.saltoMantenido,
      h: this.habilidades.slice(), c: this.combo, r: this.revivir };
  }

  static desdeObjeto(o) {
    const e = new EstadoControl();
    if (!o) return e;
    e.x = o.x; e.abajo = o.a; e.saltoPulsado = o.sp; e.saltoMantenido = o.sm;
    e.habilidades = o.h.slice(); e.combo = o.c; e.revivir = o.r;
    return e;
  }
}

class Entrada {
  constructor() {
    this.teclasAbajo = new Set();
    this.teclasPulsadas = new Set(); // pulsadas desde la última lectura
    this.mapas = [CONFIG.controles.solo];
    this.tactil = null;              // ControlesTactiles (se asigna desde main)
    this.fuentesRemotas = {};        // índice de jugador -> función que devuelve EstadoControl (red)

    // Todas las teclas que usa el juego (para evitar que la página haga scroll)
    this.teclasJuego = new Set();
    const c = CONFIG.controles;
    [c.solo, c.j1, c.j2].forEach((m) => {
      Object.values(m).flat(2).forEach((k) => this.teclasJuego.add(k));
    });
    c.generales.pausa.forEach((k) => this.teclasJuego.add(k));

    window.addEventListener('keydown', (e) => {
      if (this.teclasJuego.has(e.code)) e.preventDefault();
      if (!e.repeat) this.teclasPulsadas.add(e.code);
      this.teclasAbajo.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.teclasAbajo.delete(e.code));
    window.addEventListener('blur', () => this.teclasAbajo.clear());
  }

  // Define qué mapa de teclas usa cada jugador local
  configurar(mapas) {
    this.mapas = mapas;
    this.teclasPulsadas.clear();
  }

  algunaAbajo(lista) { return lista.some((k) => this.teclasAbajo.has(k)); }
  algunaPulsada(lista) { return lista.some((k) => this.teclasPulsadas.has(k)); }

  // Consume una tecla general (por ejemplo pausa) sin esperar a leer()
  consumir(lista) {
    const si = this.algunaPulsada(lista);
    if (si) lista.forEach((k) => this.teclasPulsadas.delete(k));
    return si;
  }

  // Devuelve un EstadoControl por jugador y limpia las pulsaciones
  leer(cantidadJugadores) {
    const estados = [];
    for (let i = 0; i < cantidadJugadores; i++) {
      if (this.fuentesRemotas[i]) { estados.push(this.fuentesRemotas[i]()); continue; }
      const m = this.mapas[i] || this.mapas[0];
      const e = new EstadoControl();
      if (m) {
        e.x = (this.algunaAbajo(m.derecha) ? 1 : 0) - (this.algunaAbajo(m.izquierda) ? 1 : 0);
        e.abajo = this.algunaAbajo(m.agachar);
        e.saltoPulsado = this.algunaPulsada(m.saltar);
        e.saltoMantenido = this.algunaAbajo(m.saltar);
        e.habilidades = m.habilidades.map((teclas) => this.algunaPulsada(teclas));
        e.revivir = this.algunaAbajo(m.revivir);
      }
      // El táctil controla al jugador 1
      if (i === 0 && this.tactil && this.tactil.activo) this.mezclarTactil(e, this.tactil.leer());
      estados.push(e);
    }
    this.teclasPulsadas.clear();
    return estados;
  }

  mezclarTactil(e, t) {
    if (Math.abs(t.x) > 0) e.x = t.x;
    e.abajo = e.abajo || t.abajo;
    e.saltoPulsado = e.saltoPulsado || t.saltoPulsado;
    e.saltoMantenido = e.saltoMantenido || t.saltoMantenido;
    for (let k = 0; k < 4; k++) e.habilidades[k] = e.habilidades[k] || t.habilidades[k];
    if (t.combo) e.combo = t.combo;
    e.revivir = e.revivir || t.revivir;
  }
}
