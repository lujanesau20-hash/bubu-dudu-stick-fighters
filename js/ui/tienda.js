/* =====================================================================
   GUARDADO (localStorage) Y TIENDA DE ROPA
   Se guardan: monedas, prendas compradas y lo que lleva puesto cada uno.
   ===================================================================== */
const Guardado = {
  datos: null,

  porDefecto() {
    return {
      monedas: 0,
      compradas: [],
      equipo: { bubu: { cabeza: null, ropa: null }, dudu: { cabeza: null, ropa: null } },
      nivelesSuperados: [],
      mejoras: { bubu: MEJORAS.vacias(), dudu: MEJORAS.vacias() }, // niveles de daño comprados (v1.02)
    };
  },

  cargar() {
    try {
      const txt = localStorage.getItem(CONFIG.guardado.clave);
      this.datos = Object.assign(this.porDefecto(), txt ? JSON.parse(txt) : {});
    } catch (e) {
      this.datos = this.porDefecto();
    }
    for (const id of Object.keys(CONFIG.personajes)) {
      if (!this.datos.equipo[id]) this.datos.equipo[id] = { cabeza: null, ropa: null };
    }
    // Partidas guardadas antes de v1.02 no tienen mejoras: se agregan en 0 (no se borra nada)
    if (!this.datos.mejoras || typeof this.datos.mejoras !== 'object') this.datos.mejoras = {};
    for (const id of Object.keys(CONFIG.personajes)) this.datos.mejoras[id] = MEJORAS.normalizar(this.datos.mejoras[id]);
  },

  guardar() {
    try { localStorage.setItem(CONFIG.guardado.clave, JSON.stringify(this.datos)); } catch (e) { /* sin almacenamiento */ }
  },

  sumarMonedas(n) { this.datos.monedas += n; this.guardar(); },
  tiene(id) { return this.datos.compradas.includes(id); },
  equipo(personaje) { return this.datos.equipo[personaje]; },

  comprar(id, precio) {
    if (this.tiene(id) || this.datos.monedas < precio) return false;
    this.datos.monedas -= precio;
    this.datos.compradas.push(id);
    this.guardar();
    return true;
  },

  // Sube un nivel la mejora i del personaje (si alcanzan las monedas)
  comprarMejora(personaje, i) {
    const niveles = this.datos.mejoras[personaje];
    const precio = MEJORAS.precio(i, niveles[i]);
    if (precio == null || this.datos.monedas < precio || !MEJORAS.desbloqueada()) return false;
    this.datos.monedas -= precio;
    niveles[i]++;
    this.guardar();
    return true;
  },

  // ranura: 'cabeza' | 'ropa'. id null = quitar
  equipar(personaje, ranura, id) {
    this.datos.equipo[personaje][ranura] = id;
    this.guardar();
  },
};

class TiendaUI {
  constructor(contenedor) {
    this.cont = contenedor;
    this.personaje = 'bubu';
    this.seccion = 'ropa';           // 'ropa' | 'mejoras'
    this.alCerrar = () => {};
  }

  abrir(alCerrar, textoBoton = 'Volver') {
    this.alCerrar = alCerrar;
    this.textoBoton = textoBoton;
    this.dibujar();
  }

  dibujar() {
    const d = Guardado.datos;
    const eq = Guardado.equipo(this.personaje);
    const fila = (ranura, item) => {
      const tiene = Guardado.tiene(item.id);
      const puesto = eq[ranura] === item.id;
      const alcanza = d.monedas >= item.precio;
      let boton;
      if (puesto) boton = `<button class="btn-chico activo" data-accion="quitar" data-ranura="${ranura}">Puesto ✓</button>`;
      else if (tiene) boton = `<button class="btn-chico" data-accion="poner" data-ranura="${ranura}" data-id="${item.id}">Ponerse</button>`;
      else boton = `<button class="btn-chico comprar" ${alcanza ? '' : 'disabled'} data-accion="comprar" data-id="${item.id}" data-precio="${item.precio}">🪙 ${item.precio}</button>`;
      return `<div class="item-tienda ${puesto ? 'puesto' : ''}"><span>${item.nombre}</span>${boton}</div>`;
    };
    const abierta = MEJORAS.desbloqueada();
    const enMejoras = this.seccion === 'mejoras';
    // Cuerpo de la pestaña "Ropa" (igual que antes) o "Mejoras"
    const cuerpoRopa = `
        <div class="tienda-cuerpo">
          <canvas class="vista-previa" width="220" height="240"></canvas>
          <div class="listas">
            <h3>Cabeza</h3>${CONFIG.tienda.cabeza.map((i) => fila('cabeza', i)).join('')}
            <h3>Conjuntos de ropa</h3>${CONFIG.tienda.ropa.map((i) => fila('ropa', i)).join('')}
          </div>
        </div>`;
    const cuerpoMejoras = abierta ? this.htmlMejoras() : `
        <div class="mejoras-bloqueadas">🔒 Se desbloquea al completar el nivel 5</div>`;
    this.cont.innerHTML = `
      <div class="panel panel-tienda">
        <h2>${enMejoras ? 'Mejoras de daño' : 'Tienda de ropa'}</h2>
        <div class="monedas-tienda">🪙 ${d.monedas}</div>
        <div class="tienda-arriba">
        <div class="pestanas pestanas-seccion">
          <button class="pestana ${!enMejoras ? 'activa' : ''}" data-seccion="ropa">👕 Ropa</button>
          <button class="pestana ${enMejoras ? 'activa' : ''} ${abierta ? '' : 'bloqueada'}" data-seccion="mejoras">${abierta ? '⚔' : '🔒'} Mejoras</button>
        </div>
        <div class="pestanas">
          ${Object.keys(CONFIG.personajes).map((p) => `<button class="pestana ${p === this.personaje ? 'activa' : ''}" data-personaje="${p}">${CONFIG.personajes[p].nombre}</button>`).join('')}
        </div>
        </div>
        ${enMejoras ? cuerpoMejoras : cuerpoRopa}
        <button class="btn" data-accion="cerrar">${this.textoBoton}</button>
      </div>`;

    this.cont.querySelectorAll('[data-personaje]').forEach((b) => b.onclick = () => { this.personaje = b.dataset.personaje; this.dibujar(); });
    this.cont.querySelectorAll('[data-seccion]').forEach((b) => b.onclick = () => { this.seccion = b.dataset.seccion; this.dibujar(); });
    this.cont.querySelectorAll('[data-accion]').forEach((b) => b.onclick = () => {
      const acc = b.dataset.accion;
      if (acc === 'cerrar') { cancelAnimationFrame(this.animacion); this.alCerrar(); return; }
      if (acc === 'comprar') {
        const id = b.dataset.id;
        if (Guardado.comprar(id, +b.dataset.precio)) {
          const ranura = CONFIG.tienda.cabeza.some((i) => i.id === id) ? 'cabeza' : 'ropa';
          Guardado.equipar(this.personaje, ranura, id);
        }
      }
      if (acc === 'mejorar') Guardado.comprarMejora(this.personaje, +b.dataset.mejora);
      if (acc === 'poner') Guardado.equipar(this.personaje, b.dataset.ranura, b.dataset.id);
      if (acc === 'quitar') Guardado.equipar(this.personaje, b.dataset.ranura, null);
      this.dibujar();
    });

    // Vista previa animada (solo en la pestaña de ropa)
    const lienzo = this.cont.querySelector('.vista-previa');
    cancelAnimationFrame(this.animacion);
    if (!lienzo) return;
    const ctx = lienzo.getContext('2d');
    const animar = (t) => {
      ctx.clearRect(0, 0, lienzo.width, lienzo.height);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(110, 222, 60, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save();
      ctx.translate(110, 222 - Math.abs(Math.sin(t / 300)) * 8);
      ctx.scale(1 + Math.sin(t / 150) * 0.02, 1 - Math.sin(t / 150) * 0.02);
      dibujarSpritePersonaje(ctx, this.personaje, Guardado.equipo(this.personaje), 200, { tiempo: t / 1000 });
      ctx.restore();
      this.animacion = requestAnimationFrame(animar);
    };
    this.animacion = requestAnimationFrame(animar);
  }

  // Filas de la pestaña "Mejoras" para el personaje elegido
  htmlMejoras() {
    const d = Guardado.datos;
    const niveles = d.mejoras[this.personaje];
    const max = BALANCE.mejoras.niveles;
    const filas = BALANCE.mejoras.lista.map((def, i) => {
      const n = niveles[i];
      const puntos = '●'.repeat(n) + '○'.repeat(max - n);
      const ahora = MEJORAS.danioConNivel(i, n);
      const precio = MEJORAS.precio(i, n);
      let danio, boton;
      if (precio == null) {
        danio = `<b>${ahora}</b> <small>máx.</small>`;
        boton = `<button class="btn-chico activo" disabled>Máximo ✓</button>`;
      } else {
        danio = `${ahora} → <b>${MEJORAS.danioConNivel(i, n + 1)}</b>`;
        boton = `<button class="btn-chico comprar" ${d.monedas >= precio ? '' : 'disabled'} data-accion="mejorar" data-mejora="${i}">Comprar 🪙 ${precio}</button>`;
      }
      return `<div class="item-tienda item-mejora">
          <span class="mej-ico">${def.icono}</span><span class="mej-nombre">${def.nombre}</span>
          <span class="mej-puntos" title="Nivel ${n} de ${max}">${puntos}</span>
          <span class="mej-danio">${danio}</span>${boton}
        </div>`;
    }).join('');
    return `
        <div class="lista-mejoras">
          <p class="ayuda mej-ayuda">Daño de ${CONFIG.personajes[this.personaje].nombre}: cada nivel suma +20% del daño base. Solo lo usa ${CONFIG.personajes[this.personaje].nombre}. En versus no cuenta.</p>
          ${filas}
        </div>`;
  }
}
