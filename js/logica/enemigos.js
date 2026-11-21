/* =====================================================================
   ENEMIGOS stickman (lógica). Se dibujan en dibujo/stickman.js.
   Cada tipo tiene su IA en IA_ENEMIGOS. Para crear uno nuevo:
     1. Añade sus valores en CONFIG.enemigos.
     2. Añade su función en IA_ENEMIGOS (si no, usa la IA "normal").
   ===================================================================== */
class Enemigo {
  constructor(mundo, tipo, x, y, cfg) {
    this.mundo = mundo;
    this.tipo = tipo;
    this.cfg = cfg || CONFIG.enemigos[tipo];
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.ancho = this.cfg.ancho; this.alto = this.cfg.alto;
    this.dir = -1;
    this.vidaMax = this.cfg.vida;
    this.vida = this.vidaMax;
    this.color = this.cfg.color;
    // Mundos con colores propios (config/balance.js -> mundos[].colores), también en el invitado
    const pal = mundo.escenario && mundo.escenario.colores;
    if (pal && pal[tipo]) this.color = pal[tipo];
    this.estado = 'entrando';      // entrando | perseguir | preparar | atacar | aturdido | muerto
    this.t = 0;
    this.enfriamientoAtaque = mundo.rng.rango(0.6, 1.6);
    this.superArmadura = false;    // los jefes no se aturden
    this.enSuelo = false;
    this.ignorarPlataformasHasta = 0;
    this.tiempoMuerto = 0;
    this.borrar = false;
    this.anim = { fase: mundo.rng() * 6, flash: 0 };
    // Velocidad de caminar (config/balance.js -> comportamiento): +30% y un poco más en cada mundo
    this.velocidad = (this.cfg.velocidad || 0) * (mundo.factorVelocidad ? mundo.factorVelocidad(false) : 1);
    // Retraso fijo al azar de cada enemigo, para que no ataquen todos a la vez
    const bc = typeof BALANCE !== 'undefined' && BALANCE.comportamiento;
    this.desfase = bc ? mundo.rng() * bc.desfaseMax : 0;
    this.objetivo = null;          // jugador al que está atacando (para el máximo de atacantes)
  }

  // ¿Está en medio de un ataque cuerpo a cuerpo? (cuenta para el máximo de atacantes por jugador)
  get atacando() { return this.estado === 'preparar' || this.estado === 'atacar'; }

  // Avanza la animación de las piernas según lo que caminó (sin "patinar")
  avanzarPaso(dt) {
    const v = Math.abs(this.vx);
    if (v <= 10) return;
    const bc = typeof BALANCE !== 'undefined' && BALANCE.comportamiento;
    const ritmo = bc ? bc.ritmoPaso / Math.max(0.5, this.alto / 82) : 0.05;
    this.anim.fase += dt * v * ritmo;
  }

  get vivo() { return this.estado !== 'muerto'; }
  get puedeSerGolpeado() { return this.vivo; }

  actualizar(dt) {
    const m = this.mundo;
    this.anim.flash = Math.max(0, this.anim.flash - dt * 6);
    this.enfriamientoAtaque -= dt;

    if (this.estado === 'muerto') {
      this.tiempoMuerto += dt;
      this.vx = U.aproximar(this.vx, 0, 600 * dt);
      m.moverCuerpo(this, dt);
      if (this.tiempoMuerto > 1.4) this.borrar = true;
      return;
    }
    if (this.estado === 'entrando') {
      if (this.cfg.vuela) { this.estado = 'perseguir'; return; } // las aves entran volando
      m.moverCuerpo(this, dt);
      if (this.enSuelo) {
        this.estado = 'perseguir';
        m.emitir('polvo', { x: this.x, y: this.y, cantidad: 6 });
      }
      return;
    }
    if (this.estado === 'aturdido') {
      this.t -= dt;
      this.vx = U.aproximar(this.vx, 0, 900 * dt);
      m.moverCuerpo(this, dt);
      if (this.t <= 0 && this.enSuelo) this.estado = 'perseguir';
      return;
    }
    this.aplicarEmpuje(dt);
    (IA_ENEMIGOS[this.tipo] || IA_ENEMIGOS.normal)(this, dt, m);
    m.moverCuerpo(this, dt, !!this.cfg.vuela);
    if (!this.cfg.vuela) this.avanzarPaso(dt);
  }

  // Empujón corto hacia atrás (config/balance.js -> empujon). No deja al enemigo "tieso".
  // factor: 1 = empujón completo (retroceso de la habilidad)
  empujar(dir, factor = 1) {
    const b = typeof BALANCE !== 'undefined' ? BALANCE.empujon : { pasos: 1.5, pasoPx: 40 };
    this.empuje = { dir: dir >= 0 ? 1 : -1, restante: b.pasos * b.pasoPx * factor };
  }

  aplicarEmpuje(dt) {
    if (!this.empuje) return;
    const vel = typeof BALANCE !== 'undefined' ? BALANCE.empujon.velocidad : 700;
    const paso = Math.min(this.empuje.restante, vel * dt);
    this.x += this.empuje.dir * paso;
    this.empuje.restante -= paso;
    if (this.empuje.restante <= 0) this.empuje = null;
  }

  recibirDanio(cantidad, info) {
    if (!this.vivo) return false;
    const m = this.mundo;
    this.vida -= cantidad;
    this.anim.flash = 1;
    // Los golpes ya no dejan al enemigo "tieso": sigue atacando enseguida.
    // H3, H4 y los combos (info.empujon) le dan un empujón corto; H1 y H2 no lo empujan.
    // Corte volador y Torbellino: retroceso 0 -> sin empujón (no se reinicia nada en cada golpe; solo el destello)
    const re = info.retroceso ?? 1;
    if (info.empujon && re > 0) this.empujar(info.dirX || 1, re);
    if (this.vida <= 0) this.morir(info);
    return true;
  }

  morir(info) {
    const m = this.mundo;
    this.estado = 'muerto';
    this.vida = 0;
    this.vx = (info.dirX || 1) * 380;
    this.vy = -520;
    this.enSuelo = false;
    // Monedas por enemigo: config/balance.js -> monedas.monedasPorEnemigo (cfg.monedas ya no se usa)
    m.soltarMonedas(this.x, this.y - this.alto / 2, BALANCE.monedas.monedasPorEnemigo);
    m.emitir('muerteEnemigo', { x: this.x, y: this.y - this.alto / 2, color: this.color });
  }

  // Ataque cuerpo a cuerpo básico
  golpear(danio, alcance) {
    this.mundo.agregarGolpe(new Golpe({
      duenio: this, seguir: this, offX: alcance / 2 + 8, offY: -this.alto * 0.62, w: alcance, h: 46,
      danio, empujeX: 260, empujeY: 220, duracion: 0.12, color: this.color,
    }));
  }
}

const IA_ENEMIGOS = {
  // Stickman normal (también espadachín y ninja): persigue, se DETIENE, avisa (se echa hacia atrás),
  // pega quieto, se recupera y repite. Números en config/balance.js -> comportamiento.
  // Estados: perseguir (camina) | esperar (quieto en guardia) | preparar (aviso) | atacar (golpe) | recuperar
  normal(e, dt, m) {
    const obj = m.jugadorMasCercano(e.x, e.y);
    const c = e.cfg;
    const bc = BALANCE.comportamiento;
    if (!obj) { e.vx = U.aproximar(e.vx, 0, 800 * dt); e.estado = 'perseguir'; e.objetivo = null; return; }
    const dx = obj.x - e.x;
    const dy = obj.y - e.y;

    switch (e.estado) {
      case 'perseguir':
      case 'esperar': {
        e.objetivo = obj;
        e.dir = dx > 0 ? 1 : -1;
        const adx = Math.abs(dx);
        const enAlcance = adx <= c.alcance && Math.abs(dy) < 70;
        const lleno = (obj.atacantes || 0) >= bc.maxAtacantesPorJugador;
        // Le toca atacar: se detiene y avisa
        if (!lleno && e.enfriamientoAtaque <= 0 && enAlcance && e.enSuelo) {
          e.estado = 'preparar';
          e.t = (bc.avisoPorTipo && bc.avisoPorTipo[e.tipo]) || bc.aviso;
          obj.atacantes = (obj.atacantes || 0) + 1;
          break;
        }
        // Distancia a la que se queda: cerca para pegar, o un poco más lejos si ya hay 4 atacando
        let velObj = 0;
        const cercaObj = lleno ? c.alcance * bc.distanciaEspera : c.alcance * 0.75;
        if (adx > cercaObj + 6) velObj = e.dir * e.velocidad;
        else if (lleno && adx < cercaObj - 30) velObj = -e.dir * e.velocidad * 0.5; // da lugar a los que pegan
        // No amontonarse con otros enemigos (solo si están casi encima)
        let separar = 0;
        for (const o of m.enemigos) {
          if (o === e || !o.vivo || o.cfg.vuela) continue;
          const d = e.x - o.x;
          if (Math.abs(d) < 30) separar += (d >= 0 ? 1 : -1) * 60;
        }
        if (Math.abs(velObj) > 1) velObj += separar;
        else e.x += separar * 0.4 * dt; // quieto: se aparta despacio sin ponerse a caminar
        e.vx = U.aproximar(e.vx, velObj, 1600 * dt);
        e.estado = Math.abs(velObj) > 1 ? 'perseguir' : 'esperar';
        // Saltar a plataformas si el jugador está arriba
        if (dy < -90 && adx < 220 && e.enSuelo && m.rng() < 1.2 * dt) e.vy = -880;
        // Bajar de plataformas si el jugador está abajo
        if (dy > 90 && e.enSuelo && e.plataforma && m.rng() < 1.2 * dt) e.ignorarPlataformasHasta = m.tiempo + 0.3;
        break;
      }
      case 'preparar':
        // Aviso: quieto, echado hacia atrás
        e.vx = U.aproximar(e.vx, 0, 3000 * dt);
        e.t -= dt;
        if (e.t <= 0) {
          e.estado = 'atacar';
          e.t = bc.golpe;
          e.vx = e.dir * (bc.retrocesoGolpe || 0);
          e.golpear(c.danio, c.alcance);
        }
        break;
      case 'atacar':
        e.vx = U.aproximar(e.vx, 0, 3000 * dt);
        e.t -= dt;
        if (e.t <= 0) { e.estado = 'recuperar'; e.t = bc.recuperacion; }
        break;
      case 'recuperar':
        e.vx = U.aproximar(e.vx, 0, 3000 * dt);
        e.t -= dt;
        if (e.t <= 0) {
          e.estado = 'esperar';
          e.enfriamientoAtaque = m.rng.rango(bc.enfriamiento[0], bc.enfriamiento[1]) + e.desfase;
        }
        break;
      default:
        e.estado = 'perseguir';
    }
  },

  // PREPARADOS: por ahora usan la IA normal. Ideas para programarlos:
  // arquero: mantener distancia y disparar flechas (Proyectil con gravedad).
  // mago: lanzar orbes y teletransportarse cerca/lejos del jugador.
  // ninja: muy rápido, esquiva saltando cuando el jugador ataca.
};
