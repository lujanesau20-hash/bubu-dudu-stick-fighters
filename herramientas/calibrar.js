/* =====================================================================
   CALIBRACIÓN GENERAL (v1.11) — simulación sencilla con los números reales.
   Uso (en la carpeta del juego, con Node instalado):
       node herramientas/calibrar.js            -> imprime todas las tablas
       node herramientas/calibrar.js monedas    -> solo una parte (golpes, cataclismo, monedas)
   Carga config/balance.js y los niveles igual que el juego (sin dibujo ni red)
   y calcula:
     1. golpes de H1 para matar un enemigo normal (mejoras 0%, 50%, 100%)
     2. Cataclismos para matar un enemigo normal (centro y borde)
     (3. maná y 4. supervivencia: con el bot, en herramientas/calibrar_bot.js)
     5. monedas y mejoras compradas al final de cada nivel
   No cambia nada del juego: solo lee y calcula.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.join(__dirname, '..');
const ctx = vm.createContext({ console, Math, JSON, Object, Array, Set, Map });
for (const f of ['js/utilidades.js', 'js/config.js', 'config/balance.js', 'config/interfaz.js', 'js/logica/mejoras.js',
  'js/logica/escenarios.js', 'js/logica/niveles_isla.js', 'js/logica/niveles_mundos.js']) {
  vm.runInContext(fs.readFileSync(path.join(raiz, f), 'utf8'), ctx, { filename: f });
}
const { BALANCE, CONFIG, ESCENARIOS, ORDEN_NIVELES, MEJORAS } = vm.runInContext('({ BALANCE, CONFIG, ESCENARIOS, ORDEN_NIVELES, MEJORAS })', ctx);

const parte = process.argv[2] || 'todo';
const mundos = BALANCE.mundos;
const ids = (mu) => ORDEN_NIVELES.filter((id) => ESCENARIOS[id].mundo === mu.id);
const vidaDe = (id) => ESCENARIOS[id].vidaEnemigo || BALANCE.vidaEnemigo(ESCENARIOS[id].numero);
const tabla = (cab, filas) => {
  console.log('| ' + cab.join(' | ') + ' |');
  console.log('|' + cab.map(() => '---').join('|') + '|');
  for (const f of filas) console.log('| ' + f.join(' | ') + ' |');
  console.log('');
};
const cab10 = ['Mundo', ...Array.from({ length: 10 }, (_, i) => 'N' + (i + 1))];

// ---------- 1. Golpes de H1 ----------
if (parte === 'todo' || parte === 'golpes') {
  const h1 = BALANCE.habilidades[0].danio;
  const sube = BALANCE.mejoras.subidaPorNivel, max = BALANCE.mejoras.niveles;
  console.log(`## 1. Golpes de H1 (cuchilla, ${h1} de daño) para matar un enemigo normal`);
  console.log('Celdas: mejoras al 0% / 50% / 100%. Con "⚠" se marca cuando, con la mitad de las mejoras, hacen falta más de 8 golpes.\n');
  const avisos = [];
  tabla(cab10, mundos.map((mu) => [mu.nombre, ...ids(mu).map((id) => {
    const v = vidaDe(id);
    const g = [0, 0.5, 1].map((f) => Math.ceil(v / Math.round(h1 * (1 + sube * max * f))));
    if (g[1] > 8) avisos.push(id);
    return g.join('/') + (g[1] > 8 ? ' ⚠' : '');
  })]));
  console.log(`Niveles con más de 8 golpes con la mitad de las mejoras: ${avisos.length} (${avisos.join(', ') || 'ninguno'})\n`);
}

// ---------- 2. Cataclismo ----------
if (parte === 'todo' || parte === 'cataclismo') {
  const c = BALANCE.combos[2];
  console.log(`## 2. Cataclismos para matar un enemigo normal (daño ${c.danio}, radio ${c.radio}, ${Math.round(c.minimoArea * 100)}% en el borde)`);
  console.log('Celdas: centro / borde, sin mejoras · con todas las mejoras (×2).\n');
  tabla(cab10, mundos.map((mu) => [mu.nombre, ...ids(mu).map((id) => {
    const v = vidaDe(id);
    const n = (d) => Math.ceil(v / Math.round(d));
    return `${n(c.danio)}/${n(c.danio * c.minimoArea)} · ${n(c.danio * 2)}/${n(c.danio * 2 * c.minimoArea)}`;
  })]));
}

// ---------- 3 y 4. Maná y supervivencia ----------
// Se miden jugando niveles completos con el "jugador promedio": herramientas/calibrar_bot.js
// (un cálculo a mano daba números poco realistas: el bot recibe muchos menos golpes y gana maná al acertar).

// ---------- 5. Monedas y mejoras ----------
function monedasNivel(id, refuerzosJefe = 5) {
  const e = ESCENARIOS[id];
  const enemigos = e.oleadas.reduce((s, tr) => s + tr.fases.reduce((a, f) => a + f, 0), 0);
  const aves = BALANCE.aves.porNivel[Math.min(10, e.numero) - 1];
  const jefe = e.jefe ? CONFIG.jefes[e.jefe].monedas + refuerzosJefe : 0;
  return enemigos * BALANCE.monedas.monedasPorEnemigo + aves + jefe + CONFIG.monedas.bonoNivel;
}
if (parte === 'todo' || parte === 'monedas') {
  const total = BALANCE.mejoras.lista.reduce((s, _, i) => s + MEJORAS.maximo(i), 0);
  let precioTotal = 0;
  BALANCE.mejoras.lista.forEach((_, i) => { for (let n = 0; n < MEJORAS.maximo(i); n++) precioTotal += MEJORAS.precio(i, n); });
  console.log(`## 5. Monedas y mejoras (un personaje, recogiendo todas las monedas, comprando siempre la más barata)`);
  console.log(`Hay ${total} mejoras (7 de daño × 5 + robo de vida × 4); comprarlas todas cuesta ${precioTotal} monedas.\n`);
  const niveles = MEJORAS.vacias();
  let bolsa = 0, acum = 0;
  const filas = [];
  for (const mu of mundos) {
    const fila = [mu.nombre];
    for (const id of ids(mu)) {
      const g = monedasNivel(id); bolsa += g; acum += g;
      const abierta = ORDEN_NIVELES.indexOf(id) >= ORDEN_NIVELES.indexOf(BALANCE.mejoras.desbloqueaAlSuperar);
      if (abierta) for (;;) {
        let mejor = -1, p = Infinity;
        niveles.forEach((n, i) => { const q = MEJORAS.precio(i, n); if (q != null && q < p) { p = q; mejor = i; } });
        if (mejor < 0 || p > bolsa) break;
        bolsa -= p; niveles[mejor]++;
      }
      fila.push(`${g} · ${niveles.reduce((a, x) => a + x, 0)}`);
    }
    filas.push(fila);
  }
  console.log('Celdas: monedas del nivel · mejoras compradas en total al terminarlo.\n');
  tabla(cab10, filas);
  console.log(`Monedas de los 50 niveles: ${acum}.\n`);
}
