/* =====================================================================
   MUNDO 1: ISLA FLOTANTE EN 10 NIVELES
   Se construyen a partir de los DATOS de config/balance.js (BALANCE.isla):
   un nivel es una secuencia de tramos y cada tramo una secuencia de oleadas.
   Cada nivel queda en ESCENARIOS como 'isla-1' ... 'isla-10'.
   El orden de juego (ORDEN_NIVELES) pasa a ser:
     isla-1 ... isla-10, cielo, espacio, ciudad
   y cada uno se desbloquea al superar el anterior.
   ===================================================================== */
(function construirNivelesIsla() {
  const bi = BALANCE.isla;
  const base = ESCENARIOS.isla;
  const A = bi.anchoTramo;

  bi.niveles.forEach((def, i) => {
    const nivel = i + 1;
    const rng = U.crearAleatorio(1000 + nivel * 37);
    const tramos = [];
    const plataformas = [];
    for (let t = 0; t < def.tramos; t++) {
      const gatillo = 520 + t * A;
      // Oleadas del tramo: base x m, m = 1 + 0.12 (tramo-1) + 0.06 (nivel-1)
      const m = 1 + bi.crecimientoTramo * t + bi.crecimientoNivel * (nivel - 1);
      const fases = bi.oleadasBase.map((n) => Math.min(bi.maxPorOleada, Math.round(n * m)));
      tramos.push({ gatillo, zona: [Math.max(0, gatillo - 700), gatillo + 900], fases });
      // Tres islitas por tramo, con alturas variadas
      plataformas.push(
        { x: gatillo + 110 + rng() * 40, y: 470 - rng() * 20, w: 210 + rng() * 40 },
        { x: gatillo + 440 + rng() * 40, y: 360 + rng() * 30, w: 180 + rng() * 40 },
        { x: gatillo + 760 + rng() * 40, y: 455 - rng() * 20, w: 200 + rng() * 40 },
      );
    }
    const ultimo = 520 + (def.tramos - 1) * A;
    let ancho = ultimo + 1000;
    let zonaJefe = null;
    if (def.jefe) {
      const g = 520 + def.tramos * A + 300;
      ancho = g + 1150;
      zonaJefe = { gatillo: g, zona: [g - 250, ancho] };
      // Arena del jefe como en la isla original
      plataformas.push({ x: g + 150, y: 455, w: 210 }, { x: g + 730, y: 455, w: 210 });
    }
    // Las islitas no pasan del final del mapa
    const plats = plataformas.filter((p) => p.x + p.w < ancho - 40).map((p) => ({ x: Math.round(p.x), y: Math.round(p.y), w: Math.round(p.w) }));

    // Tipos de enemigo permitidos en este nivel
    const tipos = Object.keys(bi.tiposDesde).filter((t) => nivel >= bi.tiposDesde[t]);

    ESCENARIOS['isla-' + nivel] = {
      nombre: `Isla Flotante · Nivel ${nivel}`,
      nombreCorto: `Nivel ${nivel}`,
      mundo: 'isla',
      numero: nivel,
      nivel,                         // para la vida de los enemigos
      fondo: base.fondo,
      ancho,
      sueloY: base.sueloY,
      enemigo: 'normal',
      tiposOleada: tipos,
      jefe: def.jefe || null,
      vidaJefe: def.vidaJefe || null, // vida fija del jefe (si no, 10 x enemigo del nivel)
      inicio: base.inicio.slice(),
      plataformas: plats,
      oleadas: tramos,               // cada elemento es un TRAMO con sus "fases" (oleadas)
      zonaJefe,
    };
  });

  // Nivel de vida de los otros mundos (configurable)
  for (const mu of BALANCE.mundos) {
    if (ESCENARIOS[mu.id] && mu.nivelVida) Object.assign(ESCENARIOS[mu.id], { nivel: mu.nivelVida, mundo: mu.id, numero: 1 });
  }

  // Nuevo orden de la campaña
  const orden = [...bi.niveles.map((_, i) => 'isla-' + (i + 1)), ...BALANCE.mundos.filter((m) => m.id !== 'isla').map((m) => m.id)];
  ORDEN_NIVELES.splice(0, ORDEN_NIVELES.length, ...orden);
})();

// ---------- Ayudas para menús y progreso ----------
const PROGRESO = {
  superado(id) { return Guardado.datos.nivelesSuperados.includes(id); },
  // Un nivel se desbloquea al superar el anterior (el primero siempre está abierto)
  desbloqueado(id) {
    const i = ORDEN_NIVELES.indexOf(id);
    if (i <= 0) return i === 0;
    return this.superado(ORDEN_NIVELES[i - 1]);
  },
  nivelesDeMundo(mundo) { return ORDEN_NIVELES.filter((id) => (ESCENARIOS[id].mundo || id) === mundo); },
  mundoDesbloqueado(mundo) { return this.desbloqueado(this.nivelesDeMundo(mundo)[0]); },
  // Para mostrar qué mundo hay que terminar antes
  mundoAnterior(mundo) {
    const i = BALANCE.mundos.findIndex((m) => m.id === mundo);
    return i > 0 ? BALANCE.mundos[i - 1] : null;
  },
  // Primer nivel sin superar (para elegirlo por defecto)
  siguientePendiente() {
    return ORDEN_NIVELES.find((id) => this.desbloqueado(id) && !this.superado(id)) || ORDEN_NIVELES[0];
  },
};
