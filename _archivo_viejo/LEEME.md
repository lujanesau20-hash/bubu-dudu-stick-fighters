# _archivo_viejo

Archivos que el juego **ya no usa**. No se borraron: se movieron aquí por si hacen falta. Nada de esta carpeta se carga en el juego.

| Archivo | Antes estaba en | Motivo |
|---|---|---|
| `assets/personajes/bubu.png` | `assets/personajes/` | Sticker viejo de Bubu. Ya no lo usa ninguna pantalla: selección, HUD, tienda y juego usan las hojas de sprites (`config/personajes.js`). |
| `assets/personajes/dudu.png` | `assets/personajes/` | Sticker viejo de Dudu (pálido, rosado, con guantes rojos). Era el que aparecía cuando las hojas animadas fallaban en un celular. |
| `cuadros_datos.js` | raíz del proyecto | Copia suelta descargada desde el visor. El juego y la página de prueba usan `js/prueba/cuadros_datos.js`. |
| `js/red/red.js` | `js/red/` | Esqueleto antiguo de red con WebSocket ("fase 2"). Nunca se activó; el juego en línea usa `js/red/enlinea.js` y `js/red/sincronizacion.js`. |
| `codigo/personajes_imagen_fija.js` | (copia) | Copia de `js/dibujo/personajes.js` antes de la fuente única: carga de los stickers, dibujo con imagen fija y el respaldo que usaba el sticker viejo sin avisar. |

Si algo vuelve a hacer falta, se puede mover de vuelta a su carpeta original.
