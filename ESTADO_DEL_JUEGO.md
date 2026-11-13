# Estado del juego: Bubu & Dudu — Stick Fighters

Documento para entender el proyecto sin haberlo visto antes. Describe cómo está el juego **hoy** (última tarea: H3 sin retroceso — sección 23; antes: Corte volador y Torbellino sin retroceso, monedas al doble — sección 22). **Versión actual: `v1.05`** (`VERSION_VISIBLE` en `index.html`; versión técnica `2026.11.12-v1.05`). Historial corto en `CAMBIOS.md`.

- **Jugar en línea (web pública):** https://lujanesau20-hash.github.io/bubu-dudu-stick-fighters/
- **Repositorio:** https://github.com/lujanesau20-hash/bubu-dudu-stick-fighters
- **Copias de seguridad (etiquetas de git):** `respaldo-antes-tramos`, `respaldo-antes-pausa`, `respaldo-antes-red-ui`, `respaldo-antes-turn`, `respaldo-antes-rendimiento`, `respaldo-antes-reloj-red`, `respaldo-antes-personajes-version`, `respaldo-antes-versus-enlinea`, `respaldo-antes-mejoras-tienda`, `respaldo-antes-cataclismo-radio`, `respaldo-antes-sin-retroceso-combos`, `respaldo-antes-h3-sin-retroceso`

---

## 1. Qué es el juego y sus modos

Juego 2D de acción y plataformas para el navegador (HTML5 Canvas + JavaScript puro, sin instalaciones). Funciona en PC (teclado) y en celular (controles táctiles, en horizontal).

Los protagonistas son **Bubu** (oso panda **blanco**, con moño negro) y **Dudu** (oso **marrón**, sin moño). Pelean contra enemigos stickman (figuras de palitos) a lo largo de mundos con oleadas y jefes.

| Modo | Qué es |
|---|---|
| **Niveles en solitario** | Un jugador elige a Bubu o a Dudu y juega los niveles. |
| **Niveles en pareja** | Dos jugadores en el mismo teclado/pantalla, una cámara que sigue a los dos. Se puede revivir al compañero. |
| **Versus** | Bubu contra Dudu en una arena, al mejor de 3 rondas. En PC: local (mismo teclado) o en línea. En celular: solo en línea (sección 19). |
| *(celular)* | En celular no aparece "Niveles en pareja" (local); sí "Jugar en línea" (sección 16). |
| **Jugar en línea** | Dos personas en dispositivos distintos juegan "Niveles en pareja" o "Versus" (lo elige el líder en la sala) con un código de sala de 4 números. |
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
index.html                  Página del juego. Define VERSION_JUEGO y carga todos los scripts EN ORDEN con ?v=VERSION_JUEGO.
prueba-personajes.html      Página aparte para revisar las hojas de sprites (visor de animaciones).
robots.txt                  Pide a los buscadores no indexar (ver límites).
.nojekyll                   Necesario para GitHub Pages.
README.md                   Resumen corto del proyecto.
ESTADO_DEL_JUEGO.md         Este documento.
CLAUDE.md                   Reglas de trabajo del proyecto (para quien programe).
_archivo_viejo/             Archivos que ya no se usan (no se cargan). Motivo de cada uno en _archivo_viejo/LEEME.md.

config/
  personajes.js             ★ FUENTE ÚNICA de Bubu y Dudu: qué hojas usa cada pantalla, versión para celular,
                            retratos y errores de carga (se muestran en el panel de depuración).
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
    personajes.js           Dibujo de Bubu/Dudu (local y remoto) con las hojas; retrato del HUD y la tienda.
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

  prueba/                   Hojas de sprites: configuración de animaciones y detección de cuadros
    animaciones.js          Qué hoja es cada animación, fps, escala de cada hoja.
    cuadros.js              Detecta los cuadros de cada hoja por los huecos transparentes.
    cuadros_datos.js        Cuadros ya detectados (para abrir el juego con doble clic).
    personaje.js, visor.js, prueba.js   Solo para prueba-personajes.html.

assets/personajes/
  bubu/, dudu/              Hojas de sprites animadas (una fila de cuadros por animación).
  movil/bubu/, movil/dudu/  Las mismas hojas a mitad de tamaño, solo para celulares (herramientas/hojas_movil.py).
BUBU ANIMADO/, DUDU ANIMADO/  Hojas ORIGINALES entregadas (no se tocan; se copiaron a assets/).

turn-worker/                Worker de Cloudflare que entrega credenciales TURN al juego (se despliega aparte).
  src/index.js              El Worker: solo GET desde la web del juego, límite de peticiones, sin secretos.
  wrangler.toml             Nombre del Worker y origen permitido. Los secretos van en el panel de Cloudflare.
  .gitignore, README.md     Archivos locales con secretos que nunca se suben; cómo desplegar.

herramientas/               Simulaciones para la consola del navegador (no forman parte del juego).
  hojas_movil.py            Crea las hojas a mitad de tamaño para celular (python herramientas/hojas_movil.py).
  simular_jefe.js           Pelea contra un jefe con un jugador automático.
  simular_niveles.js        Oleada de 7, nivel completo, tabla de niveles, jefe con refuerzos.
  simular_red.js            Simula ping/variación para medir la suavidad del invitado en línea.
  medir_rendimiento.js      15 enemigos + Cataclismo + Torbellino: cuenta operaciones de dibujo,
                            textos, sombras, partículas y objetos nuevos del peor cuadro.
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

**Celular:** joystick **fijo** abajo a la izquierda (abajo = agacharse; ver sección 18), botón ▲ de salto a la derecha, H1–H4 en arco alrededor del salto, botón ♥ para revivir que aparece junto al compañero caído, botón "Pausa" arriba a la derecha. Pide pantalla horizontal. Las teclas se cambian en `js/config.js → controles`.

### Habilidades y maná
- Cada jugador tiene **100 de vida** y **100 de maná** (barra azul). El maná sube solo y con cada golpe acertado.
- Si no alcanza el maná, la habilidad no sale, el ícono se ve apagado y aparece "Sin maná".
- **Un ataque no interrumpe a otro:** tras H1/H2/H4 hay un pequeño "bloqueo" en que no sale otro ataque (los combos sí pueden salir).
- **H1 Daga:** saltito + cuchilla lanzada. **H2 Espada:** tajo en arco al frente. **H3 Flash:** dash que atraviesa enemigos (invulnerable). **H4 Onda de choque:** golpe al suelo de área (si estás en el aire, primero caes en picada).
- **Daño de área (H4, Torbellino, Cataclismo):** 100% al enemigo más cercano al centro; los demás reciben menos según la distancia (medida al borde del enemigo), hasta un mínimo de 40% en el borde.
- **Golpes y enemigos:** ningún golpe deja al enemigo "tieso". H1 y H2 no lo empujan. H4 y el Cataclismo le dan un **empujón corto** (≈1.5 pasos) y el enemigo sigue atacando enseguida. **H3, Corte volador y Torbellino no lo empujan ni frenan** (v1.04 y v1.05, secciones 22 y 23). Igual para jefes, aves y refuerzos. El retroceso que **recibe el jugador** no cambió.

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
- Cada enemigo suelta **1 moneda** que cae al suelo o a la plataforma y se queda quieta: hay que ir a tocarla. Desaparece a los 10 s. El jefe suelta sus monedas con imán, como antes. Cada nivel da además un bono (ver sección 14).
- Tienda: 7 conjuntos de ropa (calle → oro) y 4 piezas de cabeza (gorra, casco, sombrero, corona), combinables. Se ven en la vista previa de la tienda y en los retratos (ver límites).
- Tienda, pestaña **Mejoras** (desde v1.02): mejoras de daño por personaje; se abre al completar el nivel 5 (sección 20).

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
- **Caídas (sección 17):** el invitado reintenta solo volver a la sala (4 intentos) y ve avisos "Esperando datos…" / "Reconectando…" / "No se pudo conectar" con Reintentar y Salir.
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
| H1 Daga (cuchilla lanzada) | 2 | 0 s | **16** (antes 4) | bloqueo 0.30 s |
| H2 Espada (de cerca) | 4 | 0 s | **22** (antes 10) | bloqueo 0.35 s |
| H3 Flash | 10 | **3 s** | **35** (antes 30) | — |
| H4 Onda de choque | 20 | **7 s** | **70** (área; antes 80) | radio 250 px, bloqueo 0.35 s |

### Combos — `BALANCE.combos`
| | Maná | Enfriamiento | Daño | Radio |
|---|---|---|---|---|
| Corte volador | 12 | 3 s | **40** (antes 28) | — |
| Torbellino relámpago | 25 | **10 s** | **84** total en 6 golpes (área; antes 70) | 135 px |
| Cataclismo | 45 | **20 s** | **100** (área; antes 160) | **380 px** (v1.03; antes 260, al principio 520), 60% en el borde |

Otros de combos en `js/config.js → combos`: ventana PC 250 ms, ventana táctil 900 ms, enfriamiento común entre combos 1 s.

### Empujón y área
- `BALANCE.empujon`: 1.5 pasos × 40 px = **60 px**, a 700 px/s.
- `BALANCE.areaDanio`: mínimo **40%** en el borde, curva 1 (lineal), 100% al más cercano. El Cataclismo tiene su propio mínimo: **60%** (`minimoArea` en `BALANCE.combos`).

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
| Indicadores H1–H4 y combos: escala en celular / laptop | **2.0** (el doble; antes 1.35) / **1.1** (+10%) |
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
- Los retratos (selección, sala en línea, HUD y tienda) son el primer cuadro de reposo de la hoja; la ropa de la tienda se ubica sobre ese cuadro con las mismas anclas de antes.
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
- Archivos sin uso movidos a `_archivo_viejo/` (ver sección 12). Quedan sin mover, por dudosos: `assets/personajes/originales/` (fotos de los stickers) y el botón de pausa táctil viejo "II" (oculto por CSS).
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
- **Worker `turn-worker/`** (Cloudflare): `GET` → pide a `https://rtc.live.cloudflare.com/v1/turn/keys/{TURN_KEY_ID}/credentials/generate-ice-servers` credenciales de 6 h (`ttl: 21600`) y devuelve solo el arreglo `iceServers` (quita los del puerto 53, que los navegadores bloquean). Solo acepta el origen `https://lujanesau20-hash.github.io`, solo GET (`preview_urls = false`), 30 peticiones por minuto por IP, y reutiliza las credenciales 30 minutos.
- **Dirección del Worker:** **https://bubududu-turn.lujanesau20.workers.dev** (en `config/red.js` → `turnWorker.url`).
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

---

## 10. Rendimiento con muchos enemigos y habilidades grandes

**Problema:** tirones con muchos enemigos al usar Cataclismo o Torbellino, aunque la red medía bien (ping 14 ms, cola vacía).

**Qué se midió** (`herramientas/medir_rendimiento.js`: 15 enemigos juntos, Cataclismo y luego Torbellino, pantalla de celular 1688×780)
| Parte | Costo encontrado |
|---|---|
| Simulación (física, IA, **cálculo de daño de área**) | 0.1–0.24 ms por cuadro: **no es el problema** |
| **Suelo y decorado del fondo** | **844 + 159 operaciones de dibujo en CADA cuadro**: se dibujaban las piedras, pasto, flores y árboles de TODO el nivel (en el nivel 5 son 11 000 px), aunque no se vieran. Era el mayor costo fijo. |
| **Partículas** | hasta **430** vivas; un solo cuadro con impacto de área creaba **230 objetos nuevos** (cada golpe a cada enemigo: 8–22 chispas + número de daño; muerte: 18 más; explosión: 60 + 30 de polvo) |
| Efectos (anillos, arcos, partículas, textos) | 462 operaciones en el peor cuadro |
| Dibujo de los 15 enemigos | 338 operaciones (todos estaban en pantalla) |
| Textos | ~95 dibujos de texto por cuadro (números de daño + HUD) |
| Sombras borrosas (`shadowBlur`) | 11 en el peor cuadro (cartel del combo, arcos del Torbellino, orbes, corte volador). Es lo más caro de dibujar en un celular. |
| Listas nuevas | cada cuadro se creaban 5 listas nuevas con `filter` y una copia ordenada de los jugadores |

**Qué se cambió (sin tocar la jugabilidad)**
- **No dibujar fuera de pantalla:** suelo, piedras, pasto, flores, árboles, plataformas y decorados de los 4 mundos; enemigos, proyectiles, monedas, partículas y textos (`U.rangoVisibleX` en `js/utilidades.js`).
- **Pool de partículas:** las partículas terminadas se guardan y se reutilizan (hasta 800) en vez de crear objetos nuevos.
- **Límites en celular** (`config/interfaz.js` → `efectos`): máximo 180 partículas (laptop 450), la mitad de partículas por evento (laptop todas), máximo 14 textos flotantes (laptop 30; los grandes reemplazan al más viejo) y **sin sombras borrosas** en celular.
- **Sin listas nuevas por cuadro:** los efectos terminados se quitan "en el lugar" y los jugadores se dibujan sin copiar ni ordenar.
- **No recalcular:** el degradado de la tierra de la isla se crea una sola vez.
- **Líder atrasado:** si un cuadro del líder tarda más de 34 ms, el envío de ese cuadro pasa al siguiente (la simulación no espera al envío) y durante 1 s manda 12 snapshots/s; después vuelve solo a 20 (`config/red.js` → `liderAtrasado`).

**Antes → después (peor cuadro, 15 enemigos + Cataclismo)**
| | Antes | Después (laptop) | Después (celular) |
|---|---|---|---|
| Operaciones de dibujo | 2090 | **1211** (−42%) | **959** (−54%) |
| Partículas vivas | 430 | 430 | **180** |
| Objetos nuevos en un cuadro (6 enemigos) | 230 (todos creados) | 230 (reutilizados del pool) | **119** (reutilizados) |
| Sombras borrosas | 11 | 11 | **0** |
| Suelo + decorado | 1003 ops | solo lo visible | solo lo visible |
| Listas nuevas por cuadro | 6 | 0 | 0 |

**Panel de depuración: "PEOR MOMENTO (esta partida)"** — se reinicia en cada partida y no cuenta el primer cuadro después de una pausa o carga:
- FPS mínimo (por segundo completo), cuadro más largo en ms con **cuántos enemigos y efectos** había en ese instante, snapshot más grande, mínimo de snapshots/s (en línea), cola máxima de envío. Abajo: enemigos y efectos de ahora.

**Nuevos valores**
- `config/interfaz.js` → `efectos.celular: { maxParticulas: 180, factorParticulas: 0.5, maxTextos: 14, sinSombras: true }`, `efectos.laptop: { maxParticulas: 450, factorParticulas: 1, maxTextos: 30, sinSombras: false }`.
- `config/red.js` → `liderAtrasado: { cuadroMs: 34, segundos: 1, estadosPorSegundo: 12 }`.

**Cómo probar**
- Jugar un nivel alto de la Isla (5 o más) en el celular, juntar muchos enemigos y usar Cataclismo y Torbellino. Abrir el panel (F3 / 5 toques) y mirar "PEOR MOMENTO": FPS mínimo y cuadro más largo (con cuántos enemigos y efectos).
- En la consola del navegador: `await fetch('herramientas/medir_rendimiento.js').then(r => r.text()).then(eval); medirRendimiento({ enemigos: 15 })`.
- Si en el celular se ve muy simple, subir `factorParticulas` o poner `sinSombras: false` en `config/interfaz.js`.

**Límites**
- Las mediciones de tiempo se hicieron en una laptop; en el celular solo se puede comparar con el panel (FPS mínimo y cuadro más largo).
- En celular los brillos (sombras borrosas) de combos, orbes y bolas de fuego no se ven, y hay la mitad de chispas.

---

## 11. Reloj de envío del líder, snapshots "solo cambios" y panel de rendimiento

**Lo que mostraba la grabación del invitado:** 45–60 FPS; en peleas grandes los snapshots recibidos bajaban de 20 a 11–13 por segundo y subían a 1100–1250 bytes; el ping de los mensajes subía a 130–590 ms mientras el ida y vuelta real de WebRTC era de 14–69 ms (conexión directa UDP, cola vacía).

**Qué se encontró**
- **11–13 snapshots/s:** lo causaba una regla de la sección 10 ("líder atrasado"). Cuando un cuadro del líder pasaba de 34 ms, bajaba el envío a **12 por segundo** durante 1 s y además saltaba el envío de ese cuadro. En peleas grandes eso coincide exactamente con lo medido. El envío iba atado al dibujo.
- **Ping alto con la red bien:** el ping ya se respondía en el manejador de mensajes (no en el bucle), pero el navegador solo atiende un mensaje cuando el hilo principal está libre. Si el juego ocupa el hilo (dibujo, simulación, recolección de basura), el mensaje espera. Por eso el ping de los mensajes subía y el de WebRTC no. Ahora el panel muestra ese **bloqueo del hilo** de cada lado.
- **Snapshots grandes:** se mandaban todos los campos de cada enemigo y jugador en cada snapshot, aunque no cambiaran (dirección, estado, vida, tipo, vida máxima, animación…).
- **Mensaje de efectos enorme:** en un Cataclismo con 15 enemigos, el mensaje de efectos (canal fiable) llegaba a **3269 bytes**: coordenadas con decimales, nombres largos y hasta 17 sacudidas de cámara por envío.
- **Objetos nuevos en cada cuadro del invitado:** al dibujar, el invitado creaba listas y objetos nuevos para enemigos, proyectiles, monedas y corazones, y buscaba cada enemigo en una lista (`find`) en cada cuadro. Esto genera pausas de recolección de basura en el celular.
- **Simulación del líder** con 15 enemigos + Cataclismo: 0.03 ms de media y 1.5 ms de máximo por paso. El cálculo de daño no es el problema.

**Qué se cambió (sin tocar la jugabilidad)**
- **Reloj de envío propio** (`config/red.js` → `relojEnvio.activo`): un temporizador a 20 Hz exactos avanza la simulación hasta "ahora" y manda el snapshot, sin esperar al dibujo. El dibujo también avanza la simulación hasta "ahora" (lo que llegue primero). Con la pestaña del líder oculta el juego queda quieto, como antes.
- **Omitir dibujo antes que envío** (`omitirDibujo`): si el líder baja de 40 FPS, dibuja un cuadro sí y uno no; los snapshots siguen a 20 por segundo. Las reglas viejas `liderLento` y `liderAtrasado` ya no se usan con el reloj.
- **Snapshots "solo cambios"** (`compacto.repetirCambios: 3`, `cadaClave: 20`): cada cosa manda un mapa de bits y solo los campos que cambiaron. Cada cambio se repite en 3 snapshots seguidos (por si se pierde uno) y cada cosa va completa una vez por segundo, repartida en snapshots distintos. Las velocidades se redondean de 10 en 10 (solo se usan para la pose). Un snapshot viejo que llega tarde se descarta.
- **Efectos en formato corto:** números enteros, nombres de 1–2 letras, tipo como número y una sola sacudida (la más fuerte) por envío.
- **Invitado sin objetos nuevos por cuadro:** reutiliza las listas y los objetos de enemigos, proyectiles, monedas y corazones; las búsquedas por id se arman una vez por snapshot.
- **Ping:** se sigue respondiendo enseguida en el manejador de mensajes, por su canal propio. Cada respuesta incluye el **bloqueo del hilo** del que responde.

**Panel de depuración** (ahora en dos columnas; F3 o 5 toques en la esquina superior izquierda)
- **RED:** rol, ping de los mensajes, ida y vuelta de WebRTC, **bloqueo del hilo del otro**, **snapshots ENVIADOS/s (líder) o RECIBIDOS/s (invitado)**, tamaño, conexión, canal rápido, TURN, colas, descartados y modo de envío.
- **RENDIMIENTO (prom / máx por cuadro):** FPS, **simulación**, **dibujo**, **armado y envío de snapshots** (ms), **bloqueo del hilo** de este equipo, **cuadros sin dibujar/s**, enemigos y efectos de ahora.
- **PEOR MOMENTO:** FPS mínimo, cuadro más largo con sim/dibujo/red de ese cuadro y cuántos enemigos y efectos había, bloqueo máximo del hilo, snapshot más grande, mínimo de snapshots/s y cola máxima.
- **Cómo leerlo:** si el líder dice ~20 enviados/s y el invitado recibe 11–13, se pierden en la red. Si el líder ya envía 11–13, el líder se atrasa. Si el ping de mensajes es mucho mayor que el de WebRTC, mira el "bloqueo del hilo" de cada lado: ese es el que tarda.

**Antes → después (medido en el navegador)**
| | Antes | Después |
|---|---|---|
| Snapshots/s en peleas grandes | 12 (por la regla "líder atrasado") | **20** (reloj propio; probado incluso sin dibujar nada) |
| Snapshot típico, 12 enemigos peleando | 987 bytes | **492 bytes** (95% por debajo de 743) |
| Snapshot más grande (después del primer segundo) | 1407 bytes | **1072 bytes** (los 3 primeros de una partida pesan ~1450 porque todo es nuevo) |
| Mensaje de efectos, Cataclismo con 15 enemigos | 3269 bytes (promedio 583) | **1421 bytes (promedio 267)** |
| Sacudidas de cámara por envío | hasta 17 | **1** |
| Armado + envío de un snapshot (líder) | — | 0.05–0.18 ms |
| Simulación del líder por paso (15 enemigos + Cataclismo) | 0.03 ms prom., 1.5 ms máx. | igual (no era el problema) |
| Objetos y listas nuevas por cuadro en el invitado | 4 listas + 1 objeto por proyectil/moneda/corazón + búsquedas `find` | **0** (se reutilizan) |
| Pérdida del 10% de snapshots | — | el invitado reconstruye todo (errores momentáneos que se corrigen solos en ≤1 s) |

**Nuevos valores (`config/red.js`)**
- `relojEnvio: { activo: true }`
- `omitirDibujo: { activo: true, fpsMinimo: 40 }`
- `compacto: { activo: true, repetirCambios: 3, cadaClave: 20, avisoBytes: 1500 }` (reemplaza a `repetirFijosNuevos`)

**Cómo probar**
1. Subir los cambios a la web y abrir el juego en los dos dispositivos.
2. Abrir el panel en los dos y jugar un nivel alto con muchos enemigos, usando Cataclismo y Torbellino.
3. Comparar los **snapshots ENVIADOS/s** del líder con los **RECIBIDOS/s** del invitado, y el **bloqueo del hilo** de cada lado con la diferencia entre el ping de mensajes y el de WebRTC.
4. Mirar en el líder el "PEOR MOMENTO": qué parte (sim, dibujo o red) pesa en el cuadro más largo.
- Para volver al sistema anterior: `relojEnvio.activo: false` (y `compacto.activo: false` para el formato completo).

**Límites**
- Con pérdidas muy altas (30% o más) algún dato puede verse viejo hasta 1 s, hasta que esa cosa vuelve a ir completa.
- El ping de los mensajes siempre incluye la espera del hilo principal de los dos lados (así funciona el navegador). La medida "solo red" es la de WebRTC; el panel muestra las dos y el bloqueo de cada lado.
- La pestaña del líder debe seguir visible: si se oculta, el juego queda quieto para los dos (igual que antes).

---

## 12. Fuente única de personajes, versión del juego, cuadros de enfriamiento y medición de red

### Por qué la invitada veía un Dudu viejo (pálido, rosado y con guantes rojos)
- Ese Dudu es el sticker viejo `assets/personajes/dudu.png`.
- El juego dibujaba a los jugadores con las hojas animadas, pero **si las hojas no estaban listas en ese celular, cambiaba sin avisar al sticker viejo**.
- En un celular eso puede pasar por **memoria**: las 21 hojas (2172 px de ancho) ocupan ~131 MB ya decodificadas. También puede pasar por la **caché**: GitHub Pages deja los archivos guardados unos 10 minutos.
- Además, **la selección de personaje, la sala en línea, el avatar del HUD y la tienda siempre usaban los stickers viejos**.
- El jugador remoto se dibujaba con el mismo código que el local (mismas hojas y escala, sin tinte). Solo tiene la transparencia que ya existía para todos: parpadeo al ser invulnerable y semitransparente al estar "muerto".

### Auditoría (antes → ahora)
| Pantalla | Antes | Ahora |
|---|---|---|
| Selección de personaje | sticker `bubu.png` / `dudu.png` (`<img>`) | primer cuadro de reposo de la hoja (lienzo), desde `config/personajes.js` |
| Sala en línea (conectado) | sticker | igual que la selección |
| Avatar del HUD | sticker | cuadro de reposo de la hoja |
| Vista previa de la tienda | sticker con ropa | cuadro de reposo de la hoja con ropa |
| Jugador local y remoto | hojas animadas; si fallaban, **sticker viejo sin avisar** | hojas animadas; si fallan, un círculo con "?" y el **error en el panel** |
| Resultados | sin personajes | sin personajes |

### Cambios
- **`config/personajes.js`** (nuevo): la única entrada del juego a las hojas de Bubu y Dudu. Las hojas, cuadros y escalas siguen definidos en `js/prueba/animaciones.js`, que también usa la página de prueba (no se tocó).
- **Hojas para celular:** `assets/personajes/movil/` tiene las 21 hojas a mitad de tamaño. En celular se usan esas: **la memoria baja de 131 MB a 33 MB**. Las originales no cambian y se siguen usando en laptop.
- **Precarga y verificación:** todas las hojas se cargan antes de empezar. Si alguna no carga, no se puede decodificar o no tiene cuadros, el panel de depuración lo muestra en rojo ("Hojas de sprites: N con error" y cuáles). Nunca se usa una imagen vieja.
- **Versión del juego:** `VERSION_VISIBLE` (hoy `1.00`, se ve como "v1.00") y `VERSION_JUEGO` (técnica, `2026.11.10-v1.00`) en `index.html` (ver sección 18). Se agrega como `?v=` a todos los JS, al CSS y a las hojas de sprites. **Hay que cambiarla en cada actualización.** No hay service worker ni manifest.
- **Versiones en línea:** al conectarse, el líder y el invitado intercambian versiones. Si son distintas:
  - el invitado ve: "Tu versión es distinta a la del líder, recarga la página";
  - el líder ve que el invitado tiene otra versión;
  - y queda marcado en el panel y junto al ping.
- **Cuadros de enfriamiento:** escala **2.0 en celular** (antes 1.35; laptop sin cambios, 1.1), opacidad **0.8** (`config/interfaz.js` → `habilidades`). El número de enfriamiento crece con el cuadro y tiene contorno oscuro. Los combos siguen en una segunda fila. Si la barra del jefe no cabe arriba, baja hasta debajo de los cuadros. No tapan el botón Pausa (la barra del jugador 2 ya se corre a la izquierda) ni los controles táctiles. *(Cambiado en la sección 13: ahora 4.0 en celular y 2.2 en laptop.)*
- **Medición de red** (sin cambiar el envío ni la interpolación):
  - El ping en pantalla y en el panel es el **promedio de los últimos 2 s**, con su **variación** (jitter).
  - El panel muestra **snapshots enviados y recibidos** en los dos equipos, con el % perdido. Cada respuesta de ping lleva los números del otro equipo.
  - **"Conexión inestable"** (en el panel y junto al ping) si el ping pasa de 250 ms, la variación de 80 ms o se pierde más del 20% de los snapshots (`config/interfaz.js` → `medicion`).
  - Botón **"Copiar registro"** debajo del panel. Copia en texto simple, segundo a segundo, los últimos 5 minutos: hora, rol, ping, variación, ida y vuelta de la red, snapshots enviados y recibidos, bytes, FPS, cola, conexión (directa/TURN) y bloqueo del hilo, con la versión de cada uno. Funciona en celular y laptop, en el líder y en el invitado.

### Tamaños de las hojas
| Hoja | Original | Celular |
|---|---|---|
| bubu caido, caminar, doble_salto, espada, golpe_suelo, lanzar_cuchilla, reposo | 2172×724 (0.63–0.88 MB) | 1086×362 (0.19–0.25 MB) |
| bubu agacharse | 1774×887 (0.57 MB) | 887×444 (0.17 MB) |
| bubu dash | 1352×1024 (0.43 MB) | 676×512 (0.12 MB) |
| bubu herido | 1536×1024 (1.11 MB) | 768×512 (0.17 MB) |
| dudu caido, caminar, dash, doble_salto, espada, golpe_suelo, lanzar_cuchilla, reposo, saltar | 2172×724 (0.68–0.94 MB) | 1086×362 (0.19–0.25 MB) |
| dudu agacharse, herido | 1774×887 (0.55–0.70 MB) | 887×444 (0.15–0.19 MB) |
| **Memoria al decodificar (todas)** | **131 MB** | **33 MB** |

### Movido a `_archivo_viejo/` (no se borró nada)
| Archivo | Motivo |
|---|---|
| `assets/personajes/bubu.png`, `dudu.png` | Stickers viejos. Ninguna pantalla los usa ya (solo los mencionaba el README, que se actualizó). |
| `cuadros_datos.js` (raíz) | Copia suelta; el juego y la página de prueba usan `js/prueba/cuadros_datos.js`. |
| `js/red/red.js` | Red antigua con WebSocket ("fase 2"), nunca usada; ya no se carga. |
| `codigo/personajes_imagen_fija.js` | Copia del dibujo anterior con la imagen fija y el respaldo silencioso. |

Sin mover (dudosos, para decidir): `assets/personajes/originales/` (fotos de los stickers) y el botón de pausa táctil "II" (oculto). No había `console.log` sobrantes en el juego (solo en la herramienta `simular_jefe.js`, que es su salida) ni líneas de código comentadas.

### Cómo probar
- **Celular (pestaña privada / incógnito, para que no haya nada en caché):**
  1. Abrir la web y elegir "Niveles en solitario": los dos retratos deben ser el panda blanco con moño y el oso marrón de las hojas.
  2. Jugar: los cuadros de habilidades deben verse al doble de tamaño y el número de enfriamiento debe leerse bien.
  3. Abrir el panel (5 toques en la esquina superior izquierda): "versión 2026.11.09-1", "Hojas de sprites: todas bien (versión celular)".
- **Laptop:** lo mismo con F3. Los cuadros de habilidades quedan del tamaño de antes.
- **En línea:** los dos dispositivos deben mostrar la misma versión en el panel. Si no, aparece el aviso y hay que recargar. El panel muestra el ping promedio, la variación, los enviados y recibidos y, si corresponde, "Conexión inestable". Tras jugar, tocar **"Copiar registro"** en cada dispositivo y pegarlo en un mensaje.
- **Al subir cambios:** cambiar `VERSION_JUEGO` en `index.html`.


## 13. Cuadros de enfriamiento al doble (celular y laptop) y acomodo automático

Los cuadros de habilidades y combos que se ven **debajo de la barra de vida** (no los botones táctiles) eran muy pequeños para leer los segundos. Ahora miden el **doble que en la versión anterior** en los dos tipos de pantalla.

### Qué cambió
- `config/interfaz.js` → `habilidades` (se mantienen los mismos nombres):
  - `escalaCelular: 4.0` (antes 2.0) — con controles táctiles.
  - `escalaLaptop: 2.2` (antes 1.1) — laptop / PC.
  - `opacidad: 0.8` (sin cambios; usar entre 0.75 y 0.85).
  - Nuevos: `achicarHasta: 0.4`, `separacionObstaculos: 8` (px) y `altoMaximo: 0.65`.
- `js/ui/hud.js`: los cuadros **no tapan** el joystick (en su lugar de reposo), los botones de habilidad, salto y revivir, el botón "Pausa", ni las monedas, "Revivir ♥♥" y "Nivel · Tramo" del centro. Si chocan:
  1. la fila de combos (segunda fila) se corre hacia el centro (en celular se corre a la derecha del joystick);
  2. si aun así no cabe, los cuadros se achican en pasos de 5% hasta que quepan (nunca menos de `achicarHasta`).
  Igual para el jugador 1 (izquierda) y el jugador 2 (derecha). Nunca pasan la mitad de la pantalla.
- Si los cuadros llegan hasta donde iría la barra del jefe, la barra baja debajo de ellos.
- El número de segundos crece con el cuadro y tiene contorno oscuro (como antes).
- Las posiciones del joystick, los botones y la Pausa se miden como mucho una vez por segundo (no afecta el rendimiento).

### Cómo se ve (probado)
| Pantalla | Tamaño | Escala usada |
|---|---|---|
| Laptop 1366×768, solitario y pareja | ~61–70 px | 2.2 completa, los dos jugadores |
| Celular 844×390, solitario | ~65 px | 4.0 completa (combos corridos a la derecha del joystick) |
| Celular 844×390, pareja (jugador 2 sobre los botones) | 65 / 52 px | J1 4.0 · J2 3.2 |
| Celular pequeño 667×375, pareja | 50 / 34 px | J1 3.2 · J2 2.2 |

### Cómo ajustarlo
- Más grandes o más chicos: cambiar `escalaCelular` o `escalaLaptop` en `config/interfaz.js`.
- Más o menos transparentes: `opacidad`.
- Más espacio libre alrededor del joystick, los botones y la Pausa: `separacionObstaculos`.
- Si se prefiere que no se achiquen tanto (aunque tapen algo): subir `achicarHasta` (por ejemplo 0.7).

### Cómo probar
- **Celular (horizontal, pestaña privada):** jugar en solitario y usar H3 y H4: los cuadros se ven grandes, con el número de segundos bien legible, sin tapar el joystick ni los botones. En el panel (5 toques arriba a la izquierda) debe decir "versión 2026.11.10-1".
- **Laptop:** lo mismo (panel con F3). En pareja local, los cuadros de Dudu quedan a la izquierda del botón "Pausa".
- **En línea:** como invitado (Dudu) en celular, los cuadros de la derecha se achican un poco para no tapar los botones H3 y H4.
- **Respaldo:** etiqueta de git `respaldo-antes-cuadros-enfriamiento-x2-ambos`.

## 14. Menos efectos y calidad automática, texto del tramo más grande en celular y monedas en el suelo

Versión `2026.11.10-3`. Respaldo: etiqueta de git `respaldo-antes-efectos-calidad-monedas`. No cambió el daño, el balance, los controles, la red, la tienda, los mundos ni los niveles.

### 1. Menos efectos y calidad adaptable (`js/dibujo/efectos.js`, `config/interfaz.js`)
- **Tope de efectos a la vez** (partículas + textos + efectos de área + carteles): `efectos.celular.topeTotal: 120`, `efectos.laptop.topeTotal: 300`. Al llegar al tope se descartan primero las **partículas más viejas**, después los textos de menor importancia ("¡PUM!", "+1"). Los anillos, las ondas, los arcos y los carteles de las habilidades **nunca se descartan**: Cataclismo sigue con sus dos anillos, el destello y la sacudida.
- **Calidad automática** (`calidad` en `config/interfaz.js`): alta → media → baja si los FPS quedan **bajo 45 durante 2 s**; sube un nivel si quedan **sobre 55 durante 5 s**. Solo cuenta mientras se juega (no en pausa ni con la pestaña oculta). Cada dispositivo decide la suya, también en línea.

  | Nivel | Partículas por efecto | Tope | Brillo (shadowBlur) | Efectos menores (polvo, chispas pequeñas, "¡PUM!", anillo del doble salto) |
  |---|---|---|---|---|
  | alta | 100% | 100% | sí en laptop (en celular siempre apagado) | sí |
  | media | 60% | 75% | no | sí |
  | baja | 30% | 50% | no | no |
- **Números de daño juntos:** los golpes al mismo enemigo dentro de `efectos.juntarDanioMs: 150` ms se suman en **un solo número** (pasa a grande desde 40). El golpe lleva el número del enemigo (`quien`); en línea viaja dentro del mismo efecto, sin cambios en la red.
- **Pool:** partículas, textos y anillos se reutilizan (no se crean objetos nuevos). En celular el brillo borroso sigue apagado; en laptop también se apaga en calidad media o baja. No se usan filtros (`ctx.filter`).
- **Panel de depuración** (F3 o 5 toques arriba a la izquierda), columna RENDIMIENTO: "Calidad", "tope de efectos", "Animaciones activas" con el desglose (partículas, números de daño, otros textos, área, carteles, monedas, corazones, proyectiles, enemigos) y, en "PEOR MOMENTO", el **máximo de animaciones** de la partida con su desglose.

**Cataclismo con 25 enemigos (máximo de animaciones a la vez):**

| | Laptop antes | Laptop ahora (alta / media / baja) | Celular antes | Celular ahora (alta / media / baja) |
|---|---|---|---|---|
| Partículas | 450 | 267 / 192 / 120 | 180 | 103 / 73 / 43 |
| Números de daño y textos | 30 | 30 / 30 / 27 | 14 | 14 / 14 / 14 |
| Efectos de área | 2 | 2 | 2 | 2 |
| Carteles | 1 | 1 | 1 | 1 |
| Monedas | 97 | 18–25 | 97 | 16–25 |
| Proyectiles | 6 | 6–8 | 6 | 4–6 |
| Enemigos | 25 | 25 | 25 | 25 |
| **Total** | **611** | **350 / 278 / 201** | **325** | **166 / 137 / 107** |

### 2. Limpieza (solo efectos y animaciones)
- No había `console.log`, líneas de código comentadas ni funciones repetidas en el código de efectos y dibujo.
- Se quitó el caso vacío `case 'avanzar': break;` de los efectos (no hacía nada). La versión anterior completa quedó en `_archivo_viejo/codigo/efectos_antes_de_calidad.js`.
- Sin tocar (dudosos): el evento `corazonAparece` se emite pero nada lo escucha (quizá para un sonido futuro); `U.dist` no se usa (es una utilidad general, no de efectos).

### 3. Texto "Nivel X · Tramo Y/Z" más grande en celular (`js/ui/hud.js`)
- `config/interfaz.js` → `textoTramo: { escalaCelular: 2.0, escalaLaptop: 1.0 }` (laptop igual que antes).
- Va debajo de las monedas (o debajo de "Revivir ♥♥" en pareja). Si no cabe entre las barras de vida (con el aviso COMBO) y el botón Pausa, se achica, nunca menos que el tamaño de laptop. Los cuadros de habilidades lo esquivan. Los avisos de oleada van al centro de la pantalla y no lo tocan.

### 4. Monedas: una por enemigo y quietas en el suelo (`js/logica/mundo.js`, `config/balance.js`)
- `config/balance.js` → `monedas`: `monedasPorEnemigo: 1`, `duracionMonedaSuelo: 10`, `parpadeoMoneda: 3`, `radioRecogida: { celular: 45, laptop: 20 }` (px alrededor del cuerpo; en línea se usa el de celular).
- Todos los enemigos (normales, arqueros, magos, ninjas, espadachines, aves y refuerzos) sueltan 1 moneda. Cae al suelo o a la plataforma donde estaba, **sin imán**, y se queda quieta. Se recoge tocándola (en pareja, el primero que la toque). Se mantiene el "+1" y el pulso del contador.
- En línea el líder decide dónde caen y quién las recoge; el invitado las ve por el snapshot de siempre y cuenta su parpadeo desde que le aparecen.
- **Jefe sin cambios:** sigue soltando sus monedas **con imán** (Gigante 80, Arquero Maestro 90, Mago Cósmico 100, Ninja Sombra 110). Sin imán y con 10 s, se perderían casi todas.
- `CONFIG.enemigos[...].monedas` (`js/config.js`) ya no se usa; se dejó como referencia.
- El nivel termina 4 s después del último enemigo aunque quede una moneda en el suelo (regla de antes, sin cambios).

**Antes por enemigo:** normal 3 · arquero 4 · mago 5 · espadachín 4 · ave 4 · ninja 5 (los refuerzos, según su tipo).

**Monedas por nivel, antes y ahora** (si se recogen todas; en pareja se juntan en un solo contador):

| Nivel | Enemigos solo / pareja | Monedas antes solo / pareja | Ahora solo / pareja | + bono | + jefe |
|---|---|---|---|---|---|
| Isla 1 | 133 / 199 | 463 / 677 | 133 / 199 | 60 | — |
| Isla 2 | 167 / 243 | 589 / 825 | 167 / 243 | 60 | — |
| Isla 3 | 202 / 284 | 702 / 972 | 202 / 284 | 60 | — |
| Isla 4 | 243 / 336 | 923 / 1251 | 243 / 336 | 60 | — |
| Isla 5 | 282 / 383 | 1076 / 1463 | 282 / 383 | 60 | — |
| Isla 6 | 292 / 394 | 1114 / 1509 | 292 / 394 | 60 | — |
| Isla 7 | 298 / 398 | 1153 / 1541 | 298 / 398 | 60 | — |
| Isla 8 | 342 / 451 | 1313 / 1749 | 342 / 451 | 60 | — |
| Isla 9 | 348 / 454 | 1318 / 1735 | 348 / 454 | 60 | — |
| Isla 10 | 289 / 380 | 1131 / 1465 | 289 / 380 | 60 | 80 |
| Cielo | 16 / 25 | 57 / 85 | 16 / 25 | 60 | 90 |
| Espacio | 15 / 23 | 61 / 88 | 15 / 23 | 60 | 100 |
| Ciudad | 16 / 25 | 73 / 115 | 16 / 25 | 60 | 110 |

Los refuerzos de la pelea con el jefe dan 1 moneda cada uno (antes 3 a 5); cuántos salen depende de cuánto dure la pelea. Ahora se gana entre **3,5 y 4,5 veces menos** por enemigo. Los precios de la tienda no cambiaron.

### Cómo probar
- **Celular (horizontal, pestaña privada):** el panel debe decir "versión 2026.11.10-3" y "Calidad: alta (automática) · tope de efectos 120 (celular)". Lanzar Cataclismo entre muchos enemigos: se ven los anillos y el destello, con menos chispas, y un número de daño por enemigo. El texto "Nivel 1 · Tramo X/7" se ve el doble de grande, debajo de las monedas. Las monedas quedan en el suelo: hay que acercarse para tomarlas; a los 7 s parpadean y a los 10 s desaparecen.
- **Laptop (F3):** "tope de efectos 300 (laptop)". El tramo queda del tamaño de antes. En una laptop lenta, la calidad pasa sola a "media" o "baja" y vuelve a "alta" cuando mejora.
- **Pareja / en línea:** la moneda es para el primero que la toque; en línea el invitado ve las mismas monedas y su parpadeo. Cada dispositivo muestra su propia calidad en el panel.

## 15. Cuadros iguales en los dos lados, pantalla completa, menos tirones y plataformas en línea

Versión `2026.11.10-5`. Respaldo: etiqueta de git `respaldo-antes-pantalla-completa-plataformas`. No cambiaron el daño, el balance, los controles, la tienda, los mundos, los niveles ni las monedas. Tampoco las alturas de salto, las velocidades ni la gravedad.

### 1. Cuadros de enfriamiento (`config/interfaz.js` → `habilidades`, `js/ui/hud.js`)
- Escalas: **celular 4.0 → 2.6** (65%) y **laptop 2.2 → 1.76** (80%).
- **Por qué el jugador 1 se veía más grande:** cada lado buscaba por su cuenta el tamaño que cabía. El jugador 2 tiene encima los botones táctiles (y en pareja el texto del centro), así que se achicaba solo (por ejemplo, 4.0 a la izquierda y 3.2 a la derecha).
- **Arreglo:** se busca el tamaño que cabe en cada lado y se usa **el menor para los dos**. Medido: celular 42 px y 42 px; laptop 56 px y 56 px.
- El acomodo se guarda y solo se recalcula si cambia la pantalla o algún obstáculo (como mucho una vez por segundo). Siguen sin tapar las barras, las monedas, el texto del tramo, la Pausa, el icono de pantalla completa, el joystick ni los botones.

### 2. Pantalla completa (`js/ui/pausa.js` → `PantallaCompleta`, `config/interfaz.js` → `pantallaCompleta`)
- **Icono pequeño** debajo del botón "Pausa" (34 px en celular, 28 px en laptop, opacidad 0,6); solo se ve mientras se juega.
- **Botón** "Pantalla completa" / "Salir de pantalla completa" en los tres menús de pausa (solitario/pareja, líder e invitado). El texto cambia solo.
- **Tecla F** en laptop (no actúa mientras se escribe un código). Aparece en "Cómo jugar" (tablas de PC y de celular).
- Si el navegador no la permite (por ejemplo, iPhone), **no se muestran** el icono ni el botón, y la tecla F avisa "Este navegador no permite pantalla completa".
- En celular, al entrar intenta fijar la pantalla en **horizontal** (`bloquearHorizontal: true`), si el navegador lo permite.
- El botón de pantalla completa del menú principal usa este mismo código.

### 3. Tirones en celular
- **Lienzo:** `config/interfaz.js` → `lienzo: { dprMax: 2, anchoMaxCelular: 1280, anchoMaxLaptop: 0 }`. En un celular de 844×390 con devicePixelRatio 3: **antes 1688×780 (1,3 millones de píxeles), ahora 1280×591 (0,76 millones; 42% menos)**. El CSS lo estira a la pantalla. El HUD se calcula con el alto del lienzo, así que los textos y los cuadros se ven del mismo tamaño (probado: legibles). En laptop no cambia.
- **Registro de atrasos** (`config/interfaz.js` → `rendimiento`): con `PerformanceObserver` de "longtask" se guarda cada bloqueo de 50 ms o más. Donde no existe (por ejemplo, iPhone) se usa el temporizador del panel. También se guarda cada cuadro que tarda 100 ms o más ("cuadro"), aunque no sea culpa del código. De cada atraso se guardan la hora, los ms, la memoria de JavaScript (si el navegador la da) y si en ese momento se dibujó **por primera vez** una hoja o un destello. Se ve en el panel ("PEOR MOMENTO": cantidad y el mayor) y al final de "Copiar registro", junto con el tamaño del lienzo y la calidad.
- **Precarga:** cada hoja se **decodifica** al cargar (`img.decode`) y se dibuja una vez en el lienzo del juego (la sube a la tarjeta gráfica). Además se preparan los **destellos** de "herido" (blanco y rojo) y la **estela del dash**, que antes se creaban la primera vez que pasaban, en plena pelea (12 lienzos, ~270 ms dentro de la pantalla de carga).
- **Objetos nuevos en cada cuadro — corregidos:** listas de enemigos, proyectiles, golpes, monedas y corazones (ahora se limpian en la misma lista); el objeto de ropa equipada del dibujo; el rango visible de la cámara; el cuadro de animación de cada jugador; el desglose del panel; la lista de obstáculos, el acomodo y los anchos de texto del HUD.
- **Objetos nuevos en cada cuadro — quedan** (cambiarlos tocaría controles o golpes): la lectura de controles (un `EstadoControl` y su lista de habilidades por jugador y por paso), `objetivosDe` (una lista por golpe activo), `jugadores.filter` en la separación de la pareja y en las oleadas, el objeto que elige la animación de cada jugador y los textos del HUD. Son pocos y pequeños.

### 4. Plataformas en celular (`js/red/sincronizacion.js`, `config/red.js` → `prediccion`)
- **Diagnóstico** con una simulación del líder y el invitado (ping de 60 a 200 ms, cuadros de celular de 16 a 130 ms, salto doble a una plataforma):
  - **Solitario y pareja local en celular: no pasa.** El juego ya calcula en pasos fijos de 1/60 s (como mucho 5 por cuadro) y detecta el cruce de la plataforma desde arriba aunque el cuadro se atrase.
  - **En línea, como invitado: sí pasa.** El líder lo tenía sobre la plataforma, pero en el celular del invitado quedaba hasta ~155 px más abajo, subía y volvía a caer.
  - **Causa principal (b):** la corrección del invitado con la posición del líder movía a Dudu poco a poco hacia arriba mientras su gravedad lo bajaba. Quedaba justo bajo el borde y la plataforma ya no lo detectaba, así que caía y se repetía. Probado: arreglando solo esto, ya queda bien.
  - **Causa secundaria (a):** la predicción del invitado usaba el tiempo variable de cada cuadro (el líder usa pasos fijos), así que su salto salía distinto y a veces no llegaba a la plataforma.
- **Arreglo:**
  - La predicción del invitado usa **pasos fijos de 1/60 s** con acumulador (como mucho 5 por cuadro), igual que el líder.
  - La corrección es **suave y con tolerancia:** si los dos dicen "parado" y la diferencia de altura es menor que `toleranciaSueloPx` (12 px), no se corrige ni cambia "sobre el suelo".
  - Una corrección nunca hunde al personaje bajo una plataforma.
  - Si el líder lo tiene parado en una plataforma o el suelo y aquí está a menos de 12 px bajando, queda parado ahí.
- Resultado en la simulación: **0 cuadros debajo de la plataforma** en todos los casos (antes, todos los cuadros medidos).
- Valores nuevos en `config/red.js` → `prediccion`: `pasosFijos: true`, `maxPasosPorCuadro: 5`, `suavizado: 10`, `zonaMuertaPx: 2`, `toleranciaSueloPx: 12`, `saltoDirectoPx: { x: 220, y: 260 }`. Los últimos tres ya existían como números en el código.

### Cómo probar
- **Celular (horizontal, pestaña privada):** el panel (5 toques arriba a la izquierda) debe decir "versión 2026.11.10-5" y "Lienzo 1280×…". Los cuadros de Bubu y de Dudu deben medir lo mismo. Tocar el icono pequeño debajo de "Pausa": entra en pantalla completa y queda en horizontal; en el menú de pausa, "Salir de pantalla completa". En iPhone no aparecen el icono ni el botón.
- **Laptop:** F entra y sale de pantalla completa (también después de salir con Esc). "Cómo jugar" muestra la tecla F. Lienzo igual que antes.
- **En línea (invitado en celular):** subir con doble salto a una plataforma y quedarse quieto: no debe subir y caer. Tras jugar, "Copiar registro" incluye la lista de atrasos con su hora, memoria y "primera vez".

## 16. Encuadre y HUD en celular (laptop sin cambios)

Versión `2026.11.10-8`. Respaldo: etiqueta de git `respaldo-antes-encuadre-celular`. Solo dibujo e interfaz: la lógica del juego y la red no cambiaron. **En PC/laptop todo se ve igual** (comparado con capturas a 1280×800: mismo ancho de mundo, misma cámara y mismo HUD).

### 1. Encuadre (solo celular) — `config/interfaz.js` → `encuadreCelular`
- **Antes:** el ancho visible era (ancho/alto de la pantalla) × 720. Un celular 2000×900 veía **1600** unidades de mundo (y el fondo también se armaba con el alto, por eso cabían 5 islas en vez de 4). Una laptop 16:10 ve **1152**.
- **Ahora:** en una pantalla más ancha que 16:10 (`relacionLaptop: 1.6`) se ve el **mismo ancho que en la laptop (1152)**; el alto visible queda en 518 unidades. El fondo usa la misma escala que en la laptop y se corre para que su suelo coincida con el de la pantalla.
- **Cámara vertical (celular):** el suelo queda fijo al 88% del alto (`sueloEnPantalla`). Sube solo si la cabeza del personaje **local** quedaría bajo la franja del HUD (25%) o tocando el borde de arriba. Movimiento suave (`suavizado: 10`), zona muerta de 14 unidades (no tiembla) y baja otra vez al caer o aterrizar. El fondo acompaña un 25% de esa subida (parallax).
  - Límite elegido: `subidaMax: 230` (≈ 2 personajes). Con 115 (≈ 1 personaje), un doble salto desde la plataforma más alta sacaba al personaje de la pantalla ~0,5 s; con 230 nunca sale (lo más alto queda al 4% del borde). En ese punto la cabeza pasa un momento por la zona del HUD.
  - Saltar desde el suelo no mueve la cámara.
- **Cada teléfono sigue a su propio personaje** para la altura (solitario, y en línea el líder sigue a Bubu y el invitado a Dudu). A lo ancho, la cámara sigue encuadrando a los dos como siempre, para no perder al compañero.
- **No se dibuja lo que queda fuera de cámara:** enemigos (también los que vienen cayendo desde arriba), monedas, proyectiles, partículas y textos, ahora también arriba y abajo.
- **Lienzo en celular** = mundo visible (`lienzo.pxPorUnidadCelular: 1`): 2000×900 → **1152×518** (antes 1280×576). Los textos y cuadros del HUD se ven del mismo tamaño (se calculan con el alto del lienzo).

### 2. Modos
- **"Niveles en pareja" (local) no aparece en el menú del celular** (solo se oculta; el código sigue). En PC/laptop sigue igual. Pareja en línea sigue en celular.
- **Versus:** es **solo local** (dos jugadores en la misma pantalla y teclado; no hay versus en línea). La cámara ya muestra la arena completa con zoom fijo, sin seguir a nadie; no se cambió.

### 3. HUD en celular — `config/interfaz.js` → `hudCelular`
- Habilidades y combos en **una sola fila** (`unaFila`), con el HUD de como máximo **25% del alto** (`altoMaximo`). Medido a 2000×900: **43% → 23%** en pareja y 24% en solitario. Los dos lados miden igual (73 px en pareja, 78 px en solitario).
- Los combos muestran **"H1+H2" debajo del cuadro** (no encima del ícono) y el costo de maná en la esquina.
- "Revivir ♥♥" queda separado de "Nivel · Tramo" (`separacionRevivirTramo: 8`).
- La Pausa, la pantalla completa y los botones táctiles no cambiaron.

### 4. Brillos y monedas
- El HUD y las monedas **no tienen brillo** (sin `shadowBlur`). Las barras usan degradados lineales pequeños (baratos).
- La luz amarilla de arriba a la derecha es el **sol del fondo** (un degradado circular por cuadro, barato): se dejó.
- **Monedas más grandes en celular:** `monedas: { radioCelular: 13, radioLaptop: 8 }` (solo el dibujo; la zona para recogerlas no cambió).

### Cómo probar
- **Celular (horizontal):** se ven 4 islas del fondo como en la laptop. El HUD ocupa la franja de arriba (una fila). En un doble salto desde una plataforma alta, la cámara sube un poco y vuelve a bajar al aterrizar. El menú principal no muestra "Niveles en pareja". Panel (5 toques): "Lienzo 1152×…".
- **Laptop:** todo igual que antes.

## 17. Internet inestable: interpolación adaptativa, avisos y reconexión

Versión `2026.11.10-10`. Respaldo: etiqueta de git `respaldo-antes-red-inestable`. El líder sigue decidiendo todo; no cambió la lógica del juego. El canal rápido, el canal del ping y los límites de cola siguen igual.

### 1. Interpolación adaptativa — `config/red.js` → `interpolacion`
- El invitado dibuja a los demás con un "colchón" de **100 ms** con la red estable. Si la llegada de los snapshots o el ping varían mucho, sube rápido (300 ms por segundo) hasta **200 ms**. Cuando la red se estabiliza, baja **despacio** (15 ms por segundo).
- Probado con una red simulada de 30 a 150 ms: 100 → 151 → 187 → 200 ms en ~5 s; al estabilizarse, 186 → 171 → … → 100 en ~7 s, sin avisos ni saltos.
- Se ve en el panel ("Interpolación: … ms") y en "Copiar registro" (columna `interpolacion_ms`).

### 2. Nunca pantalla negra — `config/red.js` → `conexion`, `Menus.avisoRed`
- **Aviso encima del juego** (el juego sigue visible detrás), con botones **Reintentar** y **Salir**:
  - "Esperando datos del líder…": la conexión sigue (llega el ping) pero no llega el juego, por ejemplo con el juego del líder en segundo plano.
  - "Reconectando…": no llega nada, o se está intentando volver (muestra "intento n de 4").
  - "No se pudo conectar": se acabaron los intentos, la sala ya no existe o no conectó al unirse (en 20 s), con el motivo.
- Sale si no llega **ningún snapshot en 2 s** durante la partida (no durante la pausa del líder) y se quita solo cuando vuelven.
- **Al entrar o volver** a una partida, el juego aparece solo cuando ya llegó el **primer estado** del líder (las imágenes ya están cargadas desde el inicio). El líder siempre manda el estado completo a quien entra.
- Se corrigió un error que ya existía: un snapshot que no se podía rearmar (uno viejo que llega tarde por el canal rápido) hacía fallar la recepción. Ahora se descarta en silencio.

### 3. Volver a la sala tras una caída (sin perder la partida del líder)
- **Ya existía:** el líder sigue jugando cuando el invitado se va, y si el invitado vuelve con el código, Dudu reaparece con su vida.
- **Lo que fallaba y se arregló:**
  - Ante una caída, el invitado iba al menú. Ahora **reintenta solo**: 4 intentos de 8 s, con el mismo código.
  - Si el líder todavía no había notado la caída, rechazaba la conexión nueva como "sala llena". Ahora el invitado lleva una **marca de su sesión** y el líder cambia la conexión vieja por la nueva. Si la vieja lleva 1,5 s callada, también la acepta. Una tercera persona sigue viendo "sala llena".
  - Si el invitado vuelve cuando el nivel ya terminó, el líder lo manda a la sala.
- Si el líder cierra la sala ("Finalizar") el invitado va al menú como antes, sin reintentar.

### 4. Registro de conexión ("Copiar registro" → "Eventos de conexión")
Con su hora: cambios de estado ICE y de la conexión WebRTC, apertura y cierre de los DataChannel (fiable y rápido), servidor de emparejamiento conectado o perdido, errores con su tipo, caídas y su motivo, cada intento de reconexión, motivo de fallo al entrar, "no llegó ningún snapshot tras entrar", "volvieron los snapshots" y tipo de conexión (directa / TURN) cada vez que cambia.

### 5. Consejo en la pantalla "Jugar en línea"
"💡 Que cree la sala el dispositivo más potente (por ejemplo, la laptop). Ese dispositivo calcula todo el juego."

### Herramienta de prueba
`EnLinea.simularCorte(ms)` en la consola: durante ese tiempo no entra ni sale ningún mensaje del juego en ese dispositivo (como si se cortara el WiFi). `RED_CONFIG.latenciaPrueba = { ms: 45, variacion: 60 }` simula una red que sube y baja.

### Qué se probó (dos pestañas en la misma computadora, conexión real por PeerJS)
- Corte de 3,5 s en el invitado: aviso a los 2 s, se quita solo, sin reconectar.
- Corte de 9 s: aviso; a los 6 s, reconexión automática (intento 1) en ~1,6 s; el líder siguió en el mismo nivel y Dudu volvió a la partida.
- Conexión nueva del invitado con la vieja todavía abierta: el líder la aceptó y mandó el estado completo.
- El líder cierra de golpe: "Reconectando…" y luego "La sala ya no existe" con Reintentar y Salir; el juego sigue visible detrás.
- Red inestable (30–150 ms): interpolación 100 → 200 → 100 ms, sin errores.

**No se pudo probar:** dos dispositivos reales en redes distintas, datos móviles, cambio real de WiFi a datos y el TURN (el Worker solo acepta la web publicada, no `localhost`).

## 18. Expulsión del invitado, joystick fijo, textos del menú y versión v1.00

Versión **v1.00** (técnica `2026.11.10-v1.00`). Respaldo: etiqueta de git `respaldo-antes-expulsion-joystick-version`. La arquitectura en línea no cambió (el líder decide todo).

### 1. El invitado era expulsado: causa y arreglo
**Causa real (reproducida con dos pestañas):** PeerJS usa un **servidor de emparejamiento** (0.peerjs.com) solo para que los dos dispositivos se encuentren; después la partida va **directa** entre ellos. Cuando el internet parpadea, la conexión con ese servidor se cae y PeerJS avisa un error `network` ("Lost connection to server"). El código trataba ese aviso como un error grave:
- en el **invitado**, cerraba la conexión directa con el líder (que seguía funcionando), y el invitado quedaba fuera con "No se pudo conectar (motivo: network)";
- en el **líder**, cerraba la sala y le mandaba "cerrar" al invitado, que también quedaba fuera.

Por eso siempre salía el invitado, sin importar qué dispositivo creara la sala. La versión distinta **no** expulsaba (solo mostraba un aviso corto).

**Arreglo:** perder el servidor de emparejamiento ya **no toca la partida**. Se anota en el registro y el líder vuelve a conectarse a ese servidor cada 3 s, para que el invitado pueda volver si lo necesita. Probado: se cortó ese servidor en el invitado y luego en el líder, en plena partida, y la partida siguió sin cortes.

**Todos los lugares donde el invitado puede salir o desconectarse** (`js/red/enlinea.js`):

| Lugar | Umbral | Qué pasa ahora |
|---|---|---|
| Error del servidor de emparejamiento (`network`, `socket-error`, `socket-closed`, `server-error`, `disconnected`) | inmediato | **Ya no expulsa** (antes sí: era la causa). |
| ICE "disconnected" (corte momentáneo) | — | No expulsa: aviso "Reconectando…" que se quita si la conexión vuelve. |
| Silencio total del líder (lo detecta el invitado) | antes 6 s, ahora **12 s** (`conexion.silencioInvitadoSegundos`) | Reconecta solo: 4 intentos de 8 s con el mismo código. |
| Silencio total del invitado (lo detecta el líder) | antes 6 s, ahora **15 s** (`conexion.silencioLiderSegundos`) | Dudu queda fuera y puede volver con el código. |
| Sin snapshots en partida | 2 s | Solo aviso "Esperando datos…" o "Reconectando…". |
| ICE "failed" o canal cerrado | lo decide PeerJS | Reconexión automática (4 intentos). |
| No conecta al unirse | 20 s | "No se pudo conectar", con Reintentar y Salir. |
| La sala no existe | — | "La sala ya no existe", con Reintentar y Salir. |
| Sala llena (otra persona ya adentro) | si la conexión vieja lleva menos de 1,5 s callada | "Esa sala ya está llena". El mismo invitado (misma sesión) siempre entra. |
| El líder cierra la sala o pulsa "Finalizar juego" | — | Mensaje con el motivo. |
| Error grave del líder (navegador sin WebRTC, etc.) | — | Sale con el motivo. |
| Versión distinta | — | **No expulsa**: aviso "Versión distinta (tuya X, sala Y). Recarga la página" con los botones **🔄 Recargar** (recarga sin caché) y "Seguir igual". |

Cada salida muestra **el motivo en pantalla** y queda en "Copiar registro" ("— motivo: …").

### 2. Joystick fijo (solo celular): `config/interfaz.js` → `joystickFijo`
- La base está siempre visible en el mismo lugar: su centro queda al **16%** desde la izquierda y al **72%** de la altura. Mide el 30% del alto, entre 110 y 170 px.
- La dirección se mide **desde el centro de la base**, no desde donde empezó el toque. La zona de toque es 1,7 veces la base.
- La zona muerta es del 12%. Abajo = agacharse: hay que bajar más del 60% y más hacia abajo que hacia el lado. En diagonal se camina.
- Cada dedo se sigue por su identificador, así que joystick y botones funcionan a la vez. Un toque nuevo siempre toma el joystick.
- Si el sistema cancela el toque (llamada, notificación, cambiar de app), todo se suelta y nada queda pegado.
- Probado:
  - tocar a la derecha del centro: camina a la derecha;
  - jalar en diagonal abajo-derecha: camina, no se agacha;
  - jalar recto hacia abajo: se agacha;
  - cancelar el toque: se suelta.

### 3. Laptop/PC: textos del HUD más grandes (`config/interfaz.js`)
- `textoTramo.escalaLaptop`: de 1.0 a **1.4**.
- `textoRevivir.escalaLaptop`: **1.4** (nuevo).
- En celular no cambió nada (escalaCelular 2.0 y 1.0). Los cuadros de habilidades siguen esquivando estos textos.

### 4. Versus
- (En v1.00 el versus en línea todavía no existía. Desde v1.01 sí: ver sección 19).
- En celular, el versus local se oculta.

### 5. Textos pequeños en el menú: `config/interfaz.js` → `textosMenu`
| Botón | Texto |
|---|---|
| Niveles en solitario | "(sin internet)" |
| Niveles en pareja (solo PC) | "(2 jugadores en este equipo · sin internet)" |
| Versus en PC | "(2 jugadores en este equipo · sin internet)" |
| Versus en celular | "(en línea · próximamente)" |
| Jugar en línea | "(niveles en pareja · 2 dispositivos con internet)" |

En pantallas bajas (celular horizontal) el menú se compacta y todo cabe sin desplazar. Probado a 800×360 y 740×320.

### 6. Número de versión
- En `index.html`:
  - `VERSION_VISIBLE = '1.00'`
  - `VERSION_JUEGO = '2026.11.10-v' + VERSION_VISIBLE` (sirve para la caché).
- Regla: cada actualización sube 0.01 (1.01, 1.02…); un cambio grande sube a 1.10, 2.00, etc. Cada versión se anota en `CAMBIOS.md`.
- Dónde se ve:
  - esquina del menú de inicio;
  - pantalla de pausa;
  - panel de depuración y "Copiar registro";
  - sala en línea: "Versión: Bubu (líder) v1.00 · Dudu (invitado) v1.00", en rojo si no coinciden.

### Cómo probar
- **Dos dispositivos:** crear la sala en uno, entrar con el otro y jugar con internet inestable. Si algo corta, el aviso dice el motivo y "Copiar registro" lo guarda.
- **Celular:** el joystick está fijo abajo a la izquierda. Jalar a un lado camina aunque el dedo empiece fuera del centro.
- **Consola del invitado:** `EnLinea.simularCorte(13000)` muestra el aviso, reconecta solo y vuelve a la partida. Probado: volvió en ~14 s y Dudu siguió en el nivel.

**No se pudo probar:** dos dispositivos reales en redes distintas, datos móviles, el joystick con dedos de verdad en un celular real y el TURN.

## 19. Versus en línea (v1.01)

Versión **v1.01** (técnica `2026.11.10-v1.01`). Respaldo: etiqueta de git `respaldo-antes-versus-enlinea`. Misma arquitectura que la pareja en línea: **el líder (Bubu) calcula todo** y manda el estado; el invitado (Dudu) manda sus controles y dibuja. Las reglas del versus no cambiaron (al mejor de 3 rondas, mismo daño, misma arena).

### Cómo se juega
- **PC/laptop:** menú → **Versus** → "Local" (2 jugadores en este equipo, como antes) o "🌐 En línea".
- **Celular:** menú → **Versus** → va directo a "Versus en línea" (el local está oculto).
- También desde "Jugar en línea": en la sala, el líder elige **🤝 Niveles en pareja** o **⚔ Versus** (`RED_CONFIG.modos`). El invitado ve en su pantalla qué modo eligió el líder.
- Al terminar: el líder ve "¡X GANA!", el marcador y los botones **Revancha** (otro versus para los dos) y **Volver a la sala**. El invitado ve lo mismo y espera la elección.

### Qué se reutilizó y qué es nuevo
- **Reutilizado:** sala, código, reconexión, snapshots (ya llevaban `ronda`, `rondas` y `ganador`), efectos (los carteles "RONDA 2" y "¡K.O.!" viajan como cualquier efecto), controles del invitado, pausa con checks.
- **Nuevo:**
  - selector de modo en la sala;
  - el mensaje `modoSala` (el líder avisa el modo elegido);
  - "fin" con el ganador y el marcador;
  - pantalla de fin del invitado;
  - pantalla "Local o En línea" en PC.
- **Rival desconectado:** en versus, Dudu **no** queda "fuera" (eso le daría la ronda a Bubu).
  - Si el líder no recibe nada del rival durante **4 s** (`conexion.versusPausaSinRivalSegundos`), el combate **se pausa**.
  - El aviso de pausa se repite cada segundo, por si el primero se perdió en el corte.
  - Cuando el rival vuelve, los dos pulsan "Reanudar".

### Qué se probó (dos pestañas: líder en laptop 1280×800 e invitado en celular 800×360 táctil)
- Desde "Versus → En línea" en PC y "Versus" en celular, la sala se crea en modo versus. El líder cambia a pareja y vuelve a versus, y el invitado lo ve.
- El combate inicia en los dos dispositivos y el invitado camina con el joystick fijo.
- K.O. → "RONDA 2" y el marcador (un punto azul) en el celular → segundo K.O. → "¡Bubu GANA! Rondas: Bubu 2 · Dudu 0" en los dos.
- Revancha: ronda 1, marcador 0–0. "Volver a la sala": los dos vuelven a la sala.
- Corte de 7 s del invitado: pausa a los ~4,7 s, nadie gana la ronda y se reanuda con los dos checks.
- Corte de 16,5 s: pausa, reconexión automática (intento 1) y reanudación.
- El versus local en PC sigue igual.

**Nota:** en celular, el personaje que empieza a la derecha de la arena puede quedar detrás de los botones táctiles (son semitransparentes), igual que en pareja.

**No se pudo probar:** dos dispositivos reales en redes distintas, datos móviles y combates reales con dedos (los golpes del invitado se ven con el retraso del ping, igual que en pareja).

## 20. Daños nuevos, mejoras de daño en la tienda y versus con 500 de vida (v1.02)

Versión **v1.02** (técnica `2026.11.12-v1.02`). Respaldo: etiqueta `respaldo-antes-mejoras-tienda`. Todos los números están en `config/balance.js` (`habilidades`, `combos`, `mejoras` y `versus`).

### 1. Daños base (`BALANCE.habilidades` y `BALANCE.combos`)
| Habilidad | Antes | Ahora |
|---|---|---|
| H1 Cuchilla (lanzada, tecla 1) | 4 | **16** |
| H2 Espada (de cerca, tecla 2) | 10 | **22** (enemigo del nivel 1 en 4 golpes) |
| H3 Flash | 30 | **35** |
| H4 Onda de choque (área) | 80 | **70** (en el borde 40% = 28) |
| Corte volador (H1+H2) | 28 | **40** |
| Torbellino (H2+H3, área, 6 golpes) | 70 | **84** (14 por golpe) |
| Cataclismo (H3+H4, área) | 160 | **100** (con mejoras hasta 200) |

El usuario eligió: la espada de cerca (tecla 2) hace 22 y la cuchilla lanzada (tecla 1) hace 16. Las teclas no cambiaron. No cambiaron el maná, los enfriamientos, las áreas, la vida de los enemigos, los jefes ni las oleadas.

Golpes de espada para un enemigo normal (vida 70 × 1.15^(nivel−1)):
| Nivel | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Vida | 70 | 81 | 93 | 106 | 122 | 141 | 162 | 186 | 214 | 246 |
| Base (22) | 4 | 4 | 5 | 5 | 6 | 7 | 8 | 9 | 10 | 12 |
| Mitad de mejoras (33) | 3 | 3 | 3 | 4 | 4 | 5 | 5 | 6 | 7 | 8 |
| Todas (44) | 2 | 2 | 3 | 3 | 3 | 4 | 4 | 5 | 5 | 6 |

### 2. Tienda → pestaña "Mejoras" (`js/logica/mejoras.js`, `js/ui/tienda.js`, `BALANCE.mejoras`)
- Arriba de la tienda: pestañas **👕 Ropa** / **⚔ Mejoras** y el selector **Bubu / Dudu**.
- 7 mejoras (H1, H2, H3, H4, Corte volador, Torbellino, Cataclismo), **por personaje**, 5 niveles cada una. Cada nivel suma +20% del daño base: nivel 5 = base × 2. El área, la caída por distancia, el maná y los enfriamientos no cambian.
- Cada fila muestra el ícono, el nombre, el nivel (●●○○○), el daño actual → el siguiente, y "Comprar 🪙 precio". El botón se ve apagado si faltan monedas; al máximo dice "Máximo ✓".
- **Bloqueada** hasta completar el nivel 5 (`desbloqueaAlSuperar: 'isla-5'`): muestra "🔒 Se desbloquea al completar el nivel 5". La ropa funciona igual.
- **Guardado:** `Guardado.datos.mejoras = { bubu: [7 niveles], dudu: [...] }`, en la misma clave de siempre. Las partidas viejas se completan con ceros al cargar; no se borra nada.
- **Daño en juego:** `HABILIDADES.usar` y `COMBOS.intentar` multiplican el daño por las mejoras del jugador (`jugador.mejoras`). Los números flotantes muestran el daño real.
- **Pareja local:** Bubu usa las mejoras de Bubu y Dudu las de Dudu.
- **En línea:** al conectarse, el invitado manda las mejoras de su Dudu en el mensaje `version` (también al reconectarse). El líder las guarda en `EnLinea.mejorasInvitado`, las aplica al jugador 2 y calcula el daño con ellas. El líder nunca usa sus propias mejoras de Dudu para el invitado.

**Precios** (`precioBase × 1.5^(nivel−1)`, redondeado a 5):
| Mejora | N1 | N2 | N3 | N4 | N5 | Total |
|---|---|---|---|---|---|---|
| Cuchilla, Espada | 115 | 175 | 260 | 390 | 580 | 1520 c/u |
| Flash, Onda | 175 | 265 | 395 | 590 | 885 | 2310 c/u |
| Corte volador, Torbellino | 230 | 345 | 520 | 775 | 1165 | 3035 c/u |
| Cataclismo | 345 | 520 | 775 | 1165 | 1745 | 4550 |

Las 35 mejoras de un personaje cuestan 18 280 monedas.

### 3. Economía (calculada con `herramientas/simular_mejoras.js`)
Monedas por nivel del Mundo 1 (solitario, recogiendo todas): 1 por enemigo y por ave, más 60 de bono. En el nivel 10 se suman el Gigante (80) y unos 5 refuerzos.
| Nivel | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Monedas | 193 | 227 | 262 | 303 | 342 | 352 | 358 | 402 | 408 | 434 | **3281** |

- **Rejugar un nivel da monedas otra vez** (enemigos y bono de 60). La derrota también guarda lo recogido.
- **Simulación** (todas las monedas solo en mejoras de un personaje, comprando la más barata posible): el nivel 5 da 7 mejoras al abrir la pestaña, y después 9, 10, 11, 13 y **14 de 35 al terminar el nivel 10**. Recogiendo el 85% de las monedas: 6 al abrir y 13 al final.
- El usuario eligió esta opción "intermedia". Las metas "4–6 al desbloquear" y "la mitad al nivel 10" no se pueden cumplir a la vez: los niveles 6–10 dan solo 1,5 veces lo de los niveles 1–5.
- **Ropa (sin cambios):** toda la ropa cuesta 3200 (2450 en conjuntos y 750 en cabeza), casi lo mismo que todo el Mundo 1. Se compra una vez para los dos personajes. Comprar ropa retrasa las mejoras; no rompe la economía.

### 4. Versus (`BALANCE.versus`)
- **500 de vida** por ronda (`versus.vida`; antes 100). El HUD muestra "500/500" y cabe en celular y en laptop.
- **Siempre daño base** (`versus.usarMejoras: false`).
- **Sin regeneración:** no caen corazones, no hay curación por tramo y no hay robo de vida.
- El versus multiplica todo el daño por **0.8** (`CONFIG.versus.multiplicadorDanio`, en `js/config.js`).

Golpes para ganar con 500 de vida:
| Habilidad | Daño real | Golpes |
|---|---|---|
| Cuchilla | 13 | 39 |
| Espada | 18 | 28 |
| Flash | 28 | 18 |
| Onda | 56 | 9 |
| Corte volador | 32 | 16 |
| Cataclismo | 80 | 7 |

Funciona igual en local y en línea, porque el líder crea los jugadores con 500 y lo manda en los snapshots.

### 5. Análisis: Cataclismo en el Espacio (sin cambios aplicados)
- El Espacio es un solo nivel con la vida del "nivel 12": enemigos de **326** y jefe de **3260** (5216 en pareja).
- Usan la misma fórmula: Cielo nivel 11 (283 / 2830) y Ciudad nivel 13 (375 / 3750).

Cataclismos para matar a un enemigo normal:
| | Vida | Base 100: centro / borde | Mejoras al máximo (200): centro / borde | Antes (160): centro / borde |
|---|---|---|---|---|
| Isla 1 | 70 | 1 / 2 | 1 / 1 | 1 / 2 |
| Isla 10 | 246 | 3 / 7 | 2 / 4 | 2 / 4 |
| Cielo | 283 | 3 / 8 | 2 / 4 | 2 / 5 |
| **Espacio** | **326** | **4 / 9** | **2 / 5** | **3 / 6** |
| Ciudad | 375 | 4 / 10 | 2 / 5 | 3 / 6 |

Causas:
- **La vida crece y el daño no:** en el Espacio, la vida es 4,65 veces la del nivel 1.
- **Solo el enemigo más cercano recibe el 100%.** Los demás reciben menos, hasta 40% en el borde.
- **Los magos (el enemigo principal del Espacio) se quedan a 220–380 px** y se teletransportan a 320–430 px si te acercas. El radio del Cataclismo es 260 px, así que casi siempre quedan en el borde o fuera.
- Con 20 s de enfriamiento, matar a uno puede llevar más de un minuto de Cataclismos.

En v1.02 no se cambió nada. El usuario eligió la propuesta A, que se aplicó en v1.03 (sección 21).

### 6. Monedas
Verificado: las monedas del suelo y del HUD **no tienen brillo** (sin `shadowBlur`, solo relleno y borde). Ya eran más grandes en celular (`CONFIG.interfaz.monedas.radioCelular: 13`, laptop 8). No se cambió.

### Cómo probar
- **Tienda bloqueada:** con una partida que no completó el nivel 5, "Tienda → 🔒 Mejoras" muestra el aviso, y la ropa funciona.
- **Tienda desbloqueada:** al completar el nivel 5 aparecen las 7 filas. Comprar la Espada de Bubu: ●○○○○, 26 → 31, y las monedas bajan 115.
- **Combate:** con esa mejora, la espada de Bubu marca "26" sobre el enemigo y la cuchilla "16".
- **Versus:** los dos tienen 500/500 y la espada marca 18, aunque haya mejoras compradas.
- **En línea:** el invitado con la Espada de Dudu al máximo pega 44. En el panel (F3) → "Copiar registro" aparece "Mejoras del invitado: …".

### Qué se probó
- Celular 800×360 y laptop 1280×800: tienda bloqueada y desbloqueada, compra, botón apagado sin monedas y "Máximo".
- Una partida guardada vieja, sin mejoras, se migra a ceros y conserva monedas y ropa.
- Daño en combate: 26 con la mejora y 16 de la cuchilla base.
- Pareja local: cada uno usa sus mejoras.
- Versus local y en línea: 500/500 en el líder y en el invitado, daño base y 500 en la ronda 2.
- Pareja en línea con dos pestañas reales (PeerJS): el líder recibió `0,5,0,0,0,0,0` y la espada de Dudu pegó 44, mientras la de Bubu (nivel 2) pegó 31.

**No se pudo probar:** dos dispositivos reales, ni partidas largas completas para ver cuántas monedas recoge de verdad una persona (la tabla supone que se recogen todas).

## 21. Cataclismo más ancho (v1.03)

Versión **v1.03** (técnica `2026.11.12-v1.03`). Respaldo: etiqueta `respaldo-antes-cataclismo-radio`. Es la propuesta A del análisis de la sección 20.5, elegida por el usuario.

### Qué cambió (`config/balance.js` → `combos`)
- **Radio del Cataclismo:** de 260 a **380 px**. Alcanza a los magos, que se quedan a 220–380 px.
- **Mínimo en el borde:** de 40% a **60%**, solo para el Cataclismo (`minimoArea: 0.6`). La Onda (H4) y el Torbellino siguen con el 40% general (`areaDanio.minimo`).
- El código pasa el mínimo propio al golpe de área: `BALANCE.factorArea(fraccion, minimo)` y `Golpe.minimoArea`.
- No cambiaron el daño (100, o 200 con mejoras), el maná, el enfriamiento ni la vida de los enemigos.

### Resultado (probado en el Espacio, enemigos de 326 de vida, en suelo plano)
| Distancia del enemigo | Daño base | Cataclismos | Con mejoras al máximo | Cataclismos |
|---|---|---|---|---|
| 40 px (el más cercano) | 100 | 4 | 200 | 2 |
| 250 px | 75 | 5 | 151 | 3 |
| 370 px (mago lejos) | 63 | 6 | 126 | 3 |
| 430 px | fuera | — | fuera | — |

Antes, el mago a 370 px no recibía daño (estaba fuera de los 260 px).

### Cómo probar
En el Espacio, lanzar el Cataclismo (H3+H4) con magos alrededor. Los que están a unos 4 cuerpos de distancia también reciben daño, con números de 60 o más.

**No se pudo probar:** una partida completa del Espacio jugada a mano.

## 22. Corte volador y Torbellino sin retroceso, monedas al doble (v1.04)

Versión **v1.04** (técnica `2026.11.12-v1.04`). Respaldo: etiqueta `respaldo-antes-sin-retroceso-combos`.

### 1. Corte volador y Torbellino: sin retroceso ni pausa (`config/balance.js` → `combos`)
**Por qué temblaban:** había dos causas, y cada golpe repetía las dos.
- **El empujón:** cada golpe reiniciaba un empujón de unos 60 px. El Torbellino golpea cada 0,125 s, así que el enemigo daba pasos atrás seguidos.
- **La pausa de impacto:** cada golpe congelaba todo el mundo entre 0,03 y 0,09 s. Con muchos golpes seguidos, el enemigo avanzaba a tirones.

**Arreglo:**
- Corte volador y Torbellino tienen ahora `retroceso: 0` y `aturdimiento: 0`:
  - `retroceso`: 1 = empujón normal, 0 = sin empujón.
  - `aturdimiento`: 1 = pausa de impacto normal, 0 = sin pausa.
- El enemigo (o el jefe) sigue caminando o atacando mientras recibe el daño, y su estado no se reinicia. Solo queda el destello rápido al recibir daño.
- Daño, área, maná, enfriamientos y efectos visuales iguales.
- El resto de habilidades no cambió: H1/H2 sin empujón como antes; H3, H4 y Cataclismo con empujón y pausa.
- Código: `Golpe`/`Proyectil` (`retroceso`, `aturdimiento`) → `info` → `Enemigo.recibirDanio` y `Jefe.recibirDanio` (sin empujón si es 0) y `Mundo.aplicarDanio` (sin pausa de impacto si es 0, solo contra enemigos).
- **Versus no cambió:** contra un jugador se usa el empuje de siempre (`empujeX/empujeY`) y la pausa de impacto normal. Probado: el Torbellino sigue empujando al rival (234 px/s) y pausando 3 cuadros.

**Medido** (5 enemigos en fila; 75 cuadros):
| Habilidad | Cuadros con pausa | Cuadros con empujón | Retroceso máximo por cuadro |
|---|---|---|---|
| Torbellino | 0 | 0 | 2,7 px (lo que caminan) |
| Corte volador | 0 | 0 | 1,2 px |
| Onda H4 (sin cambios) | 6 | 60 | 10,5 px |
| Flash H3 (sin cambios) | 15 | 90 | 10,6 px |

El jefe (Gigante) con Torbellino no tuvo ni empujón ni pausa.

**En línea** (dos pestañas reales; velocidad máxima de los enemigos que ve el invitado):
| Situación | Velocidad máxima |
|---|---|
| Solo caminando | 153 px/s |
| Torbellino | 126–235 px/s |
| Corte volador | 186 px/s |
| Onda (empuja, sin cambios) | 764 px/s |

Sin saltos con las dos habilidades.

### 2. Monedas al doble (`config/interfaz.js` → `monedas`)
- **Tamaño del dibujo:** `radioCelular: 26` (antes 13) y `radioLaptop: 16` (antes 8). El borde engrosa un poco con el tamaño.
- **Sin brillo**, sin sombras: solo relleno y borde.
- **Monedas del jefe (imán):** con el tamaño nuevo se dibujan siempre apoyadas sobre el suelo, sin hundirse. El imán funciona igual.
- **Área para recogerlas:** no depende del dibujo (`BALANCE.monedas.radioRecogida`: 45 en celular y 20 en laptop). No se cambió.
- **Contador del HUD:** la moneda de arriba no se agrandó (`monedas.hud: 13`, ahora en config). Va pareja con el número y, si se agranda, choca con los textos de al lado.
- Probado en celular 800×360 y laptop 1280×800:
  - monedas sueltas, 6 juntas y sobre una plataforma;
  - el parpadeo y que desaparecen a los 10 s;
  - 25 monedas de jefe con imán: se recogieron las 25.

### Cómo probar
- Usar Torbellino (H2+H3) o Corte volador (H1+H2) contra un grupo: los enemigos siguen caminando hacia ti mientras pierden vida, sin saltar hacia atrás.
- Las monedas caídas se ven el doble de grandes.

**No se pudo probar:** con dedos en un celular real ni en dos dispositivos reales.

## 23. H3 (Flash, el rayo) sin retroceso (v1.05)

Versión **v1.05** (técnica `2026.11.12-v1.05`). Respaldo: etiqueta `respaldo-antes-h3-sin-retroceso`.

### Qué cambió
- Se usa el mismo sistema que en la sección 22: H3 tiene `retroceso: 0` y `aturdimiento: 0` en `config/balance.js → habilidades`.
- Contra enemigos y jefes, H3 ya no empuja ni hace la pausa de impacto. El enemigo sigue caminando o atacando mientras pierde vida, con el destello rápido de siempre.
- El daño (35), el área, el maná (10), el enfriamiento (3 s) y el efecto del rayo no cambiaron.
- `aplicarBalance` copia `retroceso` y `aturdimiento` a `CONFIG.habilidades`, y `HABILIDADES.dash` los pasa al golpe.
- H1, H2, H4 y Cataclismo no se tocaron. Probado: H4 sigue empujando.
- **Versus no cambió:** contra un jugador se usan el empuje y la pausa de siempre. Probado: H3 empuja al rival a 342 px/s y pausa 4 cuadros.

### Medido: oleada grande (15 enemigos juntos, 4 lanzamientos de H3, navegador headless)
| | Laptop antes | Laptop después | Celular antes | Celular después |
|---|---|---|---|---|
| Tiempo de cuadro, promedio (simulación + dibujo) | 2,42 ms | 2,30 ms | 3,04 ms | 2,94 ms |
| Tiempo de cuadro, 95% de los cuadros | 3,6 ms | 3,5 ms | 3,6 ms | 4,2 ms |
| Cuadros con el mundo en pausa de impacto | **63 de 132** | **0** | **68 de 142** | **0** |
| Cuadros con algún enemigo empujado | 831 | 0 | 896 | 0 |
| Retroceso máximo de un enemigo por cuadro | 13,3 px | 2,6 px (camina) | 13,3 px | 2,3 px (camina) |
| Números de daño | 84 | 60 (1 por enemigo) | 88 | 60 |

- **Conclusión:** no había un problema de cálculo; los cuadros tardan unos 3 ms de los 16 ms disponibles.
- La sensación de "trabado" venía de la **pausa de impacto**: el mundo quedaba congelado casi la mitad del tiempo después de golpear a muchos a la vez. A eso se sumaban los empujones.
- Los picos sueltos (17–80 ms) aparecen antes y después y no dependen de H3: son del navegador de prueba.

**En línea** (dos pestañas reales; velocidad máxima de los enemigos que ve el invitado):
| Situación | Velocidad máxima |
|---|---|
| Solo caminando | 141 px/s |
| H3 | 161–274 px/s |
| H4 (empuja, sin cambios) | 738 px/s |

Sin saltos.

### Cómo probar
Usar H3 contra un grupo grande: los enemigos siguen avanzando mientras el rayo los atraviesa, sin saltar hacia atrás ni congelarse.

**No se pudo probar:** en un celular real con dedos ni en dos dispositivos reales.
