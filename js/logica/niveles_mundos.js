/* =====================================================================
   MUNDOS 2 A 5 EN 10 NIVELES CADA UNO (v1.10)
   Se construyen igual que la Isla (js/logica/niveles_isla.js): cada nivel es
   una secuencia de TRAMOS y cada tramo una secuencia de OLEADAS.
   Los DATOS de cada mundo están en config/balance.js -> BALANCE.mundos
   (tramos, vida de enemigos, daño extra, tipos de enemigo, jefe, colores).
   Quedan en ESCENARIOS como 'cielo-1' ... 'cielo-10', 'espacio-1' ... 'jungla-10'.
   Orden de la campaña: isla-1..10, cielo-1..10, espacio-1..10, ciudad-1..10, jungla-1..10.
   Los niveles viejos de un solo nivel ('cielo', 'espacio', 'ciudad') siguen en
   ESCENARIOS pero ya no están en el orden de juego.
   ===================================================================== */
(function construirNivelesMundos() {
  const bi = BALANCE.isla;
  const A = bi.anchoTramo;

  for (const mu of BALANCE.mundos) {
    if (!mu.niveles) continue; // la Isla se arma en niveles_isla.js
    const base = ESCENARIOS[mu.id] || ESCENARIOS.isla;
    const N = mu.niveles.length;
    mu.niveles.forEach((def, i) => {
      const nivel = i + 1;
      const rng = U.crearAleatorio(5000 + mu.id.length * 911 + nivel * 37);
      const tramos = [];
      const plataformas = [];
      for (let t = 0; t < def.tramos; t++) {
        const gatillo = 520 + t * A;
        // Oleadas del tramo: las mismas reglas que en la Isla
        const m = 1 + bi.crecimientoTramo * t + bi.crecimientoNivel * (nivel - 1);
        const fases = bi.oleadasBase.map((n) => Math.min(bi.maxPorOleada, Math.round(n * m)));
        tramos.push({ gatillo, zona: [Math.max(0, gatillo - 700), gatillo + 900], fases });
        plataformas.push(
          { x: gatillo + 110 + rng() * 40, y: 470 - rng() * 20, w: 210 + rng() * 40 },
          { x: gatillo + 440 + rng() * 40, y: 360 + rng() * 30, w: 180 + rng() * 40 },
          { x: gatillo + 760 + rng() * 40, y: 455 - rng() * 20, w: 200 + rng() * 40 },
        );
      }
      const ultimo = 520 + (def.tramos - 1) * A;
      let ancho = ultimo + 1000;
      let zonaJefe = null;
      const jefe = def.jefe || null;
      if (jefe) {
        const g = 520 + def.tramos * A + 300;
        ancho = g + 1150;
        zonaJefe = { gatillo: g, zona: [g - 250, ancho] };
        plataformas.push({ x: g + 150, y: 455, w: 210 }, { x: g + 730, y: 455, w: 210 });
      }
      const plats = plataformas.filter((p) => p.x + p.w < ancho - 40).map((p) => ({ x: Math.round(p.x), y: Math.round(p.y), w: Math.round(p.w) }));
      const tipos = Object.keys(mu.tiposDesde).filter((t) => nivel >= mu.tiposDesde[t]);
      // Vida del enemigo normal: de vida[0] (nivel 1) a vida[1] (nivel 10), creciendo parejo
      const vidaEnemigo = BALANCE.vidaMundo(mu, nivel);

      ESCENARIOS[mu.id + '-' + nivel] = {
        nombre: `${mu.nombre} · Nivel ${nivel}`,
        nombreCorto: `Nivel ${nivel}`,
        mundo: mu.id,
        numero: nivel,
        nivel,                          // número que se muestra ("Nivel 3")
        vidaEnemigo,                    // vida de los enemigos de este nivel (config/balance.js -> mundos)
        vidaJefe: jefe ? def.vidaJefe || Math.round(vidaEnemigo * BALANCE.enemigos.multiplicadorJefe) : null,
        danioExtra: mu.danioExtra || 0, // daño extra de los enemigos de este mundo (se suma al de cada tramo)
        distanciaExtra: mu.distanciaExtra || 0,
        pesos: mu.pesos,
        colores: mu.colores || null,    // colores propios de los enemigos de este mundo
        fondo: mu.fondo || base.fondo,
        ancho,
        sueloY: base.sueloY || 620,
        enemigo: 'normal',
        tiposOleada: tipos,
        jefe,
        inicio: (base.inicio || [180, 260]).slice(),
        plataformas: plats,
        oleadas: tramos,
        zonaJefe,
        total: N,
      };
    });
  }

  // Orden de la campaña: los 10 niveles de cada mundo, mundo tras mundo
  const orden = [];
  for (const mu of BALANCE.mundos) {
    const n = mu.niveles ? mu.niveles.length : BALANCE.isla.niveles.length;
    for (let i = 1; i <= n; i++) if (ESCENARIOS[mu.id + '-' + i]) orden.push(mu.id + '-' + i);
  }
  ORDEN_NIVELES.splice(0, ORDEN_NIVELES.length, ...orden);
})();

// ---------- Guardados viejos ----------
// Antes, Cielo, Espacio y Ciudad tenían UN nivel ('cielo', 'espacio', 'ciudad').
// Si el jugador ya lo había superado, se marcan superados sus 10 niveles nuevos (no pierde nada).
PROGRESO.migrar = function (datos) {
  if (!datos || !Array.isArray(datos.nivelesSuperados)) return false;
  let cambio = false;
  for (const mu of BALANCE.mundos) {
    if (!mu.niveles || !datos.nivelesSuperados.includes(mu.id)) continue;
    for (let i = 1; i <= mu.niveles.length; i++) {
      const id = mu.id + '-' + i;
      if (!datos.nivelesSuperados.includes(id)) { datos.nivelesSuperados.push(id); cambio = true; }
    }
  }
  return cambio;
};

// ---------- Carga diferida del fondo de los mundos nuevos ----------
// El fondo de la Jungla no se descarga al abrir el juego (no pesa en la carga inicial):
// se pide en segundo plano unos segundos después, o en cuanto se elige un nivel de ese mundo.
// Mientras no llega, se dibuja el fondo de la Isla.
const CARGA_MUNDOS = {
  archivos: { jungla: 'js/dibujo/fondo_jungla.js' },
  pedidos: {},
  asegurar(fondo) {
    const archivo = this.archivos[fondo];
    if (!archivo || this.pedidos[fondo] || typeof document === 'undefined') return;
    if (typeof FONDOS !== 'undefined' && FONDOS[fondo]) return;
    this.pedidos[fondo] = true;
    const s = document.createElement('script');
    s.src = archivo + '?v=' + encodeURIComponent(typeof VERSION_JUEGO !== 'undefined' ? VERSION_JUEGO : '');
    s.async = true;
    s.onerror = () => { this.pedidos[fondo] = false; }; // se puede volver a intentar
    document.head.appendChild(s);
  },
  // En segundo plano, cuando la página ya está quieta
  precargar() { for (const f of Object.keys(this.archivos)) this.asegurar(f); },
};
if (typeof window !== 'undefined') window.addEventListener('load', () => setTimeout(() => CARGA_MUNDOS.precargar(), 4000));
