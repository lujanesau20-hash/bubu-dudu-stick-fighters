/* =====================================================================
   MUNDO: toda la simulación del juego (sin dibujo ni teclado).
   Recibe controles -> actualiza -> emite "eventos" que el dibujo usa
   para efectos y sonidos. Esto permite conectar un servidor después.
   ===================================================================== */
class Mundo {
  // opciones: { modo: 'solo'|'pareja'|'versus', personajes: ['bubu', 'dudu'], escenario: 'isla' }
  constructor(opciones) {
    this.modo = opciones.modo;
    this.rng = U.crearAleatorio(opciones.semilla || 20240607);
    this.tiempo = 0;
    this.eventos = [];
    this.jugadores = [];
    this.enemigos = [];
    this.proyectiles = [];
    this.golpes = [];
    this.monedas = [];
    this.corazones = [];         // corazones de curación
    this.tCorazon = 0;           // segundos de juego desde el último corazón
    this.jefe = null;
    this.congelar = 0;           // pausa de impacto (hit-stop)
    this.escalaTiempo = 1;       // cámara lenta
    this.estado = 'jugando';     // jugando | victoria | derrota | finVersus
    this.tiempoFin = 0;
    this.monedasGanadas = 0;
    this.revivesUsados = 0;

    const datos = this.modo === 'versus'
      ? ARENAS_VERSUS[opciones.escenario] || ARENAS_VERSUS.isla
      : ESCENARIOS[opciones.escenario] || ESCENARIOS.isla;
    this.escenarioId = opciones.escenario;
    // Número de nivel (1, 2, 3...) para la vida de enemigos y jefes
    this.nivel = Math.max(1, (typeof ORDEN_NIVELES !== 'undefined' ? ORDEN_NIVELES.indexOf(opciones.escenario) : 0) + 1);
    this.escenario = datos;
    this.ancho = datos.ancho;
    this.sueloY = datos.sueloY;
    this.plataformas = datos.plataformas.map((p) => ({ ...p }));
    this.limiteIzq = 0;
    this.limiteDer = this.ancho;

    // Oleadas
    this.indiceOleada = 0;
    this.oleada = null;
    this.avisoAvanzar = 0;

    // Versus
    this.rondas = [0, 0];
    this.ronda = 1;
    this.finRonda = 0;

    opciones.personajes.forEach((p, i) => {
      this.jugadores.push(new Jugador(this, p, i, datos.inicio[i] ?? datos.inicio[0] + i * 80, this.sueloY));
    });
    if (this.modo === 'versus') this.emitir('banner', { texto: 'RONDA 1', sub: '¡A pelear!', color: '#ffffff' });
  }

  emitir(tipo, datos = {}) { datos.tipo = tipo; this.eventos.push(datos); }
  agregarGolpe(g) { this.golpes.push(g); }
  agregarProyectil(p) { this.proyectiles.push(p); }

  // ---------- Física compartida (jugadores y enemigos) ----------
  moverCuerpo(e, dt, sinGravedad = false) {
    const f = CONFIG.fisica;
    if (!sinGravedad) e.vy = Math.min(e.vy + f.gravedad * dt, f.velocidadCaidaMax);

    e.x += e.vx * dt;
    // Jugadores y enemigos (tienen cfg) se quedan dentro de la zona cerrada de la oleada o del jefe
    const enZona = e.esJugador || !!e.cfg;
    const izq = enZona ? this.limiteIzq : 0;
    const der = enZona ? this.limiteDer : this.ancho;
    const medio = e.ancho / 2;
    if (e.x < izq + medio) { e.x = izq + medio; if (e.vx < 0) e.vx = 0; }
    if (e.x > der - medio) { e.x = der - medio; if (e.vx > 0) e.vx = 0; }

    const yAntes = e.y;
    e.y += e.vy * dt;
    e.enSuelo = false;
    e.plataforma = null;
    if (e.vy >= 0) {
      if (e.y >= this.sueloY) {
        e.y = this.sueloY; e.vy = 0; e.enSuelo = true;
      } else if (this.tiempo >= (e.ignorarPlataformasHasta || 0)) {
        for (const p of this.plataformas) {
          if (e.x + medio > p.x && e.x - medio < p.x + p.w && yAntes <= p.y + 1 && e.y >= p.y) {
            e.y = p.y; e.vy = 0; e.enSuelo = true; e.plataforma = p;
            break;
          }
        }
      }
    }
  }

  // ---------- Objetivos y daño ----------
  objetivosDe(duenio) {
    if (duenio.esJugador) {
      if (this.modo === 'versus') return this.jugadores.filter((j) => j !== duenio && j.vivo);
      const lista = this.enemigos.filter((e) => e.vivo);
      if (this.jefe && this.jefe.vivo) lista.push(this.jefe);
      return lista;
    }
    return this.jugadores.filter((j) => j.vivo);
  }

  aplicarDanio(obj, danio, info) {
    if (this.modo === 'versus') danio *= CONFIG.versus.multiplicadorDanio;
    danio = Math.round(danio);
    if (!obj.recibirDanio(danio, info)) return;
    const a = info.atacante;
    if (a && a.esJugador) a.energia = Math.min(CONFIG.energia.max, a.energia + CONFIG.energia.porGolpe);
    this.congelar = Math.max(this.congelar, Math.min(0.09, 0.025 + danio * 0.0012));
    this.emitir('impacto', { x: info.x, y: info.y, danio, color: info.color, aJugador: !!obj.esJugador });
    if (danio >= 30) this.emitir('sacudir', { fuerza: Math.min(14, danio / 4) });
  }

  jugadorMasCercano(x, y) {
    let mejor = null, dMin = Infinity;
    for (const j of this.jugadores) {
      if (!j.vivo) continue;
      const d = Math.abs(j.x - x) + Math.abs(j.y - y) * 0.5;
      if (d < dMin) { dMin = d; mejor = j; }
    }
    return mejor;
  }

  soltarMonedas(x, y, cantidad) {
    for (let i = 0; i < cantidad; i++) {
      this.monedas.push({ x, y, vx: this.rng.rango(-220, 220), vy: this.rng.rango(-650, -350), t: 0, valor: 1, ancho: 14, alto: 14, enSuelo: false });
    }
  }

  // ---------- Paso de simulación ----------
  actualizar(dt, controles) {
    if (this.congelar > 0) { this.congelar -= dt; return; }
    this.tiempo += dt;

    if (this.modo === 'pareja') this.actualizarRevivir(dt, controles);
    this.jugadores.forEach((j, i) => j.actualizar(dt, controles[i] || new EstadoControl()));
    if (this.modo === 'pareja') this.limitarSeparacion();

    for (const e of this.enemigos) e.actualizar(dt);
    this.enemigos = this.enemigos.filter((e) => !e.borrar);
    if (this.jefe) this.jefe.actualizar(dt);

    for (const p of this.proyectiles) p.actualizar(dt, this);
    this.proyectiles = this.proyectiles.filter((p) => p.vivo);
    for (const g of this.golpes) g.actualizar(dt, this);
    this.golpes = this.golpes.filter((g) => g.vivo);

    this.actualizarMonedas(dt);
    this.actualizarCorazones(dt);

    if (this.modo === 'versus') this.actualizarVersus(dt);
    else { this.actualizarOleadas(dt); this.comprobarFin(dt); }
  }

  // En pareja, Bubu y Dudu no pueden alejarse demasiado (una sola cámara)
  limitarSeparacion() {
    const activos = this.jugadores.filter((j) => j.estado !== 'muerto');
    if (activos.length < 2) return;
    const [a, b] = activos;
    const max = CONFIG.jugador.separacionMaxPareja;
    const d = b.x - a.x;
    if (Math.abs(d) > max) {
      const exceso = (Math.abs(d) - max) / 2;
      const s = Math.sign(d);
      if (a.vivo) a.x += s * exceso; else b.x -= s * exceso;
      if (b.vivo) b.x -= s * exceso; else a.x += s * exceso;
    }
  }

  // ---------- Revivir (modo pareja) ----------
  actualizarRevivir(dt, controles) {
    const cr = CONFIG.revivir;
    this.jugadores.forEach((j) => { j.reviviendo = false; });
    for (const caido of this.jugadores) {
      if (caido.estado !== 'caido') continue;
      const comp = this.jugadores.find((o) => o !== caido && o.vivo);
      const ctrl = comp ? controles[comp.indice] : null;
      const cerca = comp && Math.abs(comp.x - caido.x) <= cr.distancia && Math.abs(comp.y - caido.y) < 90;
      const quedan = this.revivesUsados < cr.maxPorNivel;
      if (cerca && quedan && ctrl && ctrl.revivir && !comp.accion) {
        // Si al que revive le hicieron daño hace muy poco, se interrumpe
        if (this.tiempo - comp.ultimoDanio < 0.05) {
          if (caido.progresoRevivir > 0) this.emitir('texto', { x: caido.x, y: caido.y - 80, texto: '¡Interrumpido!', color: '#ff7070' });
          caido.progresoRevivir = 0;
          continue;
        }
        comp.reviviendo = true;
        comp.dir = caido.x > comp.x ? 1 : -1;
        caido.progresoRevivir += dt;
        if (caido.progresoRevivir >= cr.tiempoRevivir) {
          caido.revivir();
          this.revivesUsados++;
          this.emitir('revivido', { jugador: caido.indice, x: caido.x, y: caido.y });
        }
      } else {
        caido.progresoRevivir = Math.max(0, caido.progresoRevivir - dt * 1.5);
      }
    }
  }

  // ---------- Monedas ----------
  actualizarMonedas(dt) {
    for (const c of this.monedas) {
      c.t += dt;
      const obj = c.t > 0.55 ? this.jugadorMasCercano(c.x, c.y) : null;
      if (obj) {
        // Imán hacia el jugador
        const dx = obj.x - c.x, dy = obj.y - obj.alto / 2 - c.y;
        const d = Math.hypot(dx, dy) || 1;
        const vel = 300 + c.t * 900;
        c.vx = (dx / d) * vel; c.vy = (dy / d) * vel;
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (d < 30) {
          c.recogida = true;
          this.monedasGanadas += c.valor;
          this.emitir('moneda', { x: c.x, y: c.y, valor: c.valor });
        }
      } else {
        c.vy += CONFIG.fisica.gravedad * dt;
        c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.y > this.sueloY - 7) { c.y = this.sueloY - 7; c.vy *= -0.45; c.vx *= 0.7; }
      }
    }
    this.monedas = this.monedas.filter((c) => !c.recogida);
  }

  // ---------- Corazones de curación (config/balance.js -> corazones) ----------
  actualizarCorazones(dt) {
    if (typeof BALANCE === 'undefined') return;
    const bc = BALANCE.corazones;
    if (this.modo === 'versus' && !bc.enVersus) return;
    if (this.estado !== 'jugando') return;

    // Cada "intervalo" segundos de juego cae un corazón cerca de los jugadores
    this.tCorazon += dt;
    if (this.tCorazon >= bc.intervalo) {
      this.tCorazon = 0;
      const vivos = this.jugadores.filter((j) => j.vivo);
      const base = vivos.length ? vivos.reduce((s, j) => s + j.x, 0) / vivos.length : this.ancho / 2;
      const x = U.clamp(base + this.rng.rango(-220, 220), this.limiteIzq + 60, this.limiteDer - 60);
      this.corazones.push({ x, y: this.sueloY - 760, vx: 0, vy: bc.velocidadCaida, ancho: 34, alto: 30, t: 0, enSuelo: false });
      this.emitir('corazonAparece', { x });
    }

    for (const c of this.corazones) {
      c.t += dt;
      if (!c.enSuelo) { c.vy = bc.velocidadCaida; this.moverCuerpo(c, dt, true); }
      // Lo recibe el primero que lo toque (y que no tenga la vida llena)
      const rc = U.rectDe(c);
      const j = this.jugadores.find((p) => p.vivo && p.vida < p.vidaMax && U.rectChoca(U.rectDe(p), rc));
      if (j) {
        const antes = j.vida;
        j.vida = Math.min(j.vidaMax, j.vida + j.vidaMax * bc.curacion);
        c.tomado = true;
        this.emitir('curar', { jugador: j.indice, x: c.x, y: c.y - 20, cantidad: Math.round(j.vida - antes) });
      }
    }
    this.corazones = this.corazones.filter((c) => !c.tomado && c.t < bc.duracion);
  }

  // ---------- Oleadas y jefe ----------
  actualizarOleadas(dt) {
    const esc = this.escenario;
    const vivos = this.jugadores.filter((j) => j.estado !== 'muerto');
    const xMax = vivos.length ? Math.max(...vivos.map((j) => j.x)) : 0;
    const mult = this.modo === 'pareja' ? CONFIG.multiplicadorPareja.enemigos : 1;

    if (this.oleada) {
      const o = this.oleada;
      o.t += dt;
      for (const g of o.pendientes) {
        if (!g.hecho && o.t >= g.retraso) {
          g.hecho = true;
          const cant = Math.round(g.cantidad * mult);
          for (let k = 0; k < cant; k++) this.crearEnemigo(g.tipo || esc.enemigo, k);
        }
      }
      const todos = o.pendientes.every((g) => g.hecho);
      if (todos && !this.enemigos.some((e) => e.vivo)) {
        this.oleada = null;
        this.limiteIzq = 0;
        this.limiteDer = this.ancho;
        this.avisoAvanzar = 3;
        this.emitir('avanzar', {});
      }
      return;
    }
    this.avisoAvanzar = Math.max(0, this.avisoAvanzar - dt);

    const sig = esc.oleadas[this.indiceOleada];
    if (sig && xMax >= sig.gatillo) {
      this.indiceOleada++;
      this.oleada = { t: 0, pendientes: sig.grupos.map((g) => ({ ...g, hecho: false })) };
      this.limiteIzq = sig.zona[0];
      this.limiteDer = sig.zona[1];
      this.emitir('oleada', { numero: this.indiceOleada, total: esc.oleadas.length });
    } else if (!sig && !this.jefe && esc.zonaJefe && xMax >= esc.zonaJefe.gatillo) {
      this.limiteIzq = esc.zonaJefe.zona[0];
      this.limiteDer = esc.zonaJefe.zona[1];
      const mv = this.modo === 'pareja' ? CONFIG.multiplicadorPareja.vidaJefe : 1;
      const xj = Math.min(xMax + 520, this.limiteDer - 120);
      this.jefe = new Jefe(this, esc.jefe, xj, -400, mv);
      // Vida del jefe según el nivel (config/balance.js)
      if (typeof BALANCE !== 'undefined') this.jefe.vida = this.jefe.vidaMax = Math.round(BALANCE.vidaJefe(this.nivel) * mv);
    }
  }

  crearEnemigo(tipo, k) {
    // Aparecen cayendo del cielo lejos de los jugadores
    let x = 0;
    for (let intento = 0; intento < 12; intento++) {
      x = this.rng.rango(this.limiteIzq + 60, this.limiteDer - 60);
      if (this.jugadores.every((j) => Math.abs(j.x - x) > 320)) break;
    }
    const e = new Enemigo(this, tipo, x, -150 - k * 140 - this.rng() * 120);
    // Vida según el nivel (config/balance.js)
    if (typeof BALANCE !== 'undefined') e.vida = e.vidaMax = BALANCE.vidaEnemigo(this.nivel);
    this.enemigos.push(e);
  }

  comprobarFin(dt) {
    if (this.estado !== 'jugando') { this.tiempoFin += dt; return; }
    // Derrota: ningún jugador de pie
    if (!this.jugadores.some((j) => j.vivo)) {
      this.estado = 'derrota';
      this.tiempoFin = 0;
      this.emitir('banner', { texto: 'GAME OVER', sub: '', color: '#ff4d4d' });
      return;
    }
    // Victoria: jefe derrotado
    if (this.jefe && !this.jefe.vivo && this.jefe.tiempoMuerto > 1.8 && (this.monedas.length === 0 || this.jefe.tiempoMuerto > 5)) {
      this.estado = 'victoria';
      this.tiempoFin = 0;
      this.monedasGanadas += CONFIG.monedas.bonoNivel;
      this.emitir('banner', { texto: '¡VICTORIA!', sub: `+${CONFIG.monedas.bonoNivel} monedas de bono`, color: '#ffd84d' });
    }
  }

  // ---------- Versus: al mejor de 3 rondas ----------
  actualizarVersus(dt) {
    if (this.estado === 'finVersus') { this.tiempoFin += dt; return; }
    if (this.finRonda > 0) {
      this.finRonda -= dt;
      this.escalaTiempo = 0.4;
      if (this.finRonda <= 0) {
        this.escalaTiempo = 1;
        const ganador = this.rondas.findIndex((r) => r >= CONFIG.versus.rondasParaGanar);
        if (ganador >= 0) {
          this.estado = 'finVersus';
          this.ganador = ganador;
          this.tiempoFin = 0;
        } else this.reiniciarRonda();
      }
      return;
    }
    const caidos = this.jugadores.filter((j) => !j.vivo);
    if (caidos.length) {
      const ganador = this.jugadores.find((j) => j.vivo);
      if (ganador) this.rondas[ganador.indice]++;
      this.finRonda = 1.2;
      this.emitir('banner', { texto: '¡K.O.!', sub: ganador ? `Gana ${CONFIG.personajes[ganador.personaje].nombre}` : 'Empate', color: '#ff5050' });
      this.emitir('sacudir', { fuerza: 18 });
    }
  }

  reiniciarRonda() {
    this.ronda++;
    this.proyectiles = []; this.golpes = [];
    this.jugadores = this.jugadores.map((j, i) => {
      const n = new Jugador(this, j.personaje, i, this.escenario.inicio[i], this.sueloY);
      return n;
    });
    this.emitir('banner', { texto: `RONDA ${this.ronda}`, sub: '¡A pelear!', color: '#ffffff' });
  }
}
