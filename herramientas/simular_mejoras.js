/* =====================================================================
   TABLAS DE DAÑO, MONEDAS Y PRECIOS DE MEJORAS (v1.02)
   Usa los números reales de config/balance.js y los niveles construidos.

   Uso (consola de index.html con servidor local):
     const s = document.createElement('script'); s.src = 'herramientas/simular_mejoras.js'; document.body.append(s);
     tablasMejoras()            // imprime todas las tablas
     tablasMejoras(0.85)        // igual, recogiendo solo el 85% de las monedas
   ===================================================================== */

// Monedas que da un nivel de la Isla (solitario): 1 por enemigo y por ave, el jefe y el bono.
// refuerzosJefe: refuerzos que caen durante la pelea con el jefe (1 cada 15 s; se estima).
function monedasNivel(id, refuerzosJefe = 5) {
  const esc = ESCENARIOS[id];
  const bi = BALANCE.isla;
  let enemigos = 0;
  for (const tramo of esc.oleadas) {
    if (tramo.fases) enemigos += tramo.fases.reduce((s, f) => s + Math.min(bi.maxPorOleada, Math.round(f)), 0);
    else enemigos += tramo.grupos.reduce((s, g) => s + g.cantidad, 0);
  }
  const numero = esc.numero || 1;
  const aves = BALANCE.aves.porNivel[Math.min(10, numero) - 1];
  const jefe = esc.jefe ? CONFIG.jefes[esc.jefe].monedas : 0;
  const refuerzos = esc.jefe ? refuerzosJefe : 0;
  return { enemigos, aves, jefe, refuerzos, bono: CONFIG.monedas.bonoNivel, total: enemigos + aves + jefe + refuerzos + CONFIG.monedas.bonoNivel };
}

// Compra siempre la mejora más barata que alcance (desde que se desbloquea la pestaña)
function simularCompras(factor = 1) {
  const ids = BALANCE.isla.niveles.map((_, i) => 'isla-' + (i + 1));
  const desde = ids.indexOf(BALANCE.mejoras.desbloqueaAlSuperar);
  const niveles = MEJORAS.vacias();
  let bolsa = 0;
  const filas = [];
  ids.forEach((id, k) => {
    const ganadas = Math.round(monedasNivel(id).total * factor);
    bolsa += ganadas;
    let compradas = 0;
    if (k >= desde) {
      for (;;) {
        let mejor = -1, precio = Infinity;
        niveles.forEach((n, i) => { const p = MEJORAS.precio(i, n); if (p != null && p < precio) { precio = p; mejor = i; } });
        if (mejor < 0 || precio > bolsa) break;
        bolsa -= precio; niveles[mejor]++; compradas++;
      }
    }
    filas.push({ nivel: k + 1, monedas: ganadas, compradasAqui: compradas, total: niveles.reduce((a, b) => a + b, 0), sobran: bolsa });
  });
  return filas;
}

function tablasMejoras(factor = 1) {
  // 1) Daños base y con mejoras
  console.log('--- Daño por mejora (nivel 0..5) ---');
  console.table(BALANCE.mejoras.lista.map((d, i) => {
    const o = { mejora: d.nombre };
    for (let n = 0; n <= BALANCE.mejoras.niveles; n++) o['n' + n] = MEJORAS.danioConNivel(i, n);
    return o;
  }));
  // 2) Precios
  console.log('--- Precio de cada nivel ---');
  console.table(BALANCE.mejoras.lista.map((d, i) => {
    const o = { mejora: d.nombre }; let suma = 0;
    for (let n = 0; n < BALANCE.mejoras.niveles; n++) { const p = MEJORAS.precio(i, n); o['n' + (n + 1)] = p; suma += p; }
    o.total = suma; return o;
  }));
  // 3) Monedas por nivel
  console.log('--- Monedas por nivel (Isla, solitario, recogiendo todas) ---');
  let acum = 0;
  console.table(BALANCE.isla.niveles.map((_, i) => { const r = monedasNivel('isla-' + (i + 1)); acum += r.total; return { nivel: i + 1, ...r, acumulado: acum }; }));
  // 4) Simulación de compras
  console.log(`--- Compras (solo mejoras de UN personaje, ${Math.round(factor * 100)}% de las monedas) ---`);
  console.table(simularCompras(factor));
  // 5) Golpes de la espada (H2) por nivel
  const espada = BALANCE.habilidades[1].danio;
  console.log('--- Golpes de espada (H2) para un enemigo normal ---');
  console.table(Array.from({ length: 13 }, (_, i) => {
    const vida = BALANCE.vidaEnemigo(i + 1);
    return { nivel: i + 1, vida, base: Math.ceil(vida / espada), mitad: Math.ceil(vida / Math.round(espada * 1.5)), todas: Math.ceil(vida / Math.round(espada * 2)) };
  }));
}
