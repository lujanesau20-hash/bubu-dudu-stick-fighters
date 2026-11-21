/* =====================================================================
   MODO INFINITO (v1.18): oleadas sin fin en el mundo elegido.
   - Arma un escenario 'infinito-<mundo>' por cada mundo (isla, cielo, espacio,
     ciudad, jungla). Como el invitado en línea arma el mismo escenario por su
     nombre, no hace falta mandar nada nuevo por la red.
   - Agrega al Mundo: actualizarInfinito() y las fórmulas de daño y vida.
   - Números en config/balance.js -> BALANCE.infinito.
   El número de oleada viaja en "tramoActual" (ya iba en los snapshots), así el
   HUD del invitado muestra la misma oleada.
   ===================================================================== */
(function construirEscenariosInfinitos() {
  const bf = BALANCE.infinito;
  for (const mu of BALANCE.mundos) {
    const base = ESCENARIOS[mu.id] || ESCENARIOS.isla;
    const jefe = mu.id === 'isla' ? 'gigante' : (mu.niveles && mu.niveles[mu.niveles.length - 1].jefe) || base.jefe || 'gigante';
    const A = bf.anchoArena;
    ESCENARIOS['infinito-' + mu.id] = {
      nombre: `Infinito · ${mu.nombre}`,
      nombreCorto: '',
      infinito: true,
      mundo: mu.id,
      numero: 1,
      nivel: 1,
      // Vida y daño parten del enemigo del NIVEL 1 de ese mundo
      vidaBaseInfinito: mu.vida ? mu.vida[0] : BALANCE.enemigos.vidaBase,
      danioExtra: mu.danioExtra || 0,
      pesos: mu.pesos || BALANCE.isla.pesos,
      tiposMundo: Object.keys(mu.tiposDesde || BALANCE.isla.tiposDesde),
      colores: mu.colores || null,
      fondo: mu.fondo || base.fondo || 'isla',
      ancho: A,
      sueloY: base.sueloY || 620,
      enemigo: 'normal',
      tiposOleada: ['normal'],
      jefe,
      inicio: [A / 2 - 60, A / 2 + 20],
      plataformas: [
        { x: 260, y: 470, w: 230 }, { x: 620, y: 360, w: 210 }, { x: 980, y: 455, w: 240 },
        { x: 1380, y: 360, w: 210 }, { x: 1720, y: 470, w: 230 },
      ],
      oleadas: [],
      zonaJefe: null,
    };
  }
})();

Object.assign(Mundo.prototype, {
  // Daño extra de los enemigos en la oleada n: +2 por oleada hasta la 5, +1 desde la 6
  extraDanioInfinito(n) {
    const bf = BALANCE.infinito;
    return bf.danioHasta5 * Math.min(Math.max(0, n - 1), 4) + bf.danioDesde6 * Math.max(0, n - 5);
  },

  // Daño de un golpe enemigo en el modo infinito, con tope según la vida del jugador
  danioInfinito(base, atacante, obj) {
    const bf = BALANCE.infinito;
    const vidaMax = (obj && obj.vidaMax) || BALANCE.jugador.vidaMax;
    if (atacante.esJefe) {
      const d = base * (atacante.factorDanio || 1);
      return Math.max(1, Math.min(d, vidaMax * bf.topeDanioJefe));
    }
    const d = base + (this.escenario.danioExtra || 0) + this.extraDanioInfinito(this.inf ? this.inf.oleada : 1);
    return Math.max(1, Math.min(d, vidaMax * bf.topeDanio));
  },

  // Vida del enemigo en la oleada n: la del nivel 1 del mundo x1.05 por oleada
  vidaInfinito(n) {
    return Math.round(this.escenario.vidaBaseInfinito * Math.pow(BALANCE.infinito.vidaPorOleada, Math.max(0, n - 1)));
  },

  actualizarInfinito(dt) {
    const bf = BALANCE.infinito, bi = BALANCE.isla;
    const inf = this.inf || (this.inf = { oleada: 0, fase: 'pausa', t: 1.2, porSalir: 0, aves: 0, n: 0, total: 0, k: 0, tSalida: 0, jefes: 0 });
    this.limiteIzq = 0; this.limiteDer = this.ancho;
    const vivos = this.enemigos.filter((e) => e.vivo).length;

    if (inf.fase === 'pausa') {
      // El jefe derrotado de la oleada anterior se quita (sus monedas ya cayeron)
      if (this.jefe && !this.jefe.vivo && this.jefe.tiempoMuerto > 2) this.jefe = null;
      inf.t -= dt;
      if (inf.t <= 0) this.empezarOleadaInfinita(inf.oleada + 1);
      return;
    }

    // Van entrando de a poco, sin pasar el máximo de vivos (las aves también cuentan)
    inf.tSalida -= dt;
    if (inf.tSalida <= 0 && vivos < bi.maxVivos) {
      if (inf.aves > 0) {
        this.crearEnemigo('ave', inf.k++ % 5); inf.aves--; inf.tSalida = 0.12;
      } else if (inf.porSalir > 0) {
        let tipo;
        if (inf.plan.has(inf.n) && this.distanciaVivos() < BALANCE.distancia.maxVivos) tipo = this.tipoInfinito('distancia');
        else {
          if (inf.plan.has(inf.n) && inf.n + 1 < inf.total) inf.plan.add(inf.n + 1); // pasa al siguiente
          tipo = this.tipoInfinito('cerca');
        }
        this.crearEnemigo(tipo, inf.k++ % 5);
        inf.n++; inf.porSalir--; inf.tSalida = 0.12;
      }
    }

    // ¿Terminó la oleada? (todos salieron y no queda nadie vivo, jefe incluido)
    const jefeVivo = this.jefe && this.jefe.vivo;
    if (inf.porSalir <= 0 && inf.aves <= 0 && vivos === 0 && !jefeVivo) {
      inf.fase = 'pausa';
      inf.t = bf.pausaEntreOleadas;
      this.curarOleada();
      this.emitir('texto', { x: this.jugadores[0].x, y: this.jugadores[0].y - 150, texto: `¡Oleada ${inf.oleada} superada!`, color: '#ffd84d', grande: true });
    }
  },

  empezarOleadaInfinita(n) {
    const bf = BALANCE.infinito, bi = BALANCE.isla;
    const inf = this.inf;
    inf.oleada = n;
    inf.fase = 'oleada';
    this.tramoActual = n;        // viaja en los snapshots: el invitado ve la misma oleada
    this.indiceOleada = n;
    // Más rápidos y (los arqueros) con más cadencia en cada oleada, con tope
    this.multVelocidadExtra = 1 + Math.min(bf.velocidadMax, bf.velocidadPorOleada * (n - 1));
    this.multCadencia = 1 + Math.min(bf.cadenciaMax, bf.cadenciaPorOleada * (n - 1));
    this.vidaInf = this.vidaInfinito(n);
    inf.k = 0; inf.n = 0; inf.tSalida = 0.3;

    if (bf.jefeCada > 0 && n % bf.jefeCada === 0) {
      // Oleada de JEFE: cada jefe más fuerte que el anterior
      inf.jefes = Math.floor(n / bf.jefeCada);
      const f = Math.pow(bf.jefeFactor, inf.jefes - 1);
      const mv = this.modo === 'pareja' ? CONFIG.multiplicadorPareja.vidaJefe : 1;
      const vivosJ = this.jugadores.filter((j) => j.vivo);
      const cx = vivosJ.length ? vivosJ.reduce((s, j) => s + j.x, 0) / vivosJ.length : this.ancho / 2;
      const xj = cx < this.ancho / 2 ? Math.min(this.ancho - 160, cx + 520) : Math.max(160, cx - 520);
      this.jefe = new Jefe(this, this.escenario.jefe, xj, -400, mv);
      this.jefe.vida = this.jefe.vidaMax = Math.round(this.vidaInf * BALANCE.enemigos.multiplicadorJefe * f * mv);
      this.jefe.factorDanio = f;
      this.jefe.cfg.monedas = bf.monedasJefe; // +60 monedas al derrotarlo
      this.tRefuerzo = 0;
      inf.porSalir = 0; inf.aves = 0; inf.total = 0; inf.plan = new Set();
      this.emitir('banner', { texto: `OLEADA ${n}`, sub: '¡Llega un jefe!', color: '#ff922b' });
      return;
    }
    const mult = this.modo === 'pareja' ? CONFIG.multiplicadorPareja.enemigos : 1;
    inf.total = Math.min(bi.maxPorOleada, Math.round((bf.enemigosBase + bf.enemigosPorOleada * (n - 1)) * mult));
    inf.porSalir = inf.total;
    inf.aves = Math.min(bf.avesMax, Math.floor(n / bf.avesCada));
    // Cuántos salen a distancia y en qué orden
    const frac = Math.min(bf.distanciaMax, bf.distanciaInicial + bf.distanciaPorOleada * (n - 1));
    const cant = Math.min(inf.total, Math.round(inf.total * frac));
    inf.plan = new Set();
    while (inf.plan.size < cant) inf.plan.add(Math.floor(this.rng() * inf.total));
    this.emitir('banner', { texto: `OLEADA ${n}`, sub: '', color: '#ffffff' });
  },

  // Tipo de enemigo según la oleada (los del mundo, con sus frecuencias)
  tipoInfinito(clase) {
    const bf = BALANCE.infinito;
    const n = this.inf ? this.inf.oleada : 1;
    let tipos = this.escenario.tiposMundo.filter((t) => n >= (bf.tiposDesde[t] || 1));
    const filtrados = tipos.filter((t) => (clase === 'distancia') === this.esDistancia(t));
    tipos = filtrados.length ? filtrados : (clase === 'distancia' ? ['arquero'] : ['normal']);
    const pesos = this.escenario.pesos;
    const total = tipos.reduce((s, t) => s + (pesos[t] || 1), 0);
    let r = this.rng() * total;
    for (const t of tipos) { r -= pesos[t] || 1; if (r <= 0) return t; }
    return tipos[0];
  },

  // Curación al terminar cada oleada (por defecto la misma que al limpiar un tramo)
  curarOleada() {
    const bf = BALANCE.infinito;
    const k = bf.curaOleada != null ? bf.curaOleada : BALANCE.jugador.curaPorTramo || 0;
    if (k <= 0) return;
    for (const j of this.jugadores) {
      if (!j.vivo || j.vida >= j.vidaMax) continue;
      const antes = j.vida;
      j.vida = Math.min(j.vidaMax, j.vida + j.vidaMax * k);
      this.emitir('curar', { jugador: j.indice, x: j.x, y: j.y - j.alto - 10, cantidad: Math.round(j.vida - antes) });
    }
  },
});
