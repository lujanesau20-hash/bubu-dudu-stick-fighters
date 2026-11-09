/* =====================================================================
   SINCRONIZACIÓN EN LÍNEA (sin dibujo, sin red)
   - Anfitrión: crea instantáneas del Mundo real y recibe controles.
   - Invitado: aplica las instantáneas a un Mundo "espejo" (que no
     simula), con interpolación suave para los demás y predicción simple
     del movimiento de su propio personaje.
   Sirve para cualquier modo (pareja ahora; versus más adelante).
   ===================================================================== */

// ---------- Controles del invitado recibidos por el anfitrión ----------
// Los pulsos (saltar, habilidades, combo) se acumulan hasta que un paso
// de la simulación los usa, para no perder ninguno.
class ControlRemoto {
  constructor() {
    this.mantenido = new EstadoControl();
    this.pulsos = new EstadoControl();
    this.ultimoSeq = 0;
  }
  recibir(o) {
    if (o.seq <= this.ultimoSeq) return;
    this.ultimoSeq = o.seq;
    const e = EstadoControl.desdeObjeto(o.c);
    this.mantenido.x = e.x;
    this.mantenido.abajo = e.abajo;
    this.mantenido.saltoMantenido = e.saltoMantenido;
    this.mantenido.revivir = e.revivir;
    if (e.saltoPulsado) this.pulsos.saltoPulsado = true;
    e.habilidades.forEach((h, i) => { if (h) this.pulsos.habilidades[i] = true; });
    if (e.combo) this.pulsos.combo = e.combo;
  }
  leer() {
    const e = new EstadoControl();
    Object.assign(e, { x: this.mantenido.x, abajo: this.mantenido.abajo, saltoMantenido: this.mantenido.saltoMantenido, revivir: this.mantenido.revivir });
    e.saltoPulsado = this.pulsos.saltoPulsado;
    e.habilidades = this.pulsos.habilidades.slice();
    e.combo = this.pulsos.combo;
    this.pulsos.reiniciar();
    return e;
  }
  soltarTodo() { this.mantenido.reiniciar(); this.pulsos.reiniciar(); }
}

// ---------- Acumulador de controles del invitado antes de enviarlos ----------
class AcumuladorControl {
  constructor() { this.e = new EstadoControl(); this.seq = 0; }
  agregar(c) {
    const e = this.e;
    e.x = c.x; e.abajo = c.abajo; e.saltoMantenido = c.saltoMantenido; e.revivir = c.revivir;
    if (c.saltoPulsado) e.saltoPulsado = true;
    c.habilidades.forEach((h, i) => { if (h) e.habilidades[i] = true; });
    if (c.combo) e.combo = c.combo;
  }
  sacar() {
    const o = { seq: ++this.seq, c: this.e.aObjeto() };
    this.e.saltoPulsado = false; this.e.habilidades = [false, false, false, false]; this.e.combo = null;
    return o;
  }
}

const Sincro = {
  // Reloj en ms (se puede reemplazar en pruebas: herramientas/simular_red.js)
  reloj: () => performance.now(),

  // IDs estables para enemigos, proyectiles, monedas y corazones (lado anfitrión)
  ids: new WeakMap(),
  siguienteId: 1,
  id(o) {
    let v = this.ids.get(o);
    if (!v) { v = this.siguienteId++; this.ids.set(o, v); }
    return v;
  },

  r: (v) => Math.round(v * 10) / 10,

  // ===================== ANFITRIÓN =====================
  instantanea(m, eventos) {
    const r = this.r;
    const jug = (j) => ({
      x: r(j.x), y: r(j.y), vx: r(j.vx), vy: r(j.vy), dir: j.dir, estado: j.estado, alto: j.alto,
      vida: r(j.vida), vidaMax: j.vidaMax, energia: r(j.energia),
      enf: j.enfriamientos.map(r), enfC: (j.enfriamientosCombo || []).map(r), bloq: r(j.bloqueoAtaque || 0),
      inv: r(j.invulnerable), atur: r(j.aturdido), agach: j.agachado, suelo: j.enSuelo, saltosAire: j.saltosAire,
      acc: j.accion ? j.accion.tipo : null, disp: j.animDisparo, ultDanio: j.ultimoDanio,
      tCaido: r(j.tiempoCaido), prog: r(j.progresoRevivir), rev: j.reviviendo, ausente: !!j.ausente,
      anim: { inclinacion: r(j.anim.inclinacion * 100) / 100, flash: r(j.anim.flash), sx: r(j.anim.sx * 100) / 100,
        sy: r(j.anim.sy * 100) / 100, giro: r(j.anim.giro), volteo: r(j.anim.volteo), rebote: r(j.anim.rebote),
        ataque: r(j.anim.ataque), fase: r(j.anim.fase) },
      estela: j.estela.map((p) => ({ x: r(p.x), y: r(p.y), t: p.t })),
    });
    const ene = (e) => ({
      id: this.id(e), tipo: e.tipo, jefe: !!e.esJefe, x: r(e.x), y: r(e.y), vx: r(e.vx), vy: r(e.vy), dir: e.dir,
      estado: e.estado, vida: r(e.vida), vidaMax: e.vidaMax, t: r(e.t || 0), fase: r(e.anim.fase), flash: r(e.anim.flash),
      tMuerto: r(e.tiempoMuerto || 0), suelo: e.enSuelo, fase2: !!e.fase2,
    });
    return {
      w: Math.round(this.reloj()), t: m.tiempo, estado: m.estado, tiempoFin: m.tiempoFin, escalaTiempo: m.escalaTiempo,
      limIzq: m.limiteIzq, limDer: m.limiteDer, aviso: r(m.avisoAvanzar), revivesUsados: m.revivesUsados,
      monedasGanadas: m.monedasGanadas, rondas: m.rondas, ronda: m.ronda, ganador: m.ganador,
      jugadores: m.jugadores.map(jug),
      enemigos: m.enemigos.map(ene),
      jefe: m.jefe ? ene(m.jefe) : null,
      proyectiles: m.proyectiles.map((p) => ({ id: this.id(p), tipo: p.tipo, x: r(p.x), y: r(p.y), vx: r(p.vx), vy: r(p.vy),
        rot: r(p.rot), vida: r(p.vida), vidaMax: p.vidaMax, color: p.color, radio: p.radio })),
      monedas: m.monedas.map((c) => ({ id: this.id(c), x: r(c.x), y: r(c.y) })),
      corazones: (m.corazones || []).map((c) => ({ id: this.id(c), x: r(c.x), y: r(c.y), t: r(c.t), suelo: c.enSuelo })),
      eventos,
    };
  },

  // ===================== INVITADO =====================
  // Estado del espejo
  crearEspejo(datosInicio, indiceLocal) {
    const m = new Mundo({ modo: datosInicio.modo, personajes: datosInicio.personajes, escenario: datosInicio.escenario, semilla: datosInicio.semilla });
    m.eventos.length = 0;
    m.esEspejo = true;
    m.indiceLocal = indiceLocal;
    this.espejo = m;
    this.buffer = [];               // instantáneas recibidas { llegada, d }
    this.enemigosEspejo = new Map(); // id -> objeto Enemigo/Jefe
    this.ultimoTiempoEventos = -1;
    this.historial = [];            // posiciones predichas del jugador local
    this.correccion = { x: 0, y: 0 };
    this.tLocal = 0;
    this.desfase = null;
    this.variacion = 0;
    this.localPredicho = false;
    return m;
  },

  recibirInstantanea(d) {
    const llegada = this.reloj();
    // Desfase entre el reloj del anfitrión y el nuestro (se queda con la llegada más rápida)
    const muestra = llegada - d.w;
    if (this.desfase == null) { this.desfase = muestra; this.variacion = 0; }
    else if (muestra < this.desfase) this.desfase = muestra;
    else this.desfase += (muestra - this.desfase) * 0.01;
    this.variacion = this.variacion * 0.95 + Math.abs(muestra - this.desfase) * 0.05;
    this.buffer.push({ llegada, d });
    if (this.buffer.length > 60) this.buffer.shift();
    this.corregirLocal(d);
  },

  // Dibuja "retrasoInterpolacion" ms en el pasado para interpolar entre dos instantáneas
  prepararDibujo(ahora, efectos) {
    const m = this.espejo;
    if (!m || !this.buffer.length) return;
    const intervalo = 1000 / RED_CONFIG.estadosPorSegundo;
    const colchon = U.clamp(Math.max(RED_CONFIG.retrasoInterpolacion, intervalo * 1.5 + this.variacion * 3), 60, 350);
    const tObjetivo = ahora - this.desfase - colchon; // en el reloj del anfitrión
    let a = this.buffer[0], b = this.buffer[this.buffer.length - 1];
    for (let i = 0; i < this.buffer.length - 1; i++) {
      if (this.buffer[i].d.w <= tObjetivo && this.buffer[i + 1].d.w >= tObjetivo) { a = this.buffer[i]; b = this.buffer[i + 1]; break; }
    }
    if (tObjetivo > b.d.w) a = b;
    if (tObjetivo < this.buffer[0].d.w) b = a = this.buffer[0];
    const k = a === b ? 1 : U.clamp((tObjetivo - a.d.w) / (b.d.w - a.d.w), 0, 1);

    // Eventos (efectos) de todas las instantáneas que ya "pasaron"
    for (const s of this.buffer) {
      if (s.d.w <= tObjetivo && s.d.w > this.ultimoTiempoEventos) {
        this.ultimoTiempoEventos = s.d.w;
        if (s.d.eventos && s.d.eventos.length) efectos.procesar(s.d.eventos, m);
      }
    }
    this.aplicar(a.d, b.d, k);
  },

  aplicar(A, B, k) {
    const m = this.espejo;
    const L = (p, q) => p + (q - p) * k;
    m.tiempo = L(A.t, B.t);
    Object.assign(m, { estado: B.estado, tiempoFin: B.tiempoFin, escalaTiempo: B.escalaTiempo, limiteIzq: B.limIzq, limiteDer: B.limDer,
      avisoAvanzar: B.aviso, revivesUsados: B.revivesUsados, monedasGanadas: B.monedasGanadas, rondas: B.rondas, ronda: B.ronda, ganador: B.ganador });

    // Jugadores
    const ultimo = this.buffer[this.buffer.length - 1].d;
    B.jugadores.forEach((sb, i) => {
      const j = m.jugadores[i];
      if (!j) return;
      if (i === m.indiceLocal) {
        // El propio personaje usa el estado MÁS NUEVO: sus ataques y animaciones salen antes
        const s = ultimo.jugadores[i] || sb;
        this.copiarJugador(j, s, this.localPredicho);
        return;
      }
      const sa = A.jugadores[i] || sb;
      this.copiarJugador(j, sb, false);
      j.x = L(sa.x, sb.x); j.y = L(sa.y, sb.y);
      j.vx = sb.vx; j.vy = sb.vy;
    });

    // Enemigos y jefe (por id)
    const vistos = new Set();
    const ponerEnemigo = (sb) => {
      vistos.add(sb.id);
      let e = this.enemigosEspejo.get(sb.id);
      if (!e) {
        e = sb.jefe ? new Jefe(m, sb.tipo, sb.x, sb.y) : new Enemigo(m, sb.tipo, sb.x, sb.y);
        this.enemigosEspejo.set(sb.id, e);
      }
      const sa = (A.jefe && A.jefe.id === sb.id ? A.jefe : A.enemigos.find((q) => q.id === sb.id)) || sb;
      e.x = L(sa.x, sb.x); e.y = L(sa.y, sb.y);
      Object.assign(e, { vx: sb.vx, vy: sb.vy, dir: sb.dir, estado: sb.estado, vida: sb.vida, vidaMax: sb.vidaMax, t: sb.t,
        tiempoMuerto: sb.tMuerto, enSuelo: sb.suelo, fase2: sb.fase2 });
      e.anim.fase = L(sa.fase, sb.fase); e.anim.flash = sb.flash;
      return e;
    };
    m.enemigos = B.enemigos.map(ponerEnemigo);
    m.jefe = B.jefe ? ponerEnemigo(B.jefe) : null;
    for (const id of [...this.enemigosEspejo.keys()]) if (!vistos.has(id)) this.enemigosEspejo.delete(id);

    // Proyectiles, monedas y corazones (interpolados por id)
    const interp = (listaB, listaA) => listaB.map((pb) => {
      const pa = listaA.find((q) => q.id === pb.id) || pb;
      return Object.assign({}, pb, { x: L(pa.x, pb.x), y: L(pa.y, pb.y) });
    });
    m.proyectiles = interp(B.proyectiles, A.proyectiles);
    m.monedas = interp(B.monedas, A.monedas);
    m.corazones = interp(B.corazones, A.corazones).map((c) => ({ ...c, enSuelo: c.suelo }));
  },

  copiarJugador(j, s, localPredicho) {
    if (!localPredicho) { j.dir = s.dir; j.agachado = s.agach; } // el local mira/se agacha según lo que él pulsa
    Object.assign(j, {
      estado: s.estado, alto: s.alto, vida: s.vida, vidaMax: s.vidaMax, energia: s.energia,
      bloqueoAtaque: s.bloq, invulnerable: s.inv, aturdido: s.atur,
      tiempoCaido: s.tCaido, progresoRevivir: s.prog, reviviendo: s.rev, ultimoDanio: s.ultDanio,
      animDisparo: s.disp, estela: s.estela, ausente: s.ausente,
    });
    j.enfriamientos = s.enf;
    j.enfriamientosCombo = s.enfC;
    j.accion = s.acc ? { tipo: s.acc } : null;
    Object.assign(j.anim, s.anim);
    if (!localPredicho) { j.enSuelo = s.suelo; j.saltosAire = s.saltosAire; }
  },

  // ¿Se predice el movimiento local? Solo en estado normal sin acciones especiales
  prediciendo(s) {
    return s.estado === 'normal' && !s.acc && s.atur <= 0 && !s.rev;
  },

  // ---------- Predicción simple del jugador local (solo movimiento) ----------
  predecir(dt, c) {
    const m = this.espejo;
    if (!m || !this.buffer.length) return;
    const j = m.jugadores[m.indiceLocal];
    const ultimo = this.buffer[this.buffer.length - 1].d.jugadores[m.indiceLocal];
    this.tLocal += dt;
    this.localPredicho = !!ultimo && this.prediciendo(ultimo);
    if (!this.localPredicho) {
      // Acciones especiales (dash, combos, caído...): manda el anfitrión, con suavizado
      j.x += (ultimo.x - j.x) * Math.min(1, dt * 15);
      j.y += (ultimo.y - j.y) * Math.min(1, dt * 15);
      j.enSuelo = ultimo.suelo; j.vx = ultimo.vx; j.vy = ultimo.vy; j.saltosAire = ultimo.saltosAire;
      this.historial.length = 0;
      this.correccion = { x: 0, y: 0 };
      return;
    }
    const cj = CONFIG.jugador;
    j.agachado = c.abajo && j.enSuelo;
    const velObj = c.x * (j.agachado ? cj.velocidadAgachado : cj.velocidad);
    j.vx = U.aproximar(j.vx, velObj, (j.enSuelo ? cj.aceleracion : cj.aceleracionAire) * dt);
    if (c.x !== 0) j.dir = c.x > 0 ? 1 : -1;
    if (c.saltoPulsado && !(c.abajo && j.enSuelo && j.plataforma)) {
      if (j.enSuelo) { j.vy = -cj.salto; j.enSuelo = false; }
      else if (j.saltosAire > 0) { j.vy = -cj.dobleSalto; j.saltosAire--; }
    }
    if (c.saltoPulsado && c.abajo && j.enSuelo && j.plataforma) j.ignorarPlataformasHasta = m.tiempo + 0.3;
    if (!c.saltoMantenido && j.vy < -380) j.vy += 2600 * dt;
    const antes = j.enSuelo;
    m.moverCuerpo(j, dt);
    if (!antes && j.enSuelo) j.saltosAire = 1;

    // Aplicar poco a poco la corrección pendiente. El historial se mueve igual,
    // para que la próxima comparación no vuelva a contar lo ya corregido.
    const f = Math.min(1, dt * 10);
    const cx = this.correccion.x * f, cy = this.correccion.y * f;
    j.x += cx; j.y += cy;
    this.correccion.x -= cx; this.correccion.y -= cy;
    if (j.y > m.sueloY) j.y = m.sueloY;
    if (cx || cy) for (const p of this.historial) { p.x += cx; p.y += cy; }

    this.historial.push({ t: this.reloj(), x: j.x, y: j.y });
    while (this.historial.length > 120) this.historial.shift();
  },

  // Compara lo que dice el anfitrión con dónde estábamos hace ~1 RTT
  corregirLocal(d) {
    const m = this.espejo;
    if (!m || !this.historial.length) return;
    const s = d.jugadores[m.indiceLocal];
    if (!s || !this.prediciendo(s)) return;
    const j = m.jugadores[m.indiceLocal];
    // El estado del anfitrión refleja nuestras teclas de hace ~1 ping (+ envío de controles y un paso)
    const atras = (EnLinea.ping || 80) + 1000 / RED_CONFIG.controlesPorSegundo / 2 + 1000 / 60;
    const tBuscado = this.reloj() - atras;
    const H = this.historial;
    if (!H.length || H[0].t > tBuscado) return; // aún no hay historial suficiente
    let i = 0;
    while (i < H.length - 1 && H[i + 1].t <= tBuscado) i++;
    const p0 = H[i], p1 = H[Math.min(i + 1, H.length - 1)];
    const kk = p1.t > p0.t ? U.clamp((tBuscado - p0.t) / (p1.t - p0.t), 0, 1) : 0;
    const h = { x: p0.x + (p1.x - p0.x) * kk, y: p0.y + (p1.y - p0.y) * kk };
    let ex = s.x - h.x, ey = s.y - h.y;
    if (Math.abs(ex) < 2) ex = 0;   // zona muerta: no corregir diferencias mínimas
    if (Math.abs(ey) < 2) ey = 0;
    if (Math.abs(ex) > 220 || Math.abs(ey) > 260) { // demasiado lejos: saltar directo
      j.x = s.x; j.y = s.y; j.vx = s.vx; j.vy = s.vy; this.historial.length = 0; this.correccion = { x: 0, y: 0 };
      return;
    }
    this.correccion = { x: ex, y: ey };
  },
};
