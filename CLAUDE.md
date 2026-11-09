# Reglas del proyecto (Bubu & Dudu — Stick Fighters)

Lee primero `ESTADO_DEL_JUEGO.md`: explica todo el juego, sus archivos y sus números.

## Siempre
- Lo que ya existe está bien: no cambiar jugabilidad, balance, controles, sprites, tienda, mundos, niveles ni interfaz, salvo que la tarea lo pida.
- Solo AGREGAR y MEJORAR. No reorganizar, no renombrar y no borrar archivos existentes.
- Copia de seguridad antes de cada tarea (etiqueta de git `respaldo-antes-...`).
- Todos los números en archivos de configuración: `config/balance.js` (juego), `config/red.js` (en línea), `config/interfaz.js` (tamaños y colores).
- Todo debe funcionar en solitario, pareja local y pareja en línea (el líder decide y sincroniza).
- Si algo choca con lo ya construido, explicarlo antes de cambiarlo.
- No tocar las hojas originales de `BUBU ANIMADO/` y `DUDU ANIMADO/`.
- Bubu = panda blanco con moño (líder en línea). Dudu = oso marrón (invitado).
- Comentarios del código en español, simples.
- Nunca escribir secretos (tokens, claves) en el código, el repositorio o el chat.

## Al terminar cada tarea
1. Actualizar `ESTADO_DEL_JUEGO.md` con lo que cambió y cómo probarlo.
2. Hacer un commit con un mensaje claro.
3. La web pública solo se actualiza con `git push` (GitHub Pages tarda 1–2 minutos).
