/* =====================================================================
   WORKER DE CLOUDFLARE: credenciales TURN de corta duración
   El juego hace GET a este Worker; el Worker pide a Cloudflare Realtime
   unas credenciales TURN válidas por 6 horas y devuelve SOLO el arreglo
   iceServers. Las claves NO están aquí: se leen de los secretos del Worker
     TURN_KEY_ID          (id de la llave TURN)
     TURN_KEY_API_TOKEN   (token de la API de esa llave)
   que se agregan a mano en el panel de Cloudflare.
   Solo responde a la dirección del juego (ORIGENES_PERMITIDOS en wrangler.toml).
   ===================================================================== */

const API = 'https://rtc.live.cloudflare.com/v1/turn/keys';
const TTL_SEGUNDOS = 21600;           // 6 horas de validez de las credenciales
const CACHE_MS = 30 * 60 * 1000;      // se reutilizan 30 minutos (menos llamadas a Cloudflare)
const LIMITE = { peticiones: 30, ventanaMs: 60 * 1000 }; // por IP y por minuto

// Memoria de esta instancia del Worker (se reinicia sola; el límite es aproximado)
let cache = null;                     // { iceServers, hasta }
const visitas = new Map();            // ip -> { n, desde }

function respuesta(cuerpo, estado, cabeceras) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cabeceras },
  });
}

function dentroDelLimite(ip) {
  const ahora = Date.now();
  if (visitas.size > 5000) visitas.clear();
  const v = visitas.get(ip);
  if (!v || ahora - v.desde > LIMITE.ventanaMs) { visitas.set(ip, { n: 1, desde: ahora }); return true; }
  v.n++;
  return v.n <= LIMITE.peticiones;
}

// Normaliza la respuesta de Cloudflare a un arreglo y quita las direcciones del
// puerto 53, que muchos navegadores bloquean y solo hacen esperar.
function limpiar(iceServers) {
  const lista = Array.isArray(iceServers) ? iceServers : [iceServers];
  return lista
    .filter(Boolean)
    .map((s) => {
      const urls = (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => u && !/:53(\?|$)/.test(u));
      return { ...s, urls };
    })
    .filter((s) => s.urls.length);
}

export default {
  async fetch(request, env) {
    const origen = request.headers.get('Origin') || '';
    const permitidos = (env.ORIGENES_PERMITIDOS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const permitido = permitidos.includes(origen);
    const cors = permitido
      ? { 'Access-Control-Allow-Origin': origen, 'Access-Control-Allow-Methods': 'GET', 'Vary': 'Origin' }
      : { 'Vary': 'Origin' };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: permitido ? 204 : 403, headers: { ...cors, 'Access-Control-Max-Age': '86400' } });
    }
    if (request.method !== 'GET') return respuesta({ error: 'Solo se aceptan peticiones GET' }, 405, cors);
    if (!permitido) return respuesta({ error: 'Origen no permitido' }, 403, cors);

    const ip = request.headers.get('CF-Connecting-IP') || 'desconocida';
    if (!dentroDelLimite(ip)) return respuesta({ error: 'Demasiadas peticiones, espera un minuto' }, 429, cors);

    if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) {
      return respuesta({ error: 'Faltan los secretos TURN_KEY_ID y TURN_KEY_API_TOKEN' }, 503, cors);
    }

    if (cache && Date.now() < cache.hasta) return respuesta(cache.iceServers, 200, cors);

    let r;
    try {
      r = await fetch(`${API}/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate-ice-servers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttl: TTL_SEGUNDOS }),
      });
    } catch (e) {
      return respuesta({ error: 'No se pudo contactar a Cloudflare' }, 502, cors);
    }
    if (!r.ok) return respuesta({ error: 'Cloudflare no entregó credenciales', estado: r.status }, 502, cors);

    const datos = await r.json();
    const iceServers = limpiar(datos.iceServers);
    if (!iceServers.length) return respuesta({ error: 'Respuesta sin servidores' }, 502, cors);
    cache = { iceServers, hasta: Date.now() + CACHE_MS };
    return respuesta(iceServers, 200, cors);
  },
};
