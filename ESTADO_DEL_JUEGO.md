# Estado del juego: Bubu & Dudu — Stick Fighters

Documento para entender el proyecto sin haberlo visto antes. Describe cómo está el juego **hoy** (última tarea: servidor TURN de Cloudflare y cola de mensajes en línea; ver la sección 9).

- **Jugar en línea (web pública):** https://lujanesau20-hash.github.io/bubu-dudu-stick-fighters/
- **Repositorio:** https://github.com/lujanesau20-hash/bubu-dudu-stick-fighters
- **Copias de seguridad (etiquetas de git):** `respaldo-antes-tramos`, `respaldo-antes-pausa`, `respaldo-antes-red-ui`, `respaldo-antes-turn`

---

## 1. Qué es el juego y sus modos

Juego 2D de acción y plataformas para el navegador (HTML5 Canvas + JavaScript puro, sin instalaciones). Funciona en PC (teclado) y en celular (controles táctiles, en horizontal).

Los protagonistas son **Bubu** (oso panda **blanco**, con moño negro) y **Dudu** (oso **marrón**, sin moño). Pelean contra enemigos stickman (figuras de palitos) a lo largo de mundos con oleadas y jefes.

| Modo | Qué es |
|---|---|
| **Niveles en solitario** | Un jugador elige a Bubu o a Dudu y juega los niveles. |
| **Niveles en pareja** | Dos jugadores en el mismo teclado/pantalla, una cámara que sigue a los dos. Se puede revivir al compañero. |
| **Versus** | Bubu contra Dudu en una arena, al mejor de 3 rondas (solo local). |
| **Jugar en línea** | Dos personas en dispositivos distintos juegan "Niveles en pareja" con un código de sala de 4 números. |
| **Tienda** | Ropa para los personajes, comprada con monedas. |
| **Cómo jugar** | Pantalla con pestañas: Controles, Habilidades, Combos, Consejos. |

### Mundos y niveles
| Mundo | Niveles | Enemigo típico | Jefe |
|---|---|---|---|
| 1. Isla Flotante | **10 niveles** (por tramos) | stickman normal, espadachín, arquero; desde el nivel 4 ninja; desde el 5 mago | **El Gigante** (solo en el nivel 10) |
| 2. Cielo con Nubes | 1 nivel | arqueros | Arquero Maestro |
| 3. Espacio | 1 nivel | magos | Mago Cósmico |
| 4. Calle de la Ciudad | 1 nivel | ninjas | Ninja Sombra |

Los niveles se desbloquean **en orden**: para jugar el nivel 2 hay que pasar el 1; el Mundo 2 se abre al terminar el nivel 10 de la Isla, y así sucesivamente. En **todos** los mundos aparecen también arqueros/magos y aves voladoras (ver sección 3).

---

## 2. Estructura de carpetas y archivos

```
index.html                  Página del juego. Carga todos los scripts EN ORDEN (el orden importa).
prueba-personajes.html      Página aparte para revisar las hojas de sprites (visor de animaciones).
robots.txt                  Pide a los buscadores no indexar (ver límites).
.nojekyll                   Necesario para GitHub Pages.
README.md                   Resumen corto del proyecto.
ESTADO_DEL_JUEGO.md         Este documento.
CLAUDE.md                   Reglas de trabajo del proyecto (para quien programe).
cuadros_datos.js            (raíz) Copia suelta descargada desde el visor. NO se usa; el bueno está en js/prueba/.

config/
  interfaz.js               Tamaños, opacidades y colores de la interfaz (indicadores H1–H4, botón Pausa,
                            aviso de pausa) y del dibujo del ave. Solo cambia cómo se VE el juego.
  balance.js                ★ TODOS los números de equilibrio (vida, maná, daño, enfriamientos, corazones,
                            oleadas, niveles, refuerzos, aves...). Se aplica encima de js/config.js.
  red.js                    Configuración del juego en línea (prefijo de sala, STUN/TURN, ritmos, tiempos).

js/
  config.js                 Configuración base: física, controles (teclas), personajes, habilidades,
                            combos, enemigos, jefes, revivir, versus, tienda. balance.js sobrescribe parte.
  utilidades.js             Matemáticas, colisiones, aleatorio con semilla.
  main.js                   Arranque y bucle del juego (lógica a 60 pasos fijos/s), estados (menú,
                            carga, jugando, pausa, fin), iniciar/reiniciar/siguiente nivel.

  entrada/
    input.js                Teclado → "EstadoControl" por jugador (la lógica nunca lee el teclado).
    tactil.js               Joystick, botón de salto, H1–H4 y deslizar entre botones (combos).

  logica/                   SIMULACIÓN (no dibuja nada). La ejecuta solo el anfitrión en línea.
    mundo.js                El "mundo": física, daño, oleadas/tramos, corazones, refuerzos, revivir,
                            versus, victoria/derrota, cupos de enemigos a distancia y aves.
    jugador.js              Bubu/Dudu: movimiento, doble salto, agacharse, daño, caído, revivir.
    habilidades.js          H1 cuchilla, H2 tajo, H3 dash, H4 onda de choque.
    combos.js               Detección de combinaciones y los 3 combos.
    ataques.js              Golpe (zona de daño, con daño de área por distancia) y Proyectil.
    enemigos.js             Clase Enemigo, IA del stickman normal (también usada por el espadachín).
    enemigos_nuevos.js      IA de arquero, mago, ninja y AVE; ayudas para disparar (DISPAROS).
    jefes.js                Clase Jefe y el Gigante.
    jefes_nuevos.js         Arquero Maestro, Mago Cósmico, Ninja Sombra.
    escenarios.js           Datos de los mundos 2–4, del escenario base de la isla y de la arena versus.
    niveles_isla.js         Genera los 10 niveles de la Isla a partir de config/balance.js y define el
                            orden de juego (ORDEN_NIVELES) y el avance (PROGRESO: desbloqueos).

  dibujo/                   DIBUJO (solo lee el estado del mundo).
    render.js               Orden de dibujo, proyectiles, corazones.
    camara.js               Cámara única con zoom (sigue a los dos jugadores).
    fondos.js               Fondo con parallax de la Isla (y ayudas para otros fondos).
    fondos_nuevos.js        Fondos de Cielo, Espacio y Ciudad.
    personajes.js           Dibujo de Bubu/Dudu con hojas de sprites animadas (y respaldo con imagen fija).
    stickman.js             Enemigos y jefes con palitos, accesorios por tipo, y el AVE.
    ropa.js                 Prendas de la tienda dibujadas por código (preparadas para imágenes).
    efectos.js              Partículas, números de daño, anillos, explosiones, carteles.

  ui/
    hud.js                  Barras de vida/maná, íconos de habilidades y combos, monedas, tramo, jefe, ping.
    menus.js                Menú principal, selección de personaje, victoria, game over, Cómo jugar,
                            pantallas de carga con consejos.
    selector_niveles.js     Lista de mundos y niveles con candados (igual en solo, pareja y en línea).
    pausa.js                Botón "Pausa" y menús de pausa (local, líder, invitado), getNombreJugador().
    depuracion.js           Panel de depuración oculto (F3 o 5 toques en la esquina superior izquierda).
    menu_enlinea.js         Pantallas en línea: crear sala, unirse (teclado numérico), conectado, avisos.
    tienda.js               Tienda de ropa y GUARDADO en localStorage (monedas, compras, avance).

  red/
    enlinea.js              Sesión en línea con PeerJS: salas, mensajes, ping, pausa en línea,
                            desconexión y reentrada.
    sincronizacion.js       Instantáneas del estado (anfitrión), formato compacto y su lectura, e
                            interpolación/predicción (invitado).
    red.js                  Esqueleto antiguo con WebSocket (fase 2 original). No se usa.

  prueba/                   Hojas de sprites: configuración de animaciones y detección de cuadros
    animaciones.js          Qué hoja es cada animación, fps, escala de cada hoja.
    cuadros.js              Detecta los cuadros de cada hoja por los huecos transparentes.
    cuadros_datos.js        Cuadros ya detectados (para abrir el juego con doble clic).
    personaje.js, visor.js, prueba.js   Solo para prueba-personajes.html.

assets/personajes/
  bubu/, dudu/              Hojas de sprites animadas (una fila de cuadros por animación).
  bubu.png, dudu.png        Imágenes fijas (retratos del HUD, tienda, selección).
BUBU ANIMADO/, DUDU ANIMADO/  Hojas ORIGINALES entregadas (no se tocan; se copiaron a assets/).

turn-worker/                Worker de Cloudflare que entrega credenciales TURN al juego (se despliega aparte).
  src/index.js              El Worker: solo GET desde la web del juego, límite de peticiones, sin secretos.
  wrangler.toml             Nombre del Worker y origen permitido. Los secretos van en el panel de Cloudflare.
  .gitignore, README.md     Archivos locales con secretos que nunca se suben; cómo desplegar.

herramientas/               Simulaciones para la consola del navegador (no forman parte del juego).
  simular_jefe.js           Pelea contra un jefe con un jugador automático.
  simular_niveles.js        Oleada de 7, nivel completo, tabla de niveles, jefe con refuerzos.
  simular_red.js            Simula ping/variación para medir la suavidad del invitado en línea.
```

**Separación importante:** la lógica (`js/logica/`) no dibuja ni lee el teclado. Recibe controles y emite "eventos" que el dibujo convierte en efectos. Gracias a eso funciona el modo en línea.

---

## 3. Cómo funciona cada sistema

### Controles
| | Un jugador | Jugador 1 (pareja) | Jugador 2 (pareja) |
|---|---|---|---|
| Mover | A/D o ←/→ | A/D | ←/→ |
| Saltar (2 veces = doble salto) | W, Espacio o ↑ | W o Espacio | ↑ |
| Agacharse (con salto: bajar de plataforma) | S o ↓ | S | ↓ |
| Habilidades H1–H4 | 1 2 3 4 o J K L I | 1 2 3 4 | 7 8 9 0 o numérico 1–4 |
| Revivir (mantener) | — | E | Shift der. / Enter / Num 0 |
| Pausa | Esc, P o botón "Pausa" | igual | igual |

**Celular:** joystick a la izquierda (abajo = agacharse), botón ▲ de salto a la derecha, H1–H4 en arco alrededor del salto, botón ♥ para revivir que aparece junto al compañero caído, botón "Pausa" arriba a la derecha. Pide pantalla horizontal. Las teclas se cambian en `js/config.js → controles`.

### Habilidades y maná
- Cada jugador tiene **100 de vida** y **100 de maná** (barra azul). El maná sube solo y con cada golpe acertado.
- Si no alcanza el maná, la habilidad no sale, el ícono se ve apagado y aparece "Sin maná".
- **Un ataque no interrumpe a otro:** tras H1/H2/H4 hay un pequeño "bloqueo" en que no sale otro ataque (los combos sí pueden salir).
- **H1 Daga:** saltito + cuchilla lanzada. **H2 Espada:** tajo en arco al frente. **H3 Flash:** dash que atraviesa enemigos (invulnerable). **H4 Onda de choque:** golpe al suelo de área (si estás en el aire, primero caes en picada).
- **Daño de área (H4, Torbellino, Cataclismo):** 100% al enemigo más cercano al centro; los demás reciben menos según la distancia (medida al borde del enemigo), hasta un mínimo de 40% en el borde.
- **Golpes y enemigos:** ningún golpe deja al enemigo "tieso". H1 y H2 no lo empujan. H3, H4 y los combos le dan un **empujón corto** (≈1.5 pasos) y el enemigo sigue atacando enseguida. Igual para jefes, aves y refuerzos. El retroceso que **recibe el jugador** no cambió.

### Combinaciones (solo 3, entre habilidades vecinas)
| Combo | Teclas | Qué hace |
|---|---|---|
| Corte volador | H1+H2 | Onda de corte enorme que atraviesa enemigos |
| Torbellino relámpago | H2+H3 | Dash con espada giratoria, daño de área en varios golpes |
| Cataclismo | H3+H4 | Salta al aire y cae con una explosión de área |

- **PC:** pulsar las dos teclas casi a la vez, o una y la otra en menos de 250 ms.
- **Celular:** tocar un botón y, sin soltar, deslizar el dedo al vecino.
- La primera habilidad sale al instante; si llega la segunda a tiempo se convierte en combo y se devuelve el maná de la primera.

### Enemigos
| Enemigo | Comportamiento |
|---|---|
| Stickman normal (rojo) | Persigue y da puñetazos (avisa con "!") |
| Espadachín (naranja, casco) | Como el normal pero con espada: más alcance |
| Arquero (verde, capucha) | Guarda distancia y dispara flechas en arco |
| Mago (morado, sombrero) | Orbes que **persiguen** al jugador; se teletransporta si te acercas |
| Ninja (gris azulado, cinta roja) | Muy rápido, esquiva saltando, lanza shurikens |
| Ave de fuego (naranja con cresta, cola y patitas rojas, vuela) | Ave **estilo stickman**: cuerpo de palitos, cabeza redonda con ojitos y pico, alas de líneas gruesas que baten (4 cuadros). Vuela a media altura y lanza una **bola de fuego en línea recta** hacia donde estabas (no te sigue). Al prepararse sube las alas, echa la cabeza atrás y el pico brilla; al lanzar abre el pico y baja las alas |

- **Enemigos a distancia (arqueros y magos):** en cada tramo hay un mínimo y un máximo según el nivel; nunca más de 5 vivos a la vez. Vale para todos los mundos.
- **Aves:** al menos 1 por nivel desde el nivel 1 de cada mundo; sube hasta 5 en los niveles altos. Cuentan dentro del límite de vivos.

### Jefes
| Jefe | Ataques |
|---|---|
| **El Gigante** (Isla, nivel 10) | Puñetazo, pisotón con ondas por el suelo (hay que saltarlas) y, en furia (<50% vida), embestida |
| **Arquero Maestro** (Cielo) | Ráfagas de flechas, lluvia de flechas sobre zonas marcadas en rojo, salta hacia atrás |
| **Mago Cósmico** (Espacio) | Orbes que persiguen, meteoritos sobre zonas naranja, teletransporte, anillo de orbes en furia |
| **Ninja Sombra** (Ciudad) | Cortes veloces que atraviesan, abanico de shurikens, desaparece y sale por detrás |

- Todos entran cayendo del cielo con su nombre en pantalla y tienen barra de vida propia.
- **Refuerzos:** durante cualquier pelea de jefe cae 1 enemigo cada 15 s (normal, espadachín, ninja, arquero o mago), máximo 2 vivos. Los de cuerpo a cuerpo caen cerca de los jugadores; los de distancia, lejos pero en pantalla.

### Oleadas y tramos
- Un **nivel** es una serie de **tramos**; un **tramo** es una serie de **oleadas**.
- Al entrar en un tramo, la zona se cierra (barreras rojas). Las oleadas salen una tras otra: la siguiente aparece cuando se limpió la anterior.
- Nunca hay más de 12 enemigos vivos a la vez (el resto de la oleada entra a medida que mueren).
- Al limpiar la última oleada del tramo aparece **"¡ADELANTE!"**, cada jugador recupera **40% de vida** y se avanza al siguiente tramo.
- En pantalla: indicador **"Nivel X · Tramo X/Y"**. Al final: pantalla "¡NIVEL SUPERADO!" con monedas y botón **"Siguiente nivel"**.
- Los mundos 2–4 usan el formato antiguo (3 zonas con grupos de enemigos y luego el jefe), con las reglas de cupos y aves aplicadas encima.

### Corazones
- Cada 18 s de juego (el contador se detiene en pausa y se reinicia en cada nivel) cae del cielo un corazón que cura el **30%** de la vida máxima.
- **Solitario:** 1 corazón. **Pareja (local o en línea):** 2 a la vez, separados, uno cerca de cada jugador.
- Dura 12 s; parpadea los últimos 3 y desaparece. No lo recoge quien tiene la vida llena.
- El corazón está dibujado por código (`dibujarCorazon` en `js/dibujo/render.js`), listo para cambiarlo por una imagen.

### Revivir (pareja)
Si un jugador cae, queda en el suelo 15 s con una cuenta regresiva. El compañero, a su lado, mantiene la tecla de revivir 4 s (círculo de progreso; si lo golpean se interrumpe). Revive con 30% de vida. Máximo 2 revivires por nivel. Si los dos caen: game over.

### Tienda y monedas
- Los enemigos sueltan monedas que vuelan hacia el jugador; cada nivel da además un bono.
- Tienda: 7 conjuntos de ropa (calle → oro) y 4 piezas de cabeza (gorra, casco, sombrero, corona), combinables. Se ven en la vista previa de la tienda y en los retratos (ver límites).

### Guardado
Todo se guarda en el navegador (`localStorage`, clave `bubududu_guardado_v1`): monedas, ropa comprada y equipada, niveles superados (avance de mundos) y si ya se vio "Cómo jugar". No se sincroniza entre dispositivos.

### Multijugador en línea
- **Crear sala:** genera un código de 4 números (prefijo `bubududu-` en el servidor). Botones "Copiar código" y "Compartir enlace" (`?sala=1234`, que entra directo).
- **Unirse:** teclado numérico en pantalla. Mensajes si la sala no existe, está llena o falla la conexión. Solo 2 personas por sala.
- **Quien crea la sala es el LÍDER (Bubu)**; quien se une es el **INVITADO (Dudu)**. El líder elige el nivel.
- **Conexión:** WebRTC directo con **PeerJS 1.5.4** (cdnjs), servidor público gratuito de PeerJS para emparejar y servidores STUN públicos.
- **Sincronización:** el líder ejecuta toda la simulación. El invitado envía solo sus controles (30/s y, además, apenas cambia una tecla) y recibe el estado (snapshots) **20 veces por segundo, a ritmo estable**. Dibuja a los demás con interpolación suave y unos 100 ms de retraso, y mueve a su propio personaje al instante (predicción) con corrección suave hacia lo que dice el líder.
- **Dos canales:** los snapshots van por un **canal rápido** (sin orden y sin reenvíos: si uno se pierde, se usa el siguiente). Todo lo importante va por el **canal fiable**: controles, efectos visuales, pausa, fin de nivel, muerte, reentrada. El canal rápido es un canal WebRTC "negociado" (mismo id en los dos lados) sobre la misma conexión de PeerJS.
- **Formato compacto:** los snapshots son listas de números redondeados (px enteros). Los datos fijos (tipo de enemigo, vida máxima, color y radio de proyectiles) solo se mandan las primeras 10 veces que aparece algo y cada 20 snapshots. El invitado los recuerda y rearma el estado con la misma forma que antes.
- **Líder lento:** si el líder baja de 40 FPS durante 2 s (por ejemplo un celular), envía 15 snapshots por segundo en vez de 20.
- **Ping** visible abajo a la izquierda.
- **Servidor TURN (Cloudflare):** al crear o unirse a una sala, el juego pide credenciales TURN de 6 horas al Worker (`RED_CONFIG.turnWorker.url`) y las agrega a los STUN. WebRTC intenta primero la conexión directa y usa el relevo TURN solo si la directa falla (por ejemplo, entre ciudades o con datos móviles). Si el Worker no responde en 4 s o no tiene secretos, se juega solo con STUN como antes, sin bloquear la sala.
- **Canales:** snapshots y controles por el **canal rápido** (sin orden ni reenvíos; los controles llevan contadores de pulsaciones, así que un mensaje perdido no hace perder un salto o un ataque). El ping va por **su propio canal** pequeño. Pausa, fin de nivel, efectos, reentrada y salida van por el **canal fiable**.
- **Cola:** si hay más de 4000 bytes esperando en el canal rápido (16000 en el fiable), el snapshot se descarta y sale el siguiente, más nuevo. Así nunca se juntan segundos de retraso.
- **Panel de depuración** (oculto): **F3** en la laptop o **5 toques seguidos en la esquina superior izquierda** en el celular. Muestra: rol (líder/invitado), ping (y por qué canal), ida y vuelta real de la red (WebRTC), snapshots por segundo, tamaño promedio de cada snapshot (en rojo si pasa de 1500 bytes), FPS, **tipo de conexión** (directa en la red local / directa por el router / **TURN (relevo)**), canal rápido, **estado del TURN** (listo / no disponible, en rojo), cola del canal rápido y del fiable, ritmo de envío y snapshots descartados por segundo (líder).
- **Si el invitado se va:** el líder **sigue jugando**; aviso "Dudu salió. Puede volver con el código". El invitado puede volver a entrar a mitad de partida con el mismo código: reaparece en un costado de la pantalla, cayendo, con la vida que tenía.
- **Si el líder se va:** el invitado ve "La sala se cerró" y vuelve al menú.
- **En celular:** pide horizontal y evita que se apague la pantalla (requiere HTTPS).

### Pausa
- **Botón "Pausa"** arriba a la derecha (dedo o mouse) y tecla **Esc**. Mide 78×44 px en celular (área táctil mínima de 44 px) y 74×34 px en laptop. En pareja, la barra del jugador 2 se corre a la izquierda para que el botón no tape su retrato.
- **Solitario y pareja local:** congela todo. Menú: **Continuar**, **Reiniciar nivel**, **Salir al menú** (+ enlace pequeño "Cómo jugar").
- **En línea, LÍDER:** pausa directamente a los dos. Menú: **Reanudar**, **Reiniciar nivel**, **Finalizar juego** (manda a los dos al menú principal).
- **En línea, INVITADO:** su botón solo **pide** pausa. Al líder le aparece arriba "**[nombre] quiere pausar**" en un recuadro pequeño de **color sólido amarillo-naranja** con texto oscuro, botón **Aceptar** verde e **Ignorar** gris, y una barra fina que se vacía mostrando el tiempo restante; si no responde, desaparece a los 5 s y no se pausa. En pausa, el invitado ve **Reanudar**, **Salirse del juego** y "Esperando al líder para reiniciar o finalizar".
- **Reanudar en línea:** cada uno toca Reanudar y aparece un ✓ junto a su nombre; con los dos ✓ el juego sigue. Si el invitado no está, el líder reanuda solo.
- El nombre del aviso sale de `getNombreJugador(jugador)` (`js/ui/pausa.js`), que hoy devuelve "Bubu" o "Dudu".

---

## 4. Números de balance y dónde están

Todo lo de esta sección está en **`config/balance.js`** salvo que se indique otro archivo. Cambiar un número y recargar la página es suficiente.

### Jugador — `BALANCE.jugador`
| Valor | Número |
|---|---|
| Vida máxima / maná máximo | 100 / 100 |
| Maná al empezar | 50 |
| Maná por segundo / por golpe acertado | 5 / 2 |
| Curación al limpiar un tramo (`curaPorTramo`) | 40% |

### Habilidades — `BALANCE.habilidades`
| | Maná | Enfriamiento | Daño | Otros |
|---|---|---|---|---|
| H1 Daga | 2 | 0 s | 4 | bloqueo 0.30 s |
| H2 Espada | 4 | 0 s | 10 | bloqueo 0.35 s |
| H3 Flash | 10 | **3 s** | 30 | — |
| H4 Onda de choque | 20 | **7 s** | 80 (área) | radio 250 px, bloqueo 0.35 s |

### Combos — `BALANCE.combos`
| | Maná | Enfriamiento | Daño | Radio |
|---|---|---|---|---|
| Corte volador | 12 | 3 s | 28 | — |
| Torbellino relámpago | 25 | **10 s** | 70 total en 6 golpes (área) | 135 px |
| Cataclismo | 45 | **20 s** | 160 (área) | **260 px** (antes 520) |

Otros de combos en `js/config.js → combos`: ventana PC 250 ms, ventana táctil 900 ms, enfriamiento común entre combos 1 s.

### Empujón y área
- `BALANCE.empujon`: 1.5 pasos × 40 px = **60 px**, a 700 px/s.
- `BALANCE.areaDanio`: mínimo **40%** en el borde, curva 1 (lineal), 100% al más cercano.

### Vida de enemigos y jefes — `BALANCE.enemigos`
- Fórmula: **vida = 70 × 1.15^(nivel − 1)** (compuesta).
- Por nivel: 1: 70 · 2: 81 · 3: 93 · 4: 106 · 5: 122 · 6: 141 · 7: 162 · 8: 186 · 9: 214 · 10: 246. Mundos 2–4 usan los niveles 11, 12, 13 (283, 326, 375) — `BALANCE.mundos[].nivelVida`.
- Jefes: **10 × enemigo de su nivel**. Excepción: **Gigante = 1700 fijo** (`BALANCE.isla.niveles[9].vidaJefe`). Jefes de los mundos 2–4: 2830, 3260, 3750.
- Pareja: 1.5× cantidad de enemigos, 1.6× vida del jefe.

### Daño de enemigos — `BALANCE.danioEnemigos`
| Enemigo | Daño |
|---|---|
| normal / espadachín / arquero / ninja / mago / ave | 4 / 5 / 3 / 4 / 4 / 4 |
| Gigante (puño / pisotón / embestida) | 9 / 8 / 11 |
| Arquero Maestro (flecha / lluvia) | 7 / 9 |
| Mago Cósmico (orbe / meteoro) | 6 / 11 |
| Ninja Sombra (corte / shuriken) | 9 / 4 |

### Isla Flotante — `BALANCE.isla`
| Nivel | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Tramos | 7 | 8 | 9 | 10 | 11 | 11 | 11 | 12 | 12 | 10 + Gigante |
| Duración estimada | ~3–4 min | ~4–5 | ~6 | ~6–7 | ~8–10 | ~9 | ~10 | ~11 | ~12 | ~13 |

- Oleadas por tramo: base **[3, 4, 7]** × m, con m = 1 + 0.12 × (tramo − 1) + 0.06 × (nivel − 1), redondeado. Máximo 15 por oleada; **12 vivos** a la vez.
- Tipos desde el nivel (`tiposDesde`): normal 1, espadachín 1, arquero 1, ninja 4, mago 5. Frecuencias (`pesos`): normal 3, espadachín 2, arquero 1.5, ninja 1.5, mago 1.
- Largo del mapa por tramo: 1000 px.

### Enemigos a distancia y aves — `BALANCE.distancia`, `BALANCE.aves`
| Nivel dentro del mundo | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| A distancia por tramo (mín–máx) | 1–3 | 1–3 | 1–3 | 1–3 | 2–4 | 2–4 | 2–4 | 2–5 | 3–5 | 3–5 |
| Aves en el nivel | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 |

Máximo 5 a distancia vivos a la vez. Aves: vuelan a 180 px del suelo; bola de fuego a 420 px/s, recta.

### Corazones y refuerzos
- `BALANCE.corazones`: cada **18 s**, curan **30%**, duran 12 s (parpadeo 3 s), 1 en solitario / 2 en pareja, separados al menos 300 px.
- `BALANCE.refuerzos`: cada **15 s**, máximo **2** vivos; cerca 120–320 px, lejos 420–620 px.

### En línea
- `BALANCE.reentrada`: aparece a 420 px del líder, cae desde 480 px, 2.5 s invulnerable, 30% de vida si salió estando caído.
- `config/red.js`: prefijo `bubududu-`, 4 dígitos, controles 30/s (`controlesPorSegundo`) más un envío inmediato al cambiar una tecla, snapshots **20/s** (`estadosPorSegundo`, antes 25), colchón de interpolación **100 ms** (`retrasoInterpolacion`, antes 110), aviso de TURN a los 15 s, 6 s sin mensajes = desconectado, lista vacía `turn` para agregar un servidor TURN.
- `RED_CONFIG.liderLento`: si el líder va a menos de **40 FPS** durante **2 s**, baja a **15** snapshots/s.
- `RED_CONFIG.canalRapido`: `activo: true`, `id: 50` (id del canal negociado; poner `activo: false` vuelve a mandar todo por el canal fiable).
- `RED_CONFIG.compacto`: `activo: true` (false = formato anterior), datos fijos en los primeros **10** snapshots de cada cosa nueva y cada **20** snapshots, `avisoBytes: 1500` (el panel marca en rojo si se pasa).
- `RED_CONFIG.depuracion`: tecla `F3`, **5** toques en **2 s** dentro de los **70 px** de la esquina superior izquierda.

### Interfaz — `config/interfaz.js` (`CONFIG.interfaz`)
| Valor | Número |
|---|---|
| Indicadores H1–H4 y combos: escala en celular / laptop | **1.35** (+35%) / **1.1** (+10%) |
| Indicadores: opacidad | **0.75** (sin desenfoque) |
| Indicadores: contorno oscuro del ícono | 1.5 px (las letras ya tienen contorno oscuro fino) |
| Botón Pausa en celular (alto × ancho, letra) | **44 × 78 px**, 16 px |
| Botón Pausa en laptop (alto × ancho, letra) | **34 × 74 px**, 15 px |
| Botón Pausa: margen / opacidad | 6 px / 0.85 |
| Correr la barra del jugador 2 (`apartarHudJugador2`) | sí |
| Aviso de pausa: duración / fondo / opacidad | **5 s** / `#ffb52e` / **0.96** |
| Aviso: texto / Aceptar / Ignorar / barra de tiempo | `#1a1a2e` / `#40c057` / `#adb5bd` / 3 px |
| Ave: escala del dibujo / aleteos por segundo / cuadros | **1.2** / 3 / 4 |
| Ave: color de detalles / pico / imagen | `#e03131` / `#ffc078` / `null` (ruta para reemplazarla por una imagen) |

### Otros (en `js/config.js`)
- Revivir: 15 s caído, 4 s para revivir, distancia 115 px, vuelve con 30%, máximo 2 por nivel.
- Versus: gana quien llega a 2 rondas; daño ×0.8; invulnerabilidad tras golpe 0.35 s.
- Monedas: bono de 60 por nivel superado.
- Tienda (precios): ropa 40, 90, 160, 260, 400, 600, 900; cabeza 30, 80, 140, 500.
- Jugador: velocidad 340, salto 860, doble salto 760, invulnerable 0.6 s tras golpe, separación máxima en pareja 820 px.

---

## 5. Decisiones tomadas y reglas que no deben cambiar

**Identidad y sprites**
- **Bubu = panda blanco (con moño). Dudu = oso marrón (sin moño).** En línea, el líder es Bubu y el invitado es Dudu.
- Los sprites son las hojas originales: no se redibujan, no se recolorean ni se deforman. Una sola escala por personaje (Dudu un 6% más grande); para mirar a la izquierda se voltea la imagen. Los originales de `BUBU ANIMADO/` y `DUDU ANIMADO/` no se tocan.

**Forma de trabajar en el proyecto**
- Todos los números van en `config/balance.js` (los de red en `config/red.js` y los de la interfaz en `config/interfaz.js`).
- Al terminar cada tarea se actualiza este documento y se hace un commit con un mensaje claro.
- No renombrar, reorganizar ni borrar archivos existentes; solo agregar y mejorar.
- Hacer una copia de seguridad (commit o etiqueta de git) antes de cada tarea grande.
- Si un pedido choca con lo ya construido, explicarlo y preguntar antes de cambiarlo.
- Todo debe funcionar en solitario, pareja local y pareja en línea.
- La lógica no dibuja ni lee el teclado (necesario para el modo en línea).

**En línea**
- El líder (anfitrión) decide y simula todo; el invitado solo envía controles.
- Solo el líder pausa directamente, reinicia o finaliza; el invitado pide pausa y puede salirse.
- Si el invitado se va, el líder sigue jugando sin parar.
- Salas de 2 personas, código de 4 números, sin lista pública de salas, página con `noindex`.
- El nombre en los avisos sale siempre de `getNombreJugador()`.

**Juego y balance (elegidos por la dueña del proyecto)**
- Vida base 70 × 1.15 por nivel (se mantuvo aunque la oleada de 7 se limpie más rápido que el objetivo inicial de 20–25 s).
- Jefe final (Gigante) con 1700 de vida fija.
- Corazones: 30% cada 18 s; 1 en solitario, 2 en pareja.
- Mundo 1 con 10 niveles; los mundos se desbloquean en orden.
- Golpes sin aturdir; empujón corto solo con H3, H4 y combos.
- Enfriamientos: H3 3 s, H4 7 s, Torbellino 10 s, Cataclismo 20 s; Corte volador 3 s.
- Radio del Cataclismo 260 px (la mitad del anterior); el efecto visual mide lo mismo.
- Los orbes de los magos **siguen persiguiendo**; la bola de fuego del ave va **recta**.
- El retroceso que recibe el jugador no se toca.
- "Cómo jugar" y las tablas toman sus números del balance (siempre coinciden).

---

## 6. Pendientes e ideas futuras

- **Reajustar la dificultad** tras los últimos cambios (sin aturdir, enfriamientos más largos, arqueros y aves desde el nivel 1). Simulación más reciente en solitario: nivel 1 gana 5/6, nivel 3 4/6, nivel 5 2/6, niveles 8 y 10 0/6; en pareja el nivel 3 3/3 y el 8 1/3. Pendiente de que la dueña lo pruebe.
- Revisar la vida de los jefes de los mundos 2–4 (2830–3750 con la regla de 10×): no se volvieron a simular con las reglas nuevas y probablemente son demasiado duros.
- Más niveles para los mundos 2, 3 y 4 (hoy tienen 1 cada uno).
- **Versus en línea:** la sincronización ya envía rondas y ganador; falta activarlo (`RED_CONFIG.modos`) y agregar el botón.
- Nombre de usuario en lugar del personaje (cambiar solo `getNombreJugador`).
- Mostrar la ropa de la tienda sobre los sprites animados (hace falta ubicarla cuadro por cuadro).
- Hojas que faltan: salto simple de Bubu (hoy por código) y un segundo cuadro de dash de Bubu que no esté cortado.
- Cambiar el corazón y las prendas dibujadas por imágenes (ya preparado).
- Servidor TURN: ya está el Worker; falta que la dueña agregue los dos secretos en Cloudflare (ver sección 9).
- **Probar la red nueva en los dos dispositivos reales** con el panel de depuración (F3 / 5 toques) y anotar aquí: ping, ida y vuelta de la red, snapshots/s recibidos, tamaño, FPS y tipo de conexión del celular.
- Si aun así el celular se traba siendo invitado: usar la laptop como líder (es quien simula todo) y revisar los FPS del celular en el panel.
- Opcional: diferencias completas entre snapshots (solo lo que cambió) si algún nivel supera los 1500 bytes; hoy no hace falta (máximo medido 1407).
- Sonido y música (el juego no tiene audio).
- Guardar el avance en la nube para usarlo en varios dispositivos.

---

## 7. Errores y límites conocidos

**Dificultad**
- Con el balance actual, los niveles altos de la Isla son muy difíciles en solitario (ver sección 6).
- La simulación usa un "jugador promedio" automático más torpe que una persona: no esquiva todo ni prioriza bien. Sus números son orientativos.

**Visual**
- La ropa comprada no se ve sobre los sprites animados en el juego (sí en la tienda y en los retratos).
- Los retratos del HUD y de la selección usan las fotos fijas antiguas de los stickers.
- Para que el botón "Pausa" no tape el retrato del jugador 2, en pareja su barra queda un poco más a la izquierda (se puede desactivar con `apartarHudJugador2: false`).
- El ave se dibuja un 20% más grande que su zona de golpe (que no cambió): las puntas de las alas no reciben golpes.
- El botón de pausa táctil antiguo ("II", abajo al centro) está oculto, no borrado.
- La primera carga descarga unos 16 MB de hojas de sprites (lenta con datos móviles; luego queda en caché).

**En línea**
- Depende del servidor público y gratuito de PeerJS: puede fallar o estar lento sin aviso.
- Sin los secretos del Worker (o si el Worker no responde), no hay TURN y algunas redes móviles o de empresa no logran conectar (se avisa a los 15 s).
- El límite de peticiones del Worker (30 por minuto por IP) es aproximado: se cuenta en cada instancia del Worker.
- El Worker solo acepta la web publicada (`https://lujanesau20-hash.github.io`): al probar en `localhost` el TURN aparece como "no disponible" y se usa solo STUN (es lo esperado).
- El líder debe mantener el juego en primer plano: si cambia de pestaña o bloquea el celular, el navegador frena el juego para los dos.
- Con el canal rápido, un snapshot perdido no se reenvía: el invitado interpola con el siguiente (a 20/s, un hueco de 50 ms no se nota). Si el navegador no permite el canal rápido, todo vuelve al canal fiable automáticamente.
- El invitado ve a los demás con ~0.1 s de retraso; los golpes y el daño los decide el líder, así que al invitado le llegan con un poco de demora. Durante dash, combos o al recibir golpes no hay predicción.
- Mantener la pantalla encendida y copiar al portapapeles solo funcionan con HTTPS.
- Las monedas y el avance se guardan en cada dispositivo por separado.
- Si un jugador sale y la partida ya terminó, ambos vuelven a la sala para elegir nivel.

**Otros**
- `robots.txt` no tiene efecto en GitHub Pages (solo se lee en la raíz del dominio); lo que protege es la etiqueta `noindex`.
- El escenario `isla` original (un solo nivel) sigue definido en `escenarios.js` porque sirve de base a los 10 niveles; no aparece en los menús.
- Avance guardado antes de los 10 niveles (ids `isla`, `cielo`...) no se convierte al sistema nuevo.
- `cuadros_datos.js` en la raíz y `js/red/red.js` no se usan.
- El Torbellino reparte 70 de daño en 6 golpes; por redondeo hace 72.
- La web publicada no se actualiza sola: hay que subir los cambios con `git push` (GitHub tarda 1–2 minutos en publicar).

---

## Cómo probar o ejecutar

- **Rápido:** doble clic en `index.html` (funciona sin servidor gracias a `js/prueba/cuadros_datos.js`).
- **Con servidor local** (necesario para el modo en línea entre pestañas y para las simulaciones): en la carpeta del proyecto, `python -m http.server 8123` y abrir `http://localhost:8123`.
- **Simulaciones:** en la consola del navegador, cargar el archivo de `herramientas/` (instrucciones al inicio de cada uno) y llamar, por ejemplo, `tablaNiveles(3)`, `simularOleada7(20)` o `simularJefeNivel('isla-10', 10)`.

---

## 8. Últimos cambios (interfaz, ave y red en línea)

**Qué cambió**
1. **Indicadores H1–H4 y combos** (debajo de las barras): +35% en celular, +10% en laptop, 75% de opacidad (sin desenfoque) y contorno oscuro fino. Los enfriamientos, costos y combos se muestran igual.
2. **Botón "Pausa"** más grande: 78×44 px en celular, 74×34 px en laptop.
3. **Aviso "[nombre] quiere pausar"**: color sólido amarillo-naranja, texto oscuro, Aceptar verde, Ignorar gris y una barra fina con los 5 s restantes.
4. **Ave enemiga** rediseñada como stickman: 4 cuadros de aleteo y posturas de preparar y de lanzar. No cambió su comportamiento, vida, cantidad ni altura de vuelo. Se puede reemplazar por una imagen con `CONFIG.interfaz.ave.imagen`.
5. **Red en línea**: panel de depuración, snapshots compactos a 20/s estables, canal rápido sin reenvíos, efectos por el canal fiable, controles enviados al instante al cambiar una tecla, 100 ms de interpolación y frecuencia más baja si el líder va lento.

**Causa del trabado (medida)**
- Cada snapshot pesaba **~3.2 KB de media y hasta ~4.9 KB** en peleas con 12 enemigos (antes: objetos JSON con nombres largos y decimales). No cabía en un paquete de WiFi (~1.2 KB), así que cada uno viajaba partido en 3–4 paquetes.
- Iban por un canal **fiable y ordenado**: si se perdía un solo paquete, todos los siguientes esperaban su reenvío. En el WiFi del celular (que agrupa paquetes para ahorrar batería) eso produce tirones y sube el ping que muestra el juego (que viaja por la misma cola).
- El líder enviaba con un contador que se reiniciaba en cada cuadro: salían ~20 por segundo en vez de 25 y con intervalos irregulares, peor aún si el líder iba lento.
- PeerJS 1.5.4 con `reliable: false` solo quita el orden, pero **sigue reenviando**; por eso se usa un canal WebRTC propio con `maxRetransmits: 0`.

**Antes → después (medido en el navegador, nivel con 12 enemigos)**
| | Antes | Después |
|---|---|---|
| Tamaño del snapshot (promedio / máximo) | 3155 / 4331 bytes (hasta 4881) | **987 / 1407 bytes** |
| Snapshots por segundo | 25 configurados, ~20 irregulares | **20 estables** (15 si el líder va lento) |
| Canal de los snapshots | fiable y ordenado | **rápido, sin orden ni reenvíos** |
| Controles del invitado | cada 33 ms | cada 33 ms **y al instante al cambiar una tecla** |
| Retraso de interpolación | 110 ms | **100 ms** |

En una prueba con dos pestañas en la misma computadora: 20 snapshots/s de ~890 bytes, canal rápido abierto, conexión directa por UDP, ping 1 ms. **Falta medirlo en el celular y la laptop reales** (ver sección 6).

**Cómo probar**
- *Indicadores y botón:* en la laptop, jugar cualquier nivel; en el celular, jugar con controles táctiles (los íconos deben verse más grandes y algo transparentes; el botón "Pausa" debe ser fácil de tocar).
- *Aviso de pausa:* en línea, el invitado toca "Pausa"; al líder le sale el aviso amarillo con la barra que se vacía en 5 s.
- *Ave:* jugar el nivel 1 de la Isla (siempre hay al menos 1 ave).
- *Red:* crear sala en un dispositivo y unirse desde el otro. En los dos, abrir el panel (F3 o 5 toques en la esquina superior izquierda). Mirar: **Conexión** (en el mismo WiFi debería decir "directa"; si dice TURN no es normal porque no hay servidor TURN configurado), **Ida y vuelta red** (en el mismo WiFi debería ser < 20 ms), **Snapshots/s recibidos** (≈ 20), **Tamaño promedio** (< 1500), **Canal rápido: sí** y **FPS** del celular.
- Para comparar con el sistema anterior: en `config/red.js` poner `canalRapido.activo: false` y `compacto.activo: false`.

---

## 9. Servidor TURN de Cloudflare y cola de mensajes

**Problema:** en pareja en línea el panel mostraba de 3000 a 6600 ms. Los jugadores estarán en ciudades y redes distintas (La Paz y Tarija), donde la conexión directa a veces falla.

**Causas encontradas**
- El ping viajaba por el canal fiable, en la misma cola que los efectos y los controles. Los controles del celular salían hasta 60 veces por segundo, porque el joystick es analógico y cada pequeño cambio contaba.
- La cola del canal rápido podía juntar hasta 64 KB antes de descartar nada. Con una subida móvil lenta, eso son varios segundos de snapshots esperando. Por el canal fiable (si el rápido no abría) no había ningún límite.
- No había servidor TURN: entre redes con NAT estricto (datos móviles) la conexión directa puede fallar o quedar mal.

**Cambios**
- **Worker `turn-worker/`** (Cloudflare): `GET` → pide a `https://rtc.live.cloudflare.com/v1/turn/keys/{TURN_KEY_ID}/credentials/generate-ice-servers` credenciales de 6 h (`ttl: 21600`) y devuelve solo el arreglo `iceServers` (quita los del puerto 53, que los navegadores bloquean). Solo acepta el origen `https://lujanesau20-hash.github.io`, solo GET, 30 peticiones por minuto por IP, y reutiliza las credenciales 30 minutos.
- **Dirección del Worker:** `__URL_WORKER__` (en `config/red.js` → `turnWorker.url`).
- **Secretos requeridos** (nunca en el código ni en el repositorio): `TURN_KEY_ID` y `TURN_KEY_API_TOKEN`. Se agregan en Cloudflare → **Workers & Pages** → `bubududu-turn` → **Settings** → **Variables and Secrets** → **Add** → tipo **Secret**. Los dos salen de Cloudflare → **Realtime** → **TURN Server** → la llave creada (Key ID y API Token).
- **Juego:** pide las credenciales al crear o unirse a una sala (espera máx. 4 s, se reutilizan 60 min) y las suma a los STUN. Si fallan, sigue solo con STUN y lo muestra en el panel.
- **Ping** por un canal propio (id 51), sin orden ni reenvíos.
- **Controles** del invitado por el canal rápido con contadores de pulsaciones; el joystick solo cuenta cambios de 10%.
- **Cola:** se descartan snapshots si hay más de 4000 bytes esperando (rápido) o 16000 (fiable).
- Ya estaban de la tarea anterior (se verificó, no se repitió): snapshots a 20/s en formato compacto, efectos importantes por el canal fiable, interpolación de 100 ms y predicción del propio personaje.

**Nuevos valores de `config/red.js`**
- `turnWorker: { url, esperaMs: 4000, reusarMinutos: 60 }`
- `canalRapido: { activo: true, id: 50, idPing: 51 }`
- `cola: { maxRapidoBytes: 4000, maxFiableBytes: 16000 }`

**Cómo desplegar el Worker de nuevo**
```
cd turn-worker
npx wrangler login
npx wrangler deploy
```

**Cómo probar entre dos dispositivos en redes distintas**
1. Agregar los dos secretos en Cloudflare (ver arriba).
2. Abrir la web publicada en los dos dispositivos: uno con WiFi y otro con **datos móviles** (WiFi apagado).
3. Crear la sala en uno y unirse desde el otro.
4. Abrir el panel en los dos (F3 o 5 toques en la esquina superior izquierda) y mirar:
   - **TURN:** debe decir "listo (Cloudflare)". Si dice "no disponible: Faltan los secretos…", faltan los secretos.
   - **Conexión:** "directa (…)" si se pudo conectar directo, o **"TURN (relevo)"** si pasa por Cloudflare. Las dos sirven.
   - **Ping:** debería quedar por debajo de ~150 ms entre La Paz y Tarija (antes 3000–6600 ms).
   - **Snapshots/s** ≈ 20, **Cola rápida** cerca de 0 y **Snapshots descartados/s** en 0 (si sube, la red de subida del líder es lenta).
5. Para forzar la prueba del relevo: probar con un celular con datos móviles y la otra persona en otra ciudad; si la directa falla, el panel debe decir "TURN (relevo)" y el juego sigue fluido.

