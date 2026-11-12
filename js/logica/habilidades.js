/* =====================================================================
   HABILIDADES H1..H4 (los valores están en CONFIG.habilidades)
   Cada habilidad crea golpes/proyectiles y, si hace falta, una "acción"
   que controla al jugador durante un momento (dash, caída en picada...).
   ===================================================================== */
const HABILIDADES = {
  // Intenta usar la habilidad i. Devuelve true si se usó.
  usar(j, i, m) {
    const h = CONFIG.habilidades[i];
    if (!h || j.enfriamientos[i] > 0) return false;
    if (j.energia < h.energia) { m.emitir('sinEnergia', { jugador: j.indice }); return false; }
    j.energia -= h.energia;
    j.enfriamientos[i] = h.enfriamiento;
    j.bloqueoAtaque = h.bloqueo || 0;
    j.ultimaHabilidad = { indice: i, tiempo: m.tiempo, energia: h.energia };
    // Daño con las mejoras de la tienda de ESTE personaje (en versus, siempre el base)
    this[h.id](j, MEJORAS.conDanio(h, MEJORAS.factor(j, i)), m);
    return true;
  },

  // H1: saltito + cuchilla lanzada hacia adelante
  cuchilla(j, h, m) {
    if (j.enSuelo) j.vy = -h.saltito; else j.vy = Math.min(j.vy, -h.saltito * 0.6);
    j.anim.ataque = 1;
    j.animDisparo = { nombre: 'lanzar_cuchilla', t: m.tiempo };
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
    j.animDisparo = { nombre: 'espada', t: m.tiempo };
    j.vx += j.dir * 140;
    m.agregarGolpe(new Golpe({
      duenio: j, seguir: j, offX: h.alcance / 2 + 8, offY: -j.alto * 0.5, w: h.alcance + 24, h: 120,
      danio: h.danio, empujeX: h.empuje, empujeY: 230, duracion: 0.12, color: '#bfefff',
    }));
    m.emitir('arco', { jugador: j.indice, dir: j.dir, radio: h.alcance, color: '#bfefff' });
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
    m.agregarGolpe(new Golpe({
      duenio: j, forma: 'circulo', x: j.x, y: j.y - 30, r: h.radio, radial: true, area: true, empujon: true,
      danio: h.danio, empujeX: h.empuje, empujeY: 480, duracion: 0.1, color: '#9fd8ff',
    }));
    j.anim.sy = 0.55; j.anim.sx = 1.4;
    m.emitir('onda', { x: j.x, y: j.y, radio: h.radio, color: '#9fd8ff' });
    m.emitir('sacudir', { fuerza: 12 });
  },
};
