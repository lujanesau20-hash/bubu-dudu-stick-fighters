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
    this.ultN = [0, 0, 0, 0, 0, 0]; // contadores de pulsaciones ya usados (salto, H1-H4, combo)
  }
  recibir(o) {
    if (o.seq <= this.ultimoSeq) return; // viejo o repetido (el canal rápido no garantiza orden)
    this.ultimoSeq = o.seq;
    if (o.n) {
      // Formato con contadores: si un mensaje se pierde, el siguiente trae la cuenta
      // acumulada y la pulsación no se pierde.
      const c = o.c;
      this.mantenido.x = c.x; this.mantenido.abajo = c.a; this.mantenido.saltoMantenido = c.sm; this.mantenido.revivir = c.r;
      const u = this.ultN;
      if (o.n[0] > u[0]) this.pulsos.saltoPulsado = true;
      for (let i = 0; i < 4; i++) if (o.n[1 + i] > u[1 + i]) this.pulsos.habilidades[i] = true;
      if (o.n[5] > u[5] && o.cb) this.pulsos.combo = o.cb;
      this.ultN = o.n.slice();
      return;
    }
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
// Las pulsaciones se cuentan (contadores acumulados) para poder mandar los controles
// por el canal rápido sin garantía: un mensaje perdido no hace perder un salto o un ataque.
class AcumuladorControl {
  constructor() { this.e = new EstadoControl(); this.seq = 0; this.n = [0, 0, 0, 0, 0, 0]; this.combo = null; }
  agregar(c) {
    const e = this.e;
    e.x = c.x; e.abajo = c.abajo; e.saltoMantenido = c.saltoMantenido; e.revivir = c.revivir;
    if (c.saltoPulsado) this.n[0]++;
    c.habilidades.forEach((h, i) => { if (h) this.n[1 + i]++; });
    if (c.combo) { this.n[5]++; this.combo = c.combo; }
  }
  sacar() {
    const e = this.e;
    return { seq: ++this.seq, c: { x: Math.round(e.x * 100) / 100, a: e.abajo, sm: e.saltoMantenido, r: e.revivir }, n: this.n.slice(), cb: this.combo };
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
      monedasGanadas: m.monedasGanadas, tramo: m.tramoActual, indiceOleada: m.indiceOleada, enOleada: !!m.oleada, rondas: m.rondas, ronda: m.ronda, ganador: m.ganador,
      jugadores: m.jugadores.map(jug),
      enemigos: m.enemigos.map(ene),
      jefe: m.jefe ? ene(m.jefe) : null,
      proyectiles: m.proyectiles.map((p) => ({ id: this.id(p), tipo: p.tipo, x: r(p.x), y: r(p.y), vx: r(p.vx), vy: r(p.vy),
        rot: r(p.rot), vida: r(p.vida), vidaMax: p.vidaMax, color: p.color, radio: p.radio })),
      monedas: m.monedas.map((c) => ({ id: this.id(c), x: r(c.x), y: r(c.y) })),
      corazones: (m.corazones || []).map((c) => ({ id: this.id(c), x: r(c.x), y: r(c.y), t: r(c.t), suelo: c.enSuelo })),
      eventos: eventos || null,
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
    this.deltaRecibido = new Map();  // último valor de cada campo por id (formato "solo cambios")
    this.ultimoWDecodificado = null; this.numRecibido = 0; this.ultimosJugadores = null;
    this.proyEspejo = new Map(); this.monedasEspejo = new Map(); this.corazonesEspejo = new Map();
    this.eventosPendientes = [];     // efectos que llegan por el canal fiable
    return m;
  },

  recibirInstantanea(d) {
    const llegada = this.reloj();
    // Con el canal rápido pueden llegar desordenados: un snapshot más viejo que el último se descarta
    const ultimo = this.buffer.length ? this.buffer[this.buffer.length - 1].d : null;
    if (ultimo && d.w <= ultimo.w) return;
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
    // Efectos que llegaron aparte (canal fiable), en su momento
    const ep = this.eventosPendientes;
    while (ep && ep.length && ep[0].w <= tObjetivo) efectos.procesar(ep.shift().lista, m);
    if (ep && ep.length > 200) ep.splice(0, ep.length - 200);
    this.aplicar(a.d, b.d, k);
  },

  aplicar(A, B, k) {
    const m = this.espejo;
    const L = (p, q) => p + (q - p) * k;
    m.tiempo = L(A.t, B.t);
    Object.assign(m, { estado: B.estado, tiempoFin: B.tiempoFin, escalaTiempo: B.escalaTiempo, limiteIzq: B.limIzq, limiteDer: B.limDer,
      avisoAvanzar: B.aviso, revivesUsados: B.revivesUsados, monedasGanadas: B.monedasGanadas,
      tramoActual: B.tramo, indiceOleada: B.indiceOleada, oleada: B.enOleada ? {} : null, rondas: B.rondas, ronda: B.ronda, ganador: B.ganador });

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

    // Enemigos y jefe (por id). Se reutilizan las listas y los objetos: este código corre
    // en cada cuadro del invitado y crear objetos nuevos aquí causaba pausas en el celular.
    const marca = (this.marcaCuadro = (this.marcaCuadro || 0) + 1);
    const idxA = this.indice(A, 'enemigos');
    const ponerEnemigo = (sb) => {
      let e = this.enemigosEspejo.get(sb.id);
      if (!e) {
        e = sb.jefe ? new Jefe(m, sb.tipo, sb.x, sb.y) : new Enemigo(m, sb.tipo, sb.x, sb.y);
        this.enemigosEspejo.set(sb.id, e);
      }
      e._marca = marca;
      const sa = idxA.get(sb.id) || sb;
      e.x = L(sa.x, sb.x); e.y = L(sa.y, sb.y);
      e.vx = sb.vx; e.vy = sb.vy; e.dir = sb.dir; e.estado = sb.estado; e.vida = sb.vida; e.vidaMax = sb.vidaMax; e.t = sb.t;
      e.tiempoMuerto = sb.tMuerto; e.enSuelo = sb.suelo; e.fase2 = sb.fase2;
      e.anim.fase = L(sa.fase, sb.fase); e.anim.flash = sb.flash;
      return e;
    };
    const lista = this._listaEnemigos || (this._listaEnemigos = []);
    lista.length = 0;
    for (const sb of B.enemigos) lista.push(ponerEnemigo(sb));
    m.enemigos = lista;
    m.jefe = B.jefe ? ponerEnemigo(B.jefe) : null;
    for (const [id, e] of this.enemigosEspejo) if (e._marca !== marca) this.enemigosEspejo.delete(id);

    // Proyectiles, monedas y corazones (interpolados por id, reutilizando objetos)
    const interp = (campo, mapa, destino) => {
      const idx = this.indice(A, campo);
      const sal = destino || [];
      sal.length = 0;
      for (const pb of B[campo]) {
        let o = mapa.get(pb.id);
        if (!o) { o = {}; mapa.set(pb.id, o); }
        Object.assign(o, pb);
        const pa = idx.get(pb.id) || pb;
        o.x = L(pa.x, pb.x); o.y = L(pa.y, pb.y);
        o._marca = marca;
        sal.push(o);
      }
      for (const [id, o] of mapa) if (o._marca !== marca) mapa.delete(id);
      return sal;
    };
    m.proyectiles = interp('proyectiles', this.proyEspejo, this._listaProy || (this._listaProy = []));
    m.monedas = interp('monedas', this.monedasEspejo, this._listaMonedas || (this._listaMonedas = []));
    m.corazones = interp('corazones', this.corazonesEspejo, this._listaCorazones || (this._listaCorazones = []));
    for (const c of m.corazones) c.enSuelo = c.suelo;
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

// =====================================================================
// FORMATO COMPACTO DE SNAPSHOTS, SOLO CON CAMBIOS (config/red.js -> compacto)
// Cada cosa (jugador, enemigo, proyectil) es una lista de campos. El líder manda
// en cada snapshot solo los campos que cambiaron, y un "mapa de bits" que dice
// cuáles van. Un cambio se repite en "repetirCambios" snapshots seguidos, así un
// snapshot perdido no deja datos viejos; y cada "cadaClave" snapshots va todo.
// El invitado guarda el último valor de cada campo y vuelve a armar el estado con
// la MISMA forma que Sincro.instantanea, así el resto del código no cambia.
// =====================================================================
const CAMPOS_RED = {
  e: ['x', 'y', 'vx', 'vy', 'dir', 'estado', 'vida', 't', 'fase', 'flash', 'tMuerto', 'suelo', 'fase2', 'tipo', 'jefe', 'vidaMax'],
  p: ['x', 'y', 'vx', 'vy', 'rot', 'vida', 'tipo', 'vidaMax', 'color', 'radio'],
  j: ['x', 'y', 'vx', 'vy', 'dir', 'estado', 'alto', 'vida', 'vidaMax', 'energia', 'enf', 'enfC', 'bloq', 'inv', 'atur', 'agach',
    'suelo', 'saltosAire', 'acc', 'disp', 'ultDanio', 'tCaido', 'prog', 'rev', 'ausente',
    'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'estela'],
};
const ANIM_RED = ['inclinacion', 'flash', 'sx', 'sy', 'giro', 'volteo', 'rebote', 'ataque', 'fase'];
const POT2_RED = Array.from({ length: 40 }, (_, i) => Math.pow(2, i));

// Efectos (eventos) en formato corto: nombres de campo de 1-2 letras y tipo como número.
// Lo que no está en estas listas viaja igual, con su nombre completo.
const CLAVES_EV = { tipo: 'k', color: 'c', danio: 'd', aJugador: 'a', cantidad: 'n', fuerza: 'f', valor: 'v',
  radio: 'r', nombre: 'nm', jugador: 'j', dir: 'o', duracion: 'u', texto: 'tx', grande: 'g', numero: 'nu', total: 'to' };
const CLAVES_EV_INV = Object.fromEntries(Object.entries(CLAVES_EV).map(([a, b]) => [b, a]));
const TIPOS_EV = ['impacto', 'chispa', 'polvo', 'dobleSalto', 'lanzar', 'arco', 'dash', 'torbellino', 'onda', 'explosion', 'combo',
  'banner', 'sacudir', 'muerteEnemigo', 'muerteJefe', 'moneda', 'texto', 'sinEnergia', 'curar', 'caido', 'revivido', 'avanzar',
  'avisoSuelo', 'teletransporte', 'oleada', 'tramo', 'refuerzo'];

// ¿Dos valores son iguales? (números, textos, listas cortas u objetos pequeños)
function igualRed(a, b) {
  if (a === b) return true;
  if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

Object.assign(Sincro, {
  // ---------- LÍDER ----------
  reiniciarDelta() { this.deltaEnviado = new Map(); this.numSnap = 0; },

  // Lista de [mapa de bits, ...campos que van] para una cosa
  codificar(clave, valores, esClave) {
    const reps = RED_CONFIG.compacto.repetirCambios;
    let est = this.deltaEnviado.get(clave);
    if (!est) { est = { prev: new Array(valores.length), rep: new Array(valores.length).fill(0), nuevo: true }; this.deltaEnviado.set(clave, est); }
    est.visto = this.numSnap;
    const sal = [0];
    let mapa = 0;
    for (let i = 0; i < valores.length; i++) {
      const v = valores[i];
      if (est.nuevo || !igualRed(v, est.prev[i])) { est.prev[i] = v; est.rep[i] = reps; }
      if (esClave || est.rep[i] > 0) {
        mapa += POT2_RED[i];
        sal.push(v);
        if (est.rep[i] > 0) est.rep[i]--;
      }
    }
    est.nuevo = false;
    sal[0] = mapa;
    return sal;
  },

  comprimir(d) {
    const cfg = RED_CONFIG.compacto;
    if (!this.deltaEnviado) this.reiniciarDelta();
    this.numSnap++;
    const clave = this.numSnap % cfg.cadaClave === 0;
    // Envío completo repartido: cada cosa va completa en un snapshot distinto (según su id),
    // así no se juntan todas en uno solo y el tamaño no salta
    const claveDe = (n) => (this.numSnap + n * 7) % cfg.cadaClave === 0;
    const r0 = Math.round, r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
    const v10 = (v) => Math.round(v / 10) * 10; // velocidades: de 10 en 10 (solo se usan para la pose)
    const b = (v) => (v ? 1 : 0);
    const jug = (j, i) => {
      const a = j.anim;
      const vals = [r0(j.x), r0(j.y), v10(j.vx), v10(j.vy), j.dir, j.estado, j.alto, r1(j.vida), j.vidaMax, r0(j.energia),
        j.enf.map(r1), j.enfC.map(r1), r2(j.bloq), r1(j.inv), r1(j.atur), b(j.agach), b(j.suelo), j.saltosAire, j.acc, j.disp, r2(j.ultDanio),
        r1(j.tCaido), r2(j.prog), b(j.rev), b(j.ausente)];
      for (const k of ANIM_RED) vals.push(r2(a[k]));
      const est = [];
      for (const p of j.estela) est.push(r0(p.x), r0(p.y), r2(p.t));
      vals.push(est);
      return this.codificar('j' + i, vals, claveDe(i));
    };
    const ene = (e) => [e.id, ...this.codificar('e' + e.id, [r0(e.x), r0(e.y), v10(e.vx), v10(e.vy), e.dir, e.estado, r1(e.vida), r2(e.t), r2(e.fase),
      r1(e.flash), r2(e.tMuerto), b(e.suelo), b(e.fase2), e.tipo, b(e.jefe), e.vidaMax], claveDe(e.id))];
    const proy = (p) => [p.id, ...this.codificar('p' + p.id, [r0(p.x), r0(p.y), v10(p.vx), v10(p.vy), r1(p.rot), r2(p.vida), p.tipo, p.vidaMax, p.color, p.radio], claveDe(p.id))];
    const sal = {
      w: d.w, t: r2(d.t),
      g: [d.estado, r2(d.tiempoFin || 0), d.escalaTiempo, r0(d.limIzq), r0(d.limDer), r1(d.aviso), d.revivesUsados, d.monedasGanadas,
        d.tramo, d.indiceOleada, b(d.enOleada), d.rondas, d.ronda, d.ganador],
      j: d.jugadores.map(jug),
      e: d.enemigos.map(ene),
      b: d.jefe ? ene(d.jefe) : 0,
      p: d.proyectiles.map(proy),
      m: [],
      h: d.corazones.map((c) => [c.id, r0(c.x), r0(c.y), r1(c.t), b(c.suelo)]),
    };
    for (const c of d.monedas) sal.m.push(c.id, r0(c.x), r0(c.y));
    // Limpieza: lo que hace rato no aparece (murió, se recogió) se olvida
    if (clave) for (const [k, est] of this.deltaEnviado) if (this.numSnap - est.visto > 60) this.deltaEnviado.delete(k);
    return sal;
  },

  // ---------- INVITADO ----------
  // Aplica un [mapa, ...campos] sobre lo guardado. Devuelve los valores completos o null si aún faltan.
  decodificar(clave, lista, inicio, n) {
    let est = this.deltaRecibido.get(clave);
    if (!est) { est = { vals: new Array(n), tiene: new Array(n).fill(false), conocidos: 0 }; this.deltaRecibido.set(clave, est); }
    const mapa = lista[inicio];
    let k = inicio + 1;
    for (let i = 0; i < n; i++) {
      if (Math.floor(mapa / POT2_RED[i]) % 2 === 1) {
        if (!est.tiene[i]) { est.tiene[i] = true; est.conocidos++; }
        est.vals[i] = lista[k++];
      }
    }
    est.visto = this.numRecibido;
    return est.conocidos === n ? est.vals : null;
  },

  descomprimir(c) {
    if (!this.deltaRecibido) this.deltaRecibido = new Map();
    // Con "solo cambios", un snapshot viejo que llega tarde no se aplica (pisaría datos nuevos)
    if (this.ultimoWDecodificado != null && c.w <= this.ultimoWDecodificado) return null;
    this.ultimoWDecodificado = c.w;
    this.numRecibido = (this.numRecibido || 0) + 1;
    const g = c.g;
    const nE = CAMPOS_RED.e.length, nP = CAMPOS_RED.p.length, nJ = CAMPOS_RED.j.length;
    const jugadores = [];
    c.j.forEach((lista, i) => {
      const v = this.decodificar('j' + i, lista, 0, nJ);
      if (!v) return;
      const est = [], ev = v[34];
      for (let q = 0; q < ev.length; q += 3) est.push({ x: ev[q], y: ev[q + 1], t: ev[q + 2] });
      jugadores[i] = { x: v[0], y: v[1], vx: v[2], vy: v[3], dir: v[4], estado: v[5], alto: v[6], vida: v[7], vidaMax: v[8], energia: v[9],
        enf: v[10], enfC: v[11], bloq: v[12], inv: v[13], atur: v[14], agach: !!v[15], suelo: !!v[16], saltosAire: v[17],
        acc: v[18], disp: v[19], ultDanio: v[20], tCaido: v[21], prog: v[22], rev: !!v[23], ausente: !!v[24],
        anim: { inclinacion: v[25], flash: v[26], sx: v[27], sy: v[28], giro: v[29], volteo: v[30], rebote: v[31], ataque: v[32], fase: v[33] },
        estela: est };
    });
    if (jugadores.length < c.j.length || jugadores.includes(undefined)) {
      // Aún no sabemos todo de algún jugador: usar lo último completo
      const prev = this.ultimosJugadores || [];
      for (let i = 0; i < c.j.length; i++) if (!jugadores[i]) jugadores[i] = prev[i];
      if (jugadores.includes(undefined)) return null;
    }
    this.ultimosJugadores = jugadores;
    const ene = (lista) => {
      const v = this.decodificar('e' + lista[0], lista, 1, nE);
      if (!v) return null; // todavía no sabemos qué es: se dibuja en el próximo snapshot
      return { id: lista[0], x: v[0], y: v[1], vx: v[2], vy: v[3], dir: v[4], estado: v[5], vida: v[6], t: v[7], fase: v[8], flash: v[9],
        tMuerto: v[10], suelo: !!v[11], fase2: !!v[12], tipo: v[13], jefe: !!v[14], vidaMax: v[15] };
    };
    const proy = (lista) => {
      const v = this.decodificar('p' + lista[0], lista, 1, nP);
      if (!v) return null;
      return { id: lista[0], x: v[0], y: v[1], vx: v[2], vy: v[3], rot: v[4], vida: v[5], tipo: v[6], vidaMax: v[7], color: v[8], radio: v[9] };
    };
    const monedas = [];
    for (let i = 0; i < c.m.length; i += 3) monedas.push({ id: c.m[i], x: c.m[i + 1], y: c.m[i + 2] });
    // Limpieza de lo que ya no aparece
    if (this.numRecibido % 20 === 0) for (const [k, est] of this.deltaRecibido) if (this.numRecibido - est.visto > 60) this.deltaRecibido.delete(k);
    return {
      w: c.w, t: c.t, estado: g[0], tiempoFin: g[1], escalaTiempo: g[2], limIzq: g[3], limDer: g[4], aviso: g[5], revivesUsados: g[6],
      monedasGanadas: g[7], tramo: g[8], indiceOleada: g[9], enOleada: !!g[10], rondas: g[11], ronda: g[12], ganador: g[13],
      jugadores,
      enemigos: c.e.map(ene).filter(Boolean),
      jefe: c.b ? ene(c.b) : null,
      proyectiles: c.p.map(proy).filter(Boolean),
      monedas,
      corazones: c.h.map((v) => ({ id: v[0], x: v[1], y: v[2], t: v[3], suelo: !!v[4] })),
      eventos: null, // los efectos llegan aparte por el canal fiable (mensaje "ev")
    };
  },

  // Efecto -> formato corto (líder). Números enteros (o con 1 decimal si son pequeños).
  efectoCorto(e) {
    const o = {};
    for (const k in e) {
      let v = e[k];
      if (v != null && typeof v === 'object' && !Array.isArray(v)) continue; // referencias a objetos: no se mandan
      if (typeof v === 'number') v = Math.abs(v) >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
      if (typeof v === 'boolean') v = v ? 1 : 0;
      if (k === 'tipo') { const i = TIPOS_EV.indexOf(v); if (i >= 0) v = i; }
      o[CLAVES_EV[k] || k] = v;
    }
    return o;
  },
  // Formato corto -> efecto (invitado)
  efectoLargo(o) {
    const e = {};
    for (const k in o) e[CLAVES_EV_INV[k] || k] = o[k];
    if (typeof e.tipo === 'number') e.tipo = TIPOS_EV[e.tipo];
    if (e.aJugador != null) e.aJugador = !!e.aJugador;
    if (e.grande != null) e.grande = !!e.grande;
    return e;
  },

  // Efectos (eventos) que llegan por el canal fiable con la hora del líder
  recibirEventos(w, lista) {
    if (!this.eventosPendientes) this.eventosPendientes = [];
    this.eventosPendientes.push({ w, lista: lista.map((o) => (o.k != null ? this.efectoLargo(o) : o)) });
  },

  // Índice id -> cosa de un snapshot (se arma una sola vez por snapshot, no en cada cuadro)
  indice(d, campo) {
    const k = '_i' + campo;
    if (!d[k]) {
      const mapa = new Map();
      for (const o of d[campo]) mapa.set(o.id, o);
      if (campo === 'enemigos' && d.jefe) mapa.set(d.jefe.id, d.jefe);
      Object.defineProperty(d, k, { value: mapa, enumerable: false });
    }
    return d[k];
  },
});
