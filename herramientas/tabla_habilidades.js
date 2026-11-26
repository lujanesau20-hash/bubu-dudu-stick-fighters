/* =====================================================================
   TABLA DE HABILIDADES (v1.22) — uso: node herramientas/tabla_habilidades.js
   Lee config/balance.js y calcula, para el básico, H1, H3, H4 y los 3 combos:
   daño, maná, enfriamiento, ritmo máximo, daño por segundo (1 enemigo),
   daño a un grupo típico de 3 enemigos y daño por maná (grupo).
   Supuestos del grupo: golpes de área al 70% de media (caída con la distancia),
   H3 y Corte volador atraviesan una fila (3 enemigos), básico y H1 a uno solo.
   No cambia nada del juego.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const raiz = path.join(__dirname, '..');
const ctx = vm.createContext({ console, Math, JSON, Object, Array, Set, Map });
for (const f of ['js/utilidades.js', 'js/config.js', 'config/balance.js']) vm.runInContext(fs.readFileSync(path.join(raiz, f), 'utf8'), ctx, { filename: f });
const B = vm.runInContext('BALANCE', ctx);

const h = B.habilidades, c = B.combos;
const ritmo = (i) => { const r = B.ritmoAtaque && B.ritmoAtaque[i]; if (!r) return null; return Math.min(...r.ventanas.map(([s, n]) => n / s), 1 / r.minEntre); };
const filas = [
  { n: 'Básico (H2)', d: h[1].danio, mana: h[1].mana, cd: h[1].enfriamiento, porSeg: ritmo(1), grupo: 1 },
  { n: 'H1 Daga', d: h[0].danio, mana: h[0].mana, cd: h[0].enfriamiento, porSeg: ritmo(0), grupo: 1 },
  { n: 'H3 Flash', d: h[2].danio, mana: h[2].mana, cd: h[2].enfriamiento, grupo: 3 },
  { n: 'H4 Onda', d: h[3].danio, mana: h[3].mana, cd: h[3].enfriamiento, grupo: 3 * 0.7 },
  { n: `${c[0].nombre} (${c[0].teclas})`, d: c[0].danio, mana: c[0].mana, cd: c[0].enfriamiento, grupo: 3 },
  { n: `${c[1].nombre} (${c[1].teclas})`, d: c[1].danio, mana: c[1].mana, cd: c[1].enfriamiento, grupo: 3 * 0.7 },
  { n: `${c[2].nombre} (${c[2].teclas})`, d: c[2].danio, mana: c[2].mana, cd: c[2].enfriamiento, grupo: 3 * 0.8 },
];
console.log('| Habilidad | Daño | Maná | Enfriamiento | Usos/s máx. | Daño/s (1 enemigo) | Daño a 3 enemigos | Daño por maná (grupo) |');
console.log('|---|---|---|---|---|---|---|---|');
for (const f of filas) {
  const usos = f.porSeg || (f.cd > 0 ? 1 / f.cd : 0);
  const grupo = Math.round(f.d * f.grupo);
  console.log(`| ${f.n} | ${f.d} | ${f.mana} | ${f.cd ? f.cd + ' s' : '—'} | ${usos.toFixed(2)} | ${Math.round(f.d * usos)} | ${grupo} | ${f.mana ? (grupo / f.mana).toFixed(1) : 'gratis'} |`);
}
// Un combo contra usar sus dos habilidades por separado (daño a 3 enemigos)
const gr = (i) => Math.round(filas[i].d * filas[i].grupo);
console.log('');
console.log(`Corte volador ${gr(4)} contra H1 + H3 ${gr(1) + gr(2)} · Torbellino ${gr(5)} contra H1 + H4 ${gr(1) + gr(3)} · Cataclismo ${gr(6)} contra H3 + H4 ${gr(2) + gr(3)}`);
console.log(`Maná: entra ${B.jugador.manaPorSegundo}/s + ${B.jugador.manaPorGolpe} por golpe (básico: ${B.jugador.manaPorGolpeBasico ?? B.jugador.manaPorGolpe}) + esferas ${B.esferasMana.mana} cada ${B.esferasMana.intervalo} s`);
