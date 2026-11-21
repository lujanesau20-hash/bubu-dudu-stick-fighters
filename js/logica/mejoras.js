/* =====================================================================
   MEJORAS DE DAÑO (pestaña "Mejoras" de la tienda) — solo lógica.
   Los números están en config/balance.js -> BALANCE.mejoras.
   - Una mejora por habilidad (H1..H4 y los 3 combos), POR PERSONAJE.
   - Cada nivel sube el daño un 20% del daño base (nivel 5 = base x 2).
   - En línea, el líder calcula el daño: el invitado le manda sus mejoras
     (las de SU personaje) al conectarse, y el líder las usa para Dudu.
   ===================================================================== */
const MEJORAS = {
  cfg() { return BALANCE.mejoras; },
  cantidad() { return BALANCE.mejoras.lista.length; },
  vacias() { return BALANCE.mejoras.lista.map(() => 0); },

  // Niveles máximos de la mejora i (el robo de vida tiene 4; las de daño, 5)
  maximo(i) { const d = BALANCE.mejoras.lista[i]; return d && d.niveles != null ? d.niveles : BALANCE.mejoras.niveles; },

  // Lista de niveles limpia (un número por mejora, entre 0 y su máximo), venga de donde venga.
  // Guardados viejos (sin robo de vida) quedan con 0 en las mejoras nuevas.
  normalizar(arr) {
    return BALANCE.mejoras.lista.map((_, i) => {
      const n = Array.isArray(arr) ? Math.floor(+arr[i] || 0) : 0;
      return Math.max(0, Math.min(this.maximo(i), n));
    });
  },

  // Robo de vida: posición en la lista y porcentaje para un nivel
  indiceRobo() { return BALANCE.mejoras.lista.findIndex((d) => d.tipo === 'robo'); },
  porcentajeRobo(nivel) { const p = BALANCE.roboVida.porcentajes; return p[Math.max(0, Math.min(p.length - 1, nivel || 0))]; },

  // Multiplicador de daño para un nivel de mejora (0 = base)
  multiplicador(nivel) { return 1 + BALANCE.mejoras.subidaPorNivel * (nivel || 0); },

  // Daño base de la mejora i (Torbellino: daño total de sus golpes)
  danioBase(i) {
    const d = BALANCE.mejoras.lista[i];
    return d.tipo === 'combo' ? BALANCE.combos[d.indice].danio : BALANCE.habilidades[d.indice].danio;
  },
  danioConNivel(i, nivel) { return Math.round(this.danioBase(i) * this.multiplicador(nivel)); },

  // Precio para subir del nivel "actual" al siguiente (null si ya está al máximo)
  precio(i, actual) {
    const c = BALANCE.mejoras;
    if (actual >= this.maximo(i)) return null;
    if (c.lista[i].precios) return c.lista[i].precios[actual]; // precio fijo de cada compra (robo de vida)
    const r = c.redondeoPrecio || 1;
    return Math.round((c.lista[i].precioBase * Math.pow(c.crecimientoPrecio, actual)) / r) * r;
  },

  // La pestaña se abre al completar el nivel indicado (nivel 5 de la Isla)
  desbloqueada() {
    const id = BALANCE.mejoras.desbloqueaAlSuperar;
    return !id || (typeof Guardado !== 'undefined' && Guardado.datos && Guardado.datos.nivelesSuperados.includes(id));
  },

  // Mejoras guardadas en ESTE dispositivo para un personaje
  guardadas(personaje) {
    const g = typeof Guardado !== 'undefined' && Guardado.datos && Guardado.datos.mejoras;
    return this.normalizar(g && g[personaje]);
  },

  // Niveles que usa un jugador del mundo
  paraJugador(mundo, personaje, indice) {
    if (mundo.modo === 'versus' && !(BALANCE.versus && BALANCE.versus.usarMejoras)) return this.vacias();
    // En línea, el líder simula al invitado (jugador 2) con las mejoras que mandó el invitado
    if (typeof EnLinea !== 'undefined' && EnLinea.esAnfitrion && indice === 1) return this.normalizar(EnLinea.mejorasInvitado);
    return this.guardadas(personaje);
  },

  // Factor de daño de un jugador para la mejora i (0..3 habilidades, 4..6 combos)
  factor(j, i) {
    return j && j.mejoras ? this.multiplicador(j.mejoras[i]) : 1;
  },

  // Copia de la definición con el daño ya multiplicado (área, maná y tiempos iguales)
  conDanio(def, f) {
    return f === 1 ? def : Object.assign({}, def, { danio: def.danio * f });
  },
};
