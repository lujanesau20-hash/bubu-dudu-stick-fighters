# turn-worker

Worker de Cloudflare que entrega al juego credenciales TURN de corta duración (6 h) de **Cloudflare Realtime TURN**.

- **Petición:** `GET` desde `https://lujanesau20-hash.github.io` (único origen permitido, ver `wrangler.toml`).
- **Respuesta:** solo el arreglo `iceServers` (STUN + TURN de Cloudflare).
- **Límite:** 30 peticiones por minuto por IP. Las credenciales se reutilizan 30 minutos.
- **Secretos requeridos** (se agregan a mano, nunca en el código):
  - `TURN_KEY_ID`
  - `TURN_KEY_API_TOKEN`

  Dónde: panel de Cloudflare → **Workers & Pages** → `bubududu-turn` → **Settings** → **Variables and Secrets** → **Add** → tipo **Secret**.
  Sin ellos, el Worker responde `503` y el juego sigue funcionando solo con STUN.

## Desplegar
```bash
cd turn-worker
npx wrangler login
npx wrangler deploy
```
