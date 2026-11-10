# Reglas del proyecto (Bubu & Dudu — Stick Fighters)

Lee primero `ESTADO_DEL_JUEGO.md`: explica todo el juego, sus archivos y sus números.

## Siempre
- Lo que ya existe está bien: no cambiar jugabilidad, balance, controles, sprites, tienda, mundos, niveles ni interfaz, salvo que la tarea lo pida.
- Solo AGREGAR y MEJORAR. No reorganizar, no renombrar y no borrar archivos existentes.
- Copia de seguridad antes de cada tarea (etiqueta de git `respaldo-antes-...`).
- Todos los números en archivos de configuración: `config/balance.js` (juego), `config/red.js` (en línea), `config/interfaz.js` (tamaños y colores), `config/personajes.js` (fuente única de Bubu y Dudu).
- Bubu y Dudu se dibujan SIEMPRE desde `config/personajes.js` (hojas de sprites actuales). Nunca volver a usar los stickers viejos.
- Lo que ya no se usa no se borra: se mueve a `_archivo_viejo/` (con su motivo en `_archivo_viejo/LEEME.md`).
- Todo debe funcionar en solitario, pareja local y pareja en línea (el líder decide y sincroniza).
- Si algo choca con lo ya construido, explicarlo antes de cambiarlo.
- No tocar las hojas originales de `BUBU ANIMADO/` y `DUDU ANIMADO/`.
- Bubu = panda blanco con moño (líder en línea). Dudu = oso marrón (invitado).
- Comentarios del código en español, simples.
- Nunca escribir secretos (tokens, claves) en el código, el repositorio o el chat.

## Al terminar cada tarea
1. Actualizar `ESTADO_DEL_JUEGO.md` con lo que cambió y cómo probarlo.
2. Cambiar `VERSION_JUEGO` en `index.html` (fecha y número), para que los celulares bajen los archivos nuevos.
3. Hacer un commit con un mensaje claro.
4. La web pública solo se actualiza con `git push` (GitHub Pages tarda 1–2 minutos).
