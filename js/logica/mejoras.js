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

  // Lista de niveles limpia (7 números entre 0 y 5), venga de donde venga
  normalizar(arr) {
    const max = BALANCE.mejoras.niveles;
    return BALANCE.mejoras.lista.map((_, i) => {
      const n = Array.isArray(arr) ? Math.floor(+arr[i] || 0) : 0;
      return Math.max(0, Math.min(max, n));
    });
  },

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
    if (actual >= c.niveles) return null;
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
