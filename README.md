# Bubu & Dudu: Stick Fighters

Juego 2D de acción y plataformas para navegador (HTML5 Canvas + JavaScript), para PC y celular.

## Cómo jugar

- **Rápido:** doble clic en `index.html`.
- **Para celular / otra PC en la misma red:** en esta carpeta ejecuta `python -m http.server 8123` y abre `http://<ip-de-tu-pc>:8123` en el navegador. En el celular, ponlo en horizontal.

## Prueba de personajes (`prueba-personajes.html`)

Página aparte, solo con Bubu (panda blanco) y Dudu (oso marrón) sobre un suelo plano, para revisar las hojas de sprites.
- Hojas copiadas en `assets/personajes/bubu/` y `assets/personajes/dudu/` (originales intactos en `BUBU ANIMADO` y `DUDU ANIMADO`).
- Configuración (cuadros esperados, fps, escala de cada hoja): `js/prueba/animaciones.js`.
- Los cuadros se detectan por los huecos transparentes (`js/prueba/cuadros.js`). Con doble clic se usan los datos guardados en `js/prueba/cuadros_datos.js`; si cambias una hoja, ábrela con servidor local y pulsa "Guardar datos de cuadros" en el visor.

## Estructura de archivos

```
index.html                 Página principal (carga todos los scripts en orden)
css/estilo.css             Menús, tienda y controles táctiles
assets/personajes/         bubu.png (panda blanco) y dudu.png (oso marrón), recortados de la foto original
assets/personajes/originales/  Fotos originales
assets/ropa/               (vacío) Aquí irán imágenes de ropa para reemplazar el dibujo por código

js/config.js               TODO lo ajustable: física, controles, habilidades, combos, enemigos,
                           jefes, revivir, versus, tienda y red
js/utilidades.js           Matemáticas, colisiones, aleatorio con semilla

js/entrada/input.js        Teclado -> EstadoControl por jugador (la lógica nunca lee el teclado)
js/entrada/tactil.js       Joystick, salto, H1–H4, deslizar entre botones = combinación

js/logica/                 SIMULACIÓN (sin dibujo): se puede correr en un servidor
  mundo.js                 Paso del juego, física, daño, oleadas, revivir, versus, monedas
  jugador.js               Bubu/Dudu: movimiento, doble salto, agacharse, daño, caído
  habilidades.js           H1 cuchilla, H2 tajo, H3 dash, H4 onda de choque
  combos.js                Corte volador, Torbellino relámpago, Cataclismo
  ataques.js               Golpe (zona de daño) y Proyectil
  enemigos.js              Stickman y su IA (normal hecho; arquero/mago/ninja preparados)
  jefes.js                 Gigante (hecho); los otros 3 jefes preparados
  escenarios.js            Datos de niveles: plataformas, oleadas, zona del jefe, arenas versus

js/dibujo/                 DIBUJO (solo lee el estado del mundo)
  render.js                Orden de dibujo y proyectiles
  camara.js                Cámara única con zoom que sigue a los dos jugadores
  fondos.js                Fondos con parallax (isla); aquí se agregan los demás
  personajes.js            Sprites de Bubu/Dudu con rebote, escala, giro e inclinación
  stickman.js              Enemigos y jefes dibujados con palitos
  ropa.js                  Prendas por capas (código), listas para cambiarse por imágenes
  efectos.js               Partículas, números de daño, explosiones, carteles de combo

js/ui/hud.js               Barras de vida (con barra de daño roja), energía, habilidades, jefe
js/ui/menus.js             Menú principal, selección, pausa, game over, victoria, versus
js/ui/tienda.js            Tienda de ropa + guardado en localStorage
js/red/red.js              Fase 2: cliente WebSocket, código de sala, instantáneas (preparado)
js/main.js                 Arranque y bucle (lógica a 60 pasos fijos por segundo)
```

## Controles

| | Un jugador | Jugador 1 (dos en teclado) | Jugador 2 |
|---|---|---|---|
| Mover | A/D o ←/→ | A/D | ←/→ |
| Saltar (2 veces = doble salto) | W, Espacio o ↑ | W o Espacio | ↑ |
| Agacharse (con salto: bajar de plataforma) | S o ↓ | S | ↓ |
| Habilidades H1–H4 | 1 2 3 4 o J K L I | 1 2 3 4 | 7 8 9 0 o numérico 1–4 |
| Revivir (mantener) | — | E | Shift der. / Enter / Num 0 |
| Pausa | Esc o P | Esc o P | Esc o P |

**Combinaciones:** dos habilidades vecinas casi a la vez, o una y la otra en menos de 250 ms.
En celular: tocar un botón y deslizar el dedo al vecino sin soltar.
H1+H2 Corte volador · H2+H3 Torbellino relámpago · H3+H4 Cataclismo.

Todas las teclas se cambian en `CONFIG.controles` (`js/config.js`).

## Qué falta (preparado para añadir)

- **Más escenarios:** los 4 niveles (Isla, Cielo, Espacio, Ciudad) están completos. Para agregar otro: datos en `js/logica/escenarios.js`, fondo en `js/dibujo/fondos_nuevos.js`, y si tiene enemigos o jefe propios, su IA en `js/logica/enemigos_nuevos.js` / `js/logica/jefes_nuevos.js`.
- **Online (fase 2):** ver comentarios en `js/red/red.js`. Hace falta un servidor WebSocket que reenvíe mensajes por sala.
- **Ropa con imágenes:** pon el PNG en `assets/ropa/` y su ruta en `imagen` dentro de `js/dibujo/ropa.js`.
