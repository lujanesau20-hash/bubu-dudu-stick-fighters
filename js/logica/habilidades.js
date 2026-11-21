/* =====================================================================
   HABILIDADES H1..H4 (los valores están en CONFIG.habilidades)
   Cada habilidad crea golpes/proyectiles y, si hace falta, una "acción"
   que controla al jugador durante un momento (dash, caída en picada...).
   ===================================================================== */
const HABILIDADES = {
  // Intenta usar la habilidad i. Devuelve true si se usó.
  // ¿Es una habilidad de "espada rápida" (H1 y H2)? config/balance.js -> espadaRapida
  esRapida(i) {
    const er = typeof BALANCE !== 'undefined' && BALANCE.espadaRapida;
    return !!(er && er.habilidades.includes(i));
  },

  // Espada rápida: ¿puede salir otro corte de esta habilidad ahora?
  // (mínimo entre pulsaciones y máximo de cortes a la vez)
  // Devuelve 'si', 'doble' (pulsación demasiado pegada a la anterior: se descarta) o 'lleno' (ya hay 3)
  puedeCortar(j, i, m) {
    const er = BALANCE.espadaRapida;
    const ahora = m.tiempoReal ?? m.tiempo; // reloj que no se detiene en la pausa de impacto
    const lista = j.cortes || (j.cortes = [[], [], [], []]);
    const c = lista[i];
    while (c.length && ahora - c[0] >= er.duracionCorte) c.shift();
    if (c.length && ahora - c[c.length - 1] < er.intervaloMin - 1e-6) return 'doble';
    return c.length < er.maxCortes ? 'si' : 'lleno';
  },

  usar(j, i, m) {
    const h = CONFIG.habilidades[i];
    if (!h || j.enfriamientos[i] > 0) return false;
    const rapida = this.esRapida(i);
    const puede = rapida ? this.puedeCortar(j, i, m) : 'si';
    if (puede === 'doble') return false; // doble registro de la misma pulsación
    if (puede === 'lleno') {
      // Ya hay 3 cortes: este queda guardado y sale apenas termine uno (Jugador.cortesEnEspera)
      (j.corteEnEspera || (j.corteEnEspera = [null, null, null, null]))[i] = m.tiempo;
      return false;
    }
    if (rapida && j.corteEnEspera) j.corteEnEspera[i] = null;
    if (j.energia < h.energia) { m.emitir('sinEnergia', { jugador: j.indice }); return false; }
    j.energia -= h.energia;
    j.enfriamientos[i] = h.enfriamiento;
    if (rapida) {
      // H1/H2 bloquean H3/H4 como antes, pero no otro corte de H1/H2
      j.cortes[i].push(m.tiempoReal ?? m.tiempo);
      if (!(j.bloqueoAtaque > 0) || j.bloqueoSoloRapidas) j.bloqueoSoloRapidas = true;
      j.bloqueoAtaque = Math.max(j.bloqueoAtaque, h.bloqueo || 0);
    } else {
      j.bloqueoAtaque = h.bloqueo || 0;
      j.bloqueoSoloRapidas = false;
    }
    j.ultimaHabilidad = { indice: i, tiempo: m.tiempo, energia: h.energia };
    // Daño con las mejoras de la tienda de ESTE personaje (en versus, siempre el base)
    const g0 = m.golpes.length, p0 = m.proyectiles.length;
    this[h.id](j, MEJORAS.conDanio(h, MEJORAS.factor(j, i)), m);
    // Lo que creó esta habilidad roba vida (config/balance.js -> roboVida); los combos no se marcan
    for (let k = g0; k < m.golpes.length; k++) m.golpes[k].habilidad = i;
    for (let k = p0; k < m.proyectiles.length; k++) m.proyectiles[k].habilidad = i;
    return true;
  },

  // H1: saltito + cuchilla lanzada hacia adelante
  cuchilla(j, h, m) {
    const er = BALANCE.espadaRapida;
    if (j.enSuelo) { j.vy = -h.saltito; j.tSaltito = m.tiempo; }
    else if (!(m.tiempo - (j.tSaltito ?? -9) < er.saltitoAireCada)) { j.vy = Math.min(j.vy, -h.saltito * 0.6); j.tSaltito = m.tiempo; }
    j.anim.ataque = 1;
    j.animDisparo = { nombre: 'lanzar_cuchilla', t: m.tiempo, vel: er.velocidadAnim };
    m.agregarProyectil(new Proyectil({
      duenio: j, tipo: 'cuchilla', x: j.x + j.dir * 30, y: j.y - j.alto * 0.55,
      vx: j.dir * h.velocidad, radio: 16, danio: h.danio, vida: 0.8,
      empujeX: h.empuje, empujeY: 90, color: '#dfe9f5',
    }));
    m.emitir('lanzar', { x: j.x + j.dir * 30, y: j.y - j.alto * 0.55 });
  },

  // H2: corte de espada en arco frente al jugador
  tajo(j, h, m) {
    j.anim.ataque = 1;
    const er = BALANCE.espadaRapida;
    j.animDisparo = { nombre: 'espada', t: m.tiempo, vel: er.velocidadAnim };
    if (Math.abs(j.vx) < CONFIG.jugador.velocidad) j.vx += j.dir * 140; // varios cortes seguidos no lo lanzan lejos
    // Cada corte es un golpe propio: no golpea dos veces al mismo enemigo, pero otro corte sí
    m.agregarGolpe(new Golpe({
      duenio: j, seguir: j, offX: h.alcance / 2 + 8, offY: -j.alto * 0.5, w: h.alcance + 24, h: 120,
      danio: h.danio, empujeX: h.empuje, empujeY: 230, duracion: 0.12, color: '#bfefff',
    }));
    m.emitir('arco', { jugador: j.indice, dir: j.dir, radio: h.alcance, color: '#bfefff', duracion: Math.round(22 / er.velocidadAnim) / 100 });
  },

  // H3: dash relámpago, atraviesa y daña
  dash(j, h, m) {
    j.vx = (j.dir * h.distancia) / h.duracion;
    j.vy = 0;
    j.iniciarAccion({
      tipo: 'dash', invulnerable: true, sinGravedad: true,
      actualizar(jj, dt) {
        jj.vy = 0;
        if (this.t >= h.duracion) { jj.vx *= 0.25; return true; }
        return false;
      },
    });
    m.agregarGolpe(new Golpe({
      duenio: j, seguir: j, offX: 0, offY: -j.alto / 2, w: j.ancho + 80, h: j.alto + 24, empujon: true,
      retroceso: h.retroceso, aturdimiento: h.aturdimiento, // config/balance.js -> habilidades (0 = sin empujón ni pausa)
      danio: h.danio, empujeX: h.empuje, empujeY: 260, duracion: h.duracion + 0.04, color: '#ffe066',
    }));
    m.emitir('dash', { jugador: j.indice, x: j.x, y: j.y - j.alto / 2, dir: j.dir });
  },

  // H4: onda de choque. En el aire, primero cae en picada.
  onda(j, h, m) {
    j.animDisparo = { nombre: 'golpe_suelo', t: m.tiempo };
    if (j.enSuelo) { this.explotarOnda(j, h, m); return; }
    j.vx = 0; j.vy = 1700;
    j.iniciarAccion({
      tipo: 'picada', invulnerable: true,
      actualizar(jj) {
        jj.vy = Math.max(jj.vy, 1700); jj.vx = 0;
        if (jj.enSuelo) { HABILIDADES.explotarOnda(jj, h, m); return true; }
        return this.t > 2;
      },
    });
  },

  explotarOnda(j, h, m) {
    const g = new Golpe({
      duenio: j, forma: 'circulo', x: j.x, y: j.y - 30, r: h.radio, radial: true, area: true, empujon: true,
      danio: h.danio, empujeX: h.empuje, empujeY: 480, duracion: 0.1, color: '#9fd8ff',
    });
    g.habilidad = 3; // H4 roba vida (también si cae en picada desde el aire)
    m.agregarGolpe(g);
    j.anim.sy = 0.55; j.anim.sx = 1.4;
    m.emitir('onda', { x: j.x, y: j.y, radio: h.radio, color: '#9fd8ff' });
    m.emitir('sacudir', { fuerza: 12 });
  },
};
