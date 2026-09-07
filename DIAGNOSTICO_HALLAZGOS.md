# Diagnóstico de hallazgos — auditoría FRONTEND_VISION.md (Fases 1 a 7)

Este documento cierra la auditoría de los 32 hallazgos detectados en
`FRONTEND_VISION.md`, trabajados fase por fase. Para cada hallazgo se
indica su estado final, qué lado del proyecto lo resuelve (Frontend,
Backend o Ambos) y la justificación, con el commit donde quedó resuelto
cuando aplica. Los commits sin prefijo de repo son de este repo
(`MasQueAmigos-Torneo`); los marcados `(backend)` son del repo
`mas-que-amigos`.

Estados usados: **Completado**, **Pendiente** (falta una decisión de
producto para poder implementarlo), **Bloqueado** (requiere una decisión
de arquitectura o alcance antes de poder siquiera diseñarlo), **Fuera de
alcance** (no aplica a este proyecto).

## Resumen

| Fase | Completados | Pendientes | Bloqueados | Total |
|---|---|---|---|---|
| 1 — Equipos | 8 | 0 | 0 | 8 |
| 2 — Jugadores | 8 | 0 | 0 | 8 |
| 3 — Partidos y Alineaciones | 10 | 0 | 0 | 10 |
| 4 — Estadísticas | 2 | 0 | 0 | 2 |
| 5 — Inicio | 2 | 0 | 0 | 2 |
| 6 — Configuración | 1 | 0 | 0 | 1 |
| 7 — Constante intencional | 1 | 0 | 0 | 1 |
| **Total** | **32** | **0** | **0** | **32** |

## Detalle por hallazgo

| Fase | Hallazgo (resumen) | Estado | Lado | Justificación |
|---|---|---|---|---|
| 1 | Botón para subir el escudo del equipo desde el dispositivo | Completado | Ambos | Backend: nuevo `POST /api/equipos/{id}/imagen` (multipart), `app.uploads.dir`/`app.base-url`, servido de `/uploads/**` vía `StaticResourceConfig` — no existía ninguna capacidad de archivos antes (`fix(fase1-back-equipos): fase1-01`, backend). Frontend: input de archivo en el modal de equipo y `EquipoService.subirImagenEquipo()` (`fix(fase1-equipos): fase1-01`). Verificado por revisión de código; pendiente prueba manual con `mvn`/navegador reales. |
| 1 | `tipoClasificacion` debe venir por parametría (Eliminatoria, Repechaje) | Completado | Ambos | Backend: `Equipo.TipoClasificacion` como enum estricto (`@Enumerated(EnumType.STRING)`), mismo patrón que `Jugador.Posicion` (`fix(fase1-back-equipos): fase1-02`). Frontend: select fijo con esos dos valores en el modal de equipo (`fix(fase1-equipos): fase1-02`). |
| 1 | Detalle de equipo abre un `alert()`, debería ser modal/página con más detalle + bonus cantidad de jugadores | Completado | Front | Nuevo `components/modal-detalle-equipo.html` + `js/modalDetalleEquipo.js`: muestra los datos del equipo, su lista de jugadores y la cantidad total (bonus pedido) (`fix(fase1-equipos): fase1-03`). |
| 1 | Debe existir un estado de carga/"reload" en toda acción o página, para que no quede en blanco | Completado | Front | Cada página (`equipos.js`, `jugadores.js`, `partidos.js`, `alineaciones.js`, `estadisticas.js`, `configuracion.js`) muestra `.loading-state` mientras espera al backend y `.empty-state` si la respuesta viene vacía o falla. Se incorporó como parte de la reconstrucción de línea base de cada módulo (commits `feat(fase5-*)`), no en un commit dedicado — se documenta acá para que quede su estado explícito. |
| 1 | La búsqueda de equipo por nombre no funciona con coincidencia parcial | Completado | Ambos | Backend: nuevo `findByNombreContainingIgnoreCase` + `GET /api/equipos/buscar?nombre=...`, sin tocar el endpoint exacto existente (`fix(fase1-back-equipos): fase1-05`). Frontend: el buscador de Equipos pasó a usar ese endpoint nuevo (`fix(fase1-equipos): fase1-05`). |
| 1 | Debe existir un botón "Listar todo" para volver del filtro al listado completo | Completado | Front | Botón que limpia búsqueda y filtro y vuelve a pedir `GET /api/equipos` (`fix(fase1-equipos): fase1-06/07/08`). |
| 1 | Filtro para ver equipos por tipo de clasificación (Repechaje/Eliminatoria) | Completado | Front | El botón muerto "Ver equipos en Repechaje" se reemplazó por un select "Todos / Eliminatoria / Repechaje" que filtra en memoria sobre el listado ya cargado (`fix(fase1-equipos): fase1-06/07/08`). |
| 1 | El sorteo de partidos debería vivir en la pantalla de Partidos, no en Equipos | Completado | Front | Se retiró el botón sin funcionalidad de Equipos (`fix(fase1-equipos): fase1-06/07/08`) y se implementó el sorteo completo en Partidos (ver hallazgos Fase3-06/07, `fix(fase3-partidos): fase3-06/fase3-07`). |
| 2 | La página de Jugadores debería abrir el listado, no el modal de carga masiva | Completado | Front | A `modalJugadorLote.js` le faltaba `modal.style.display = "none"` al inicializar (el resto de modales del proyecto sí lo tenían); por eso el modal quedaba visible al cargar la página (`fix(fase2-jugadores): fase2-01`). |
| 2 | Cada jugador de una carga por lote debería poder ir a un equipo distinto | Completado | Front | El backend (`JugadorService.guardarJugadoresEnLote`) ya soportaba un `idEquipo` distinto por jugador; solo faltaba exponerlo en la UI. Se movió el select de equipo a cada fila del formulario de lote en vez de uno solo para todas (`fix(fase2-jugadores): fase2-02`). Sin cambios de backend. |
| 2 | El modal de carga de +20 jugadores crece y esconde los botones Guardar/Cancelar | Completado | Front | `max-height: 90vh; overflow-y: auto;` agregado a `.modal-content` (compartido, `css/modales.css`): resuelve este hallazgo y, con el mismo cambio, Fase3-02 (formulario de partido) (`fix(fase2-jugadores,fase3-partidos): fase2-03/fase3-02`). |
| 2 | Un clic fuera del modal de carga masiva lo cierra y se pierde lo diligenciado | Completado | Front | Se quitó el cierre automático al hacer clic fuera de este modal en particular (los demás modales, más cortos, lo conservan) y se agregó confirmación antes de cerrar con datos sin guardar (`fix(fase2-jugadores): fase2-04`). |
| 2 | El texto de ayuda del formulario de carga masiva es técnico, debería ser informativo | Completado | Front | Se reescribió el bloque `.modal-help` con lenguaje dirigido a la persona que llena el formulario, no a quien lo programó (`fix(fase2-jugadores): fase2-05`). |
| 2 | El resultado de la carga masiva debería verse en un toast, no en el mismo modal | Completado | Front | El resumen (total/exitosos/fallidos) se muestra con `mostrarToast()` y el modal se cierra mostrando de una vez la lista actualizada (`fix(fase2-jugadores): fase2-06`). |
| 2 | Bonus: foto de jugador como fondo suave de su card | Completado | Ambos | El usuario aprobó explícitamente implementarlo "con el mismo mecanismo que el escudo" (Fase1-01). Backend: migración `V3__jugador_imagen.sql` (`jugador.imagen_url`), `POST /api/jugadores/{id}/imagen` (multipart), reutilizando `app.uploads.dir`/`app.base-url` y `StaticResourceConfig` ya existentes (`fix(fase2-back-jugadores): fase2-07`, backend, commit `1ac3a8e`). Frontend: input de archivo en el modal de jugador, `JugadorService.subirImagenJugador()`, y la card de jugador usa la foto como fondo con overlay claro/oscuro según el tema (`fix(fase2-front-jugadores): fase2-07`, commit `76662cc`). |
| 2 | En ninguna funcionalidad debería existir `alert()`, siempre toast | Completado | Front | Verificado con `grep -rn "alert(" **/*.js **/*.html` sobre todo el repo: cero llamadas activas a `alert()` (solo quedan menciones en comentarios explicando por qué se reemplazaron). Sin commit dedicado: quedó resuelto como efecto de Fase1-03 (detalle de equipo) y Fase2-06 (resultado de lote), verificado ahora de punta a punta. |
| 3 | Al crear partido, los equipos local y visitante nunca deben poder ser el mismo | Completado | Front | Cada select se recalcula (`refrescarOpciones()`) excluyendo al equipo ya elegido en el otro (`fix(fase3-partidos): fase3-01`). |
| 3 | En "programar partido" los botones inferiores no son visibles tras llenar el formulario | Completado | Front | Mismo fix de `.modal-content` con scroll interno que Fase2-03 (`fix(fase2-jugadores,fase3-partidos): fase2-03/fase3-02`). |
| 3 | Un partido debería crearse siempre con goles local/visitante en 0-0 por defecto | Completado (ya cumplido) | Front | Verificado: el input de goles y el `PartidoDTO` del frontend ya tenían `value="0"` / `golesLocal = 0` por defecto desde la línea base (`feat(fase5-partidos-alineaciones)`). No requirió cambio de código; se deja documentado como confirmación explícita. |
| 3 | Todos los filtros de Partidos deben funcionar correctamente | Completado | Ambos | Backend: `GET /api/partidos/buscar` para búsqueda parcial por equipo, antes solo existía coincidencia exacta (`fix(fase3-back-partidos): fase3-04`). Frontend: se conectó ese endpoint (`fix(fase3-partidos): fase3-04`); los filtros de fase y rango de fechas ya funcionaban sobre la caché en memoria y se verificaron manualmente junto con el de búsqueda. |
| 3 | Un partido debería poder editarse | Completado | Ambos | Backend: nuevo `PUT /api/partidos`, con un resguardo que impide cambiar los equipos de un partido si ya tiene alineación registrada (para no dejar huérfanos esos registros) (`fix(fase3-back-partidos): fase3-05`). Frontend: botón "Editar" en cada tarjeta de partido, reutilizando el mismo modal de creación (`fix(fase3-partidos): fase3-05`). |
| 3 | Debe existir la opción de sortear partidos entre varios equipos elegidos al azar, con las reglas de emparejado descritas | Completado | Front | Nuevo `components/modal-sorteo.html` + `js/modalSorteo.js`: Fisher-Yates sobre los equipos elegidos, emparejado secuencial (si sobra uno, queda sin partido en esta ronda), envío secuencial (no en paralelo) de cada `POST /api/partidos` para que un fallo no bloquee a los demás (`fix(fase3-partidos): fase3-06/fase3-07`). Sin cambios de backend: reutiliza el endpoint de creación existente. |
| 3 | Los detalles de cada partido sorteado (fecha/hora/fase) se completan antes de sortear, solo los equipos quedan al azar; debe poder editarse igual que cualquier partido | Completado | Front | El modal de sorteo pide fecha/hora/fase por cada pareja resultante antes de confirmar (decisión del usuario: pedir fecha/hora por cada pareja en vez de una fecha única para todo el sorteo) (`fix(fase3-partidos): fase3-06/fase3-07`). La edición posterior la cubre el hallazgo anterior (Fase3-05), sin necesitar nada especial para partidos nacidos de un sorteo. |
| 3 | Debería poder accederse a la alineación de un partido desde el propio partido, para alinear titulares del equipo elegido | Completado | Front | Botón "Alineación" en cada tarjeta de partido que navega a `alineaciones.html?idPartido=...`; esa página preselecciona el partido y filtra sus jugadores por equipo (`fix(fase3-partidos): fase3-08`). |
| 3 | Ir más allá: registrar cambios de jugador en vivo (titular↔suplente) con el tiempo de partido, y sucesos del partido (amarilla, roja, gol, asistencia) en el transcurso del mismo | Completado | Ambos | El propio hallazgo lo condiciona a "si lo ves viable desde este módulo"; el usuario, consultado explícitamente, delegó el diseño pidiendo tener en cuenta "la naturaleza de este tipo de aplicaciones" (torneo amateur entre amigos) y priorizar una experiencia grata. Se optó por un diseño deliberadamente liviano en vez de un reloj en vivo con websockets: Backend — migración `V4__partido_en_vivo.sql` agrega `Partido.estado` (`PROGRAMADO`/`EN_CURSO`/`FINALIZADO`, de solo lectura en `PartidoDTO`) con transiciones vía `PUT /api/partidos/{id}/iniciar` y `/finalizar`; `Estadistica.minuto` (nullable) para poder anotar en qué minuto ocurrió un gol/tarjeta/asistencia sin crear un sistema de eventos paralelo (la tabla `estadistica` ya es la "consulta de estadísticas" del hallazgo original); y una entidad nueva `CambioJugador` (audit log de sustituciones: quién sale, quién entra, minuto) cuyo registro además voltea los flags `titular` en `Alineacion`, para que el flujo de Estadísticas ya existente reconozca automáticamente al suplente que entró (`fix(fase3-back-partidos): fase3-09/fase3-10`, backend, commit `6c2cb14`). Frontend: badge de estado y botones "Iniciar partido"/"Finalizar partido" en cada tarjeta de partido (`fix(fase3-front-partidos): fase3-09`, commit `31ddd20`); campo "Minuto" opcional en el modal de Estadística; y en Alineaciones, una sección "Registrar cambio" (visible solo con el partido `EN_CURSO`, con selects de titulares/suplentes por equipo) y una sección "Historial del partido" que combina cambios + estadísticas con minuto, ordenados cronológicamente (`fix(fase3-front-alineaciones): fase3-10`, commit `8685531`). |
| 3 | Poder consultar las alineaciones de cada partido (titulares y suplentes) y los cambios realizados en el mismo | Completado | Ambos | La mitad ya estaba resuelta: `alineaciones.html` permite elegir un partido y ver sus titulares/suplentes (`feat(fase5-partidos-alineaciones)`, reforzado por el acceso directo de Fase3-08). La parte de "los cambios realizados en el mismo" la completa el diseño de Fase3-09: la sección "Historial del partido" (commit `8685531`) es esa consulta. El usuario confirmó específicamente que un jugador suplente que entró por cambio y luego recibe un gol/amarilla debe quedar cubierto: como el registro del cambio voltea su flag `titular` en `Alineacion`, el selector de jugador del modal de Estadística (que ya no filtraba solo titulares) lo reconoce sin cambios adicionales. |
| 4 | Consultar estadísticas de jugadores, partidos y equipos (goles, asistencias, tarjetas, títulos, participaciones) | Completado | Front | El listado por jugador/partido ya existía; se agregó un resumen agregado por equipo (partidos jugados, títulos —campo `Equipo.titulos`, ya editable desde el modal de equipo—, goles, tarjetas amarillas y rojas), calculado en el cliente a partir de los datos ya cargados, sin necesitar un endpoint de agregados nuevo (`fix(fase4-estadisticas): fase4-01/fase4-02`). "Participaciones entre ellas" se interpreta como partidos jugados por equipo (ya mostrado): el proyecto modela una sola edición del torneo, no varias temporadas, así que no hay un dato adicional de "participaciones históricas" que mostrar. |
| 4 | Dar estilo con gráficos además de la información tabular | Completado | Front | Chart.js (ya usado en Inicio) reutilizado para un gráfico de barras (goles/amarillas/rojas por equipo) junto a la tabla de resumen (`fix(fase4-estadisticas): fase4-01/fase4-02`). |
| 5 | Mantener solo las tarjetas (cards) de resumen en Inicio, sin barras estadísticas | Completado (ya cumplido) | Front | Verificado con `grep` sobre `index.html`/`css/dashboard.css`: no hay ninguna barra de progreso ni elemento similar, solo `.stat-card` y los gráficos de Chart.js (que no son "barras estadísticas" en el sentido de barra de progreso/medidor). No requirió cambio de código. |
| 5 | Mostrar en Inicio los registros informativos creados desde Configuración | Completado | Front | Nueva sección "Novedades del torneo" en `index.html`, poblada por `RegistroInformativoService.obtenerRegistros()` (ya ordenados del más reciente al más antiguo por el backend) (`fix(fase5-inicio): fase5-02`). |
| 6 | Permitir crear y eliminar publicaciones tipo blog para la página de Inicio | Completado | Ambos | Backend: entidad/DTO/mapper/repositorio/servicio/controlador `RegistroInformativo` nuevos desde cero, migración Flyway `V2__registro_informativo.sql`, endpoints `GET`/`POST`/`DELETE /api/registros-informativos` (`fix(fase6-back-configuracion): fase6-01`). Frontend: página nueva `configuracion.html` con listado en tarjetas, modal de creación y botón eliminar con confirmación; nuevo ítem de navegación "Configuración" (`fix(fase6-front-configuracion): fase6-01`). No hay edición: el hallazgo solo pide crear y eliminar. |
| 7 | Pedir una clave de Director Técnico al cargar la página y validarla en toda escritura, sin login real | Completado | Ambos | Alternativa propuesta y aprobada por el usuario en vez de un login completo: interceptor central. Backend: `DirectorTecnicoInterceptor` + `DirectorTecnicoWebConfig` sobre todo `/api/**`, deja pasar `GET`/`HEAD`/`OPTIONS` libremente y exige el header `X-Director-Tecnico-Key` en el resto, con clave configurable por variable de entorno `APP_DIRECTOR_TECNICO_CLAVE` (`fix(fase7-back-auth): fase7-01`). Frontend: `window.prompt()` una sola vez por sesión de navegador (`js/config.js`), header agregado automáticamente por `construirHeaders()`/`construirHeadersMultipart()`, y un botón "Rol" en el menú para volver a indicarla (`fix(fase7-front-auth): fase7-01`). El mensaje de "no autorizado" se muestra reutilizando el manejo de errores ya existente en cada pantalla (toast / `form-status`), sin código nuevo para ese caso. |

## Verificación general

Todos los cambios de backend se verificaron por revisión de código línea
por línea contra el estilo ya establecido en el proyecto (mismas
anotaciones, mismo manejo de excepciones, balance de llaves/paréntesis
comprobado por script) y documentando en cada commit qué quedaba
pendiente de probar. **No fue posible ejecutar `mvn test`/`mvn compile`
de forma consolidada** desde este entorno: el `device_bash` usado para
todo el trabajo en el backend no tiene ruta de red hacia
`repo.maven.apache.org`, así que cualquier intento de compilar o testear
con Maven falla al intentar descargar el wrapper/las dependencias. Queda
pendiente, antes de desplegar, correr `mvn test` (o `./mvnw test`) en un
entorno con acceso a Maven Central, y hacer las pruebas manuales puntuales
que se detallan en cada commit (por ejemplo: `curl`/Postman para
Fase7-back-auth, o cargar el navegador para las pantallas nuevas).

Los cambios de frontend se verificaron con revisión de código contra el
patrón ya establecido en cada módulo, y con un chequeo de sintaxis
(`node -e` parseando cada archivo nuevo/modificado con `new Function`; en
la ronda final —Fase2-07 y Fase3-09/Fase3-10— se usó `node --check` sobre
cada archivo nuevo/modificado, equivalente pero sin necesidad de stubear
`window`). Igualmente queda pendiente una prueba manual de extremo a
extremo en el navegador, una vez el backend esté desplegado con los
endpoints nuevos (Fase 6 y Fase 7 en particular dependen uno del otro; a
esa lista se suman ahora Fase2-07 y Fase3-09/Fase3-10: subir foto de
jugador, iniciar/finalizar un partido, y registrar un cambio de jugador,
todos con Postman/navegador real).

Con este último cierre (Fase2-07, Fase3-09, Fase3-10, commits `1ac3a8e` y
`6c2cb14` en el backend, `76662cc`, `31ddd20` y `8685531` en el frontend)
los 32 hallazgos de `FRONTEND_VISION.md` quedan en estado Completado.

## Hallazgos post-despliegue (revisión manual del usuario, septiembre 2026)

Con la app ya desplegada en Docker (ver `DEPLOYMENT.md`), el usuario la
probó en el navegador real y reportó 4 hallazgos adicionales, fuera de la
auditoría de las 7 fases anteriores. Instrucción explícita del usuario:
resolver de una vez lo que fuera de frontend y no dependiera del backend,
dejando en estado pendiente (y avisando) cualquier cosa que sí lo
necesitara. Los cuatro resultaron ser de frontend puro y quedaron
Completados en el mismo lote, sin que ninguno bloqueara otra cosa:

| # | Hallazgo | Estado | Lado | Justificación |
|---|---|---|---|---|
| 8-1 | El modal de sorteo se mostraba aunque no hubiera equipos suficientes para sortear | Completado | Front | `window.abrirModalSorteo` ahora corta antes de mostrar el modal si hay menos de 3 equipos registrados en el sistema, avisando con un toast en vez de dejar entrar y fallar más adelante (`js/modalSorteo.js`). |
| 8-2 | Al guardar el sorteo no se validaba que la información necesaria estuviera completa | Completado | Front | `modal-sorteo.html` era el único formulario del proyecto sin `novalidate`, dependiendo solo del atributo HTML `required` (poco confiable si no hay fieldsets, por ejemplo). Se agregó `novalidate` y una validación explícita en JS que marca en rojo (`.input-invalido`) los campos de fecha/hora incompletos y bloquea el guardado hasta corregirlos, igual que el resto de modales de la app (`js/modalSorteo.js`, `components/modal-sorteo.html`, `css/modales.css`). |
| 8-3 | La tabla "Resumen por equipo" no mostraba diferencia de goles ni goles en contra | Completado | Front | Se agregaron ambas columnas. "Goles en contra" no tiene una fuente por jugador (nadie registra una estadística individual por gol recibido), así que se calcula del marcador de cada partido (`golesLocal`/`golesVisitante`) tomando el resultado del rival, igual que en una tabla de posiciones; "Diferencia" sale de restar esa columna a la columna "Goles" ya existente (`js/estadisticas.js`, `estadisticas.html`, `css/estadisticas.css`). |
| 8-4 | El botón para ingresar como Director Técnico no estaba disponible todo el tiempo | Completado | Front | Causa raíz: en `css/style.css`, el botón "Rol" y el interruptor de modo oscuro compartían la misma clase `.btn-tema` con exactamente el mismo `position: absolute; bottom: 24px`, quedando superpuestos — el de "Rol" (declarado después en el HTML) tapaba por completo al de modo oscuro, dando una experiencia inconsistente. Cada botón tiene ahora su propia franja vertical (`#btn-tema { bottom: 78px }`, `#btn-rol { bottom: 24px }`), visibles y usables los dos en todo momento (`css/style.css`). |

Verificación: los cuatro cambios son de frontend puro (sin tocar
`mas-que-amigos`), revisados contra el patrón ya establecido en cada
módulo y comprobados con `node --check` sobre cada `.js` modificado
(`js/modalSorteo.js`, `js/estadisticas.js`).

## Segunda ronda post-despliegue (revisión manual del usuario, septiembre 2026)

El usuario pidió tres ajustes adicionales tras seguir probando la app ya
desplegada, también resolubles enteramente en el frontend:

| # | Hallazgo | Estado | Lado | Justificación |
|---|---|---|---|---|
| 8-5 | El ingreso como Director Técnico debía ser "dinámico": disponible todo el tiempo, no solo al cargar la página, idealmente a un costado | Completado | Front | El botón "Rol" vivía dentro del menú lateral colapsable (en móvil había que abrir el menú para encontrarlo) y competía por espacio con el interruptor de modo oscuro. Se sacó a un botón flotante fuera del menú (`.btn-rol-flotante` en `components/menu.html`), fijo "a un costado" (costado opuesto al botón hamburguesa), visible en toda página y en todo momento sin depender de abrir el menú ni de recargar. Además ahora refleja el rol activo cambiando de color e ícono (gris "Consulta" / dorado "Director Técnico"), no solo el texto (`js/app.js`, `css/style.css`). |
| 8-6 | La barra de menú no tenía scroll: al cambiar de modo claro/oscuro el botón aparecía montado sobre "Configuración" | Completado | Front | El `<ul>` del menú no tenía overflow propio, así que en ventanas bajas (o con más ítems de los que caben) el botón de modo oscuro, con `position:absolute` pegado al fondo del sidebar, terminaba encima del último ítem en vez de debajo. Se pasó `.sidebar` a `display:flex; flex-direction:column`, con el `<ul>` creciendo (`flex:1`) y haciendo su propio scroll interno (`overflow-y:auto`) cuando hace falta, y el botón de modo oscuro en flujo normal (ya no absolute) siempre después del último ítem (`css/style.css`). Validado simulando una ventana de 1280×480: el `<ul>` scrollea internamente y el botón nunca se superpone con "Configuración". |
| 8-7 | El spinner de carga/guardado nunca se visualizaba mientras se esperaba respuesta | Completado | Front | El concepto ya existía a medias (texto "Cargando..."/"Guardando..." y una clase `is-loading` que se togglea en cada `modal*.js`) pero nunca había un spinner real: solo bajaba la opacidad del botón un 15%, imperceptible sobre un botón que además ya cambiaba de color por estar `disabled`. Se agregó una animación real (`@keyframes girar`) reutilizada en dos lugares: `.loading-state::before` (todas las cargas de listados/páginas completas, automático en toda la app sin tocar cada página) y `.modal-content button.is-loading::before` (botones "Guardar" de los modales). También se agregó el toggle de `is-loading` a `modalSorteo.js` y `modalJugadorLote.js`, que no lo tenían (`css/style.css`, `css/modales.css`, `js/modalSorteo.js`, `js/modalJugadorLote.js`). |

Verificación: los tres cambios se probaron cargando la app real (servida
con Live Server en `127.0.0.1:5500`) en el navegador integrado, incluyendo
una simulación de ventana angosta para confirmar el scroll del menú, una
verificación de estilos computados del pseudo-elemento del spinner
(`content`, `animation-name: girar`, dimensiones) y una captura visual del
spinner tanto en un botón de modal como en un listado cargando, en modo
claro y oscuro. No fue posible probar el flujo real de guardado contra el
backend porque el contenedor de `mas-que-amigos` no estaba accesible
desde este entorno en el momento de la prueba (`ERR_BLOCKED_BY_CLIENT` /
"Failed to fetch"), algo ajeno a estos cambios: la app ya maneja ese caso
mostrando un mensaje de error en el mismo contenedor, sin quedar en
blanco. Todos los `.js` modificados se verificaron además con
`node --check`.

## Corrección a la segunda ronda (revisión manual del usuario, septiembre 2026)

Tras desplegar la segunda ronda (Fase8-05 a Fase8-07), el usuario probó el
botón de Rol de nuevo y encontró que la implementación no tenía el
comportamiento esperado, con cuatro puntos concretos — también resolubles
enteramente en el frontend:

| # | Hallazgo | Estado | Lado | Justificación |
|---|---|---|---|---|
| 8-8 | Al cargar la página no debía preguntarse si el usuario es Director Técnico; el botón debía quedar siempre disponible mostrando "Espectador" (solo consulta) o "Director Técnico" (todos los privilegios) | Completado | Front | `js/config.js` seguía preguntando con `window.prompt()` automáticamente una vez por sesión de navegador (heredado de Fase7), lo que interrumpe a cualquiera que solo entra a mirar (la mayoría de las visitas). Se quitó esa pregunta automática: al cargar cada página solo se restaura la clave ya guardada en `sessionStorage`, si la había, sin preguntar nada por su cuenta. El botón flotante (`js/app.js`) ahora muestra "Espectador" por defecto (antes decía "Consulta") y "Director Técnico" cuando hay una clave guardada, y sigue disponible para pedir la clave con un click en cualquier momento (`js/config.js`, `js/app.js`, `components/menu.html`). |
| 8-9 | Si el Director Técnico ya identificado intentaba volver a ingresar la clave, no debía permitírselo en silencio: si la escribía mal, la app se vería rota porque no revertía a modo consulta | Completado | Front | Antes, tocar el botón ya siendo Director Técnico volvía a abrir el prompt sin más aviso: un typo (o cancelar sin querer) dejaba la clave guardada inválida, y como la app nunca volvía sola a modo Espectador ni avisaba nada, se veía como una funcionalidad rota. Se implementaron las dos alternativas que el usuario propuso como equivalentes, de forma complementaria: (1) mientras ya se es Director Técnico, el botón ya no vuelve a preguntar la clave directamente — primero pide confirmar con un aviso explícito que se va a cerrar la sesión (volviendo a Espectador), y recién desde ahí se puede indicar una clave nueva (`js/app.js`); (2) si la clave guardada deja de ser válida sin que el usuario haga nada (se escribió mal en algún momento anterior, o cambió), el backend lo revela con un 401 en el primer intento de escritura — se agregó el manejo reactivo en el único lugar por el que pasan todas las respuestas de escritura (`js/apiErrors.js#parsearRespuesta`): ante un 401 con una clave guardada, cierra la sesión de Director Técnico automáticamente (vuelve a Espectador) y lanza un mensaje explícito que la pantalla ya muestra con el manejo de errores existente (toast/`form-status`), en vez de quedar en un estado inconsistente sin explicación. Queda como mejora pendiente y dependiente del backend la validación proactiva (rechazar una clave incorrecta en el momento de ingresarla, antes de cualquier intento de guardado): el interceptor actual (`DirectorTecnicoInterceptor`) no tiene un endpoint dedicado para "solo validar" la clave, y agregar uno es un cambio de backend fuera del alcance de esta corrección. |
| 8-10 | No debía mostrarse "Configuración" en el menú a un Hincha (usuario sin privilegios) | Completado | Front | Se agregó `actualizarVisibilidadConfiguracion()` en `js/app.js`, que oculta el ítem "Configuración" del menú lateral cuando no hay una clave de Director Técnico activa (modo Espectador) y lo muestra cuando sí la hay. Se ejecuta cada vez que cambia el rol — login, logout manual (8-9) o logout reactivo por 401 —, no solo al cargar la página. |
| 8-11 | El botón de cambiar entre modo claro y oscuro había desaparecido (regresión de Fase8-06) | Completado | Front | Causa: el arreglo de Fase8-06 pasó `.sidebar` a `display:flex; flex-direction:column` con el `<ul>` creciendo (`flex:1 1 auto`) para hacer scroll interno. Eso resuelve la superposición en ventanas bajas, pero en ventanas normales/altas el `<ul>` con `flex-grow` ocupa todo el alto disponible de un sidebar que mide el 100% de la ventana, empujando el botón de modo oscuro hasta el borde inferior — lejos de los enlaces del menú y, según el alto real de la ventana del usuario, efectivamente fuera de donde se lo esperaba (parecía haber desaparecido). Se reemplazó ese enfoque: ahora `.sidebar` entero (enlaces + botón) es un solo bloque en flujo normal, con `overflow-y: auto` en el propio `.sidebar` (ya no en el `<ul>`) — si el contenido no entra completo, todo el sidebar scrollea como una unidad, y el botón queda siempre en flujo normal justo después del último enlace, sin importar el alto de la ventana (`css/style.css`). |

Verificación: se probó cargando la app real (Live Server en
`127.0.0.1:5500`) en el navegador integrado. Se confirmó, leyendo el
`js/config.js` servido (`fetch` + `no-store` para descartar caché) que ya
no llama a `MQA_preguntarRolDirectorTecnico()` de forma automática, y que
el botón muestra "Espectador" apenas carga la página sin ningún prompt.
El comportamiento del click (confirmar cierre de sesión estando ya en
Director Técnico, tanto al cancelar como al confirmar) y el logout
reactivo ante un 401 (`js/apiErrors.js`) se probaron invocando
directamente las funciones expuestas (`window.MQA_actualizarBotonRol`,
`window.confirm` interceptado con un stub para no bloquear la
automatización, e `import()` dinámico de `js/apiErrors.js` con una
`Response` simulada en 401) en vez de manipular el prompt real del
navegador, evitando así diálogos nativos bloqueantes durante la prueba;
en ambos casos se verificó que "Configuración" se oculta/muestra en el
momento correcto. El arreglo del botón de modo oscuro (8-11) se validó
con `getBoundingClientRect()` tanto en una ventana normal (1280×800) como
en la ventana angosta ya usada para Fase8-06 (1280×480): en las dos, el
botón queda pegado justo después del último enlace del menú, sin
superponerse con "Configuración" y sin quedar lejos de los demás
enlaces. No fue posible probar el flujo real de guardado (headers X-
Director-Tecnico-Key contra el backend real) porque el contenedor de
`mas-que-amigos` no estaba accesible desde este entorno
(`ERR_BLOCKED_BY_CLIENT`), igual que en la ronda anterior. Todos los
`.js` modificados (`js/config.js`, `js/app.js`, `js/apiErrors.js`) se
verificaron además con `node --check`.

## Mejora adicional sobre la segunda ronda (sugerencia del usuario, septiembre 2026)

Al revisar la corrección anterior (8-8 a 8-11), el usuario señaló una
mejora práctica: en modo Espectador la app debería bloquear, ocultar o
avisar que una acción no está permitida ANTES de que alguien llene un
formulario completo, en vez de dejarlo llenar todo para recién avisarle
al guardar (vía el 401 reactivo de 8-9).

| # | Hallazgo | Estado | Lado | Justificación |
|---|---|---|---|---|
| 8-12 | En modo Espectador debería bloquearse/ocultarse/avisarse que las acciones de Director Técnico no están disponibles, en vez de dejar llenar el formulario para recién fallar al guardar | Completado | Front | Se optó por ocultar directamente los controles que disparan una escritura (crear, editar, eliminar, sortear, iniciar/finalizar partido, registrar cambio de jugador) cuando no hay una clave de Director Técnico activa, en vez de dejarlos visibles y fallar recién al guardar. Cada botón/formulario relevante se marca con el atributo `data-requiere-dt="true"` (`equipos.html`, `jugadores.html`, `partidos.html`, `alineaciones.html`, `estadisticas.html`, `configuracion.html` para los botones fijos; `js/equipos.js`, `js/jugadores.js`, `js/partidos.js`, `js/estadisticas.js`, `js/configuracion.js` para los botones de fila generados dinámicamente), y una única función nueva en `js/app.js` (`actualizarVisibilidadAccionesDirectorTecnico`) los oculta o muestra según el rol activo. El problema de que la mayoría de esos botones no existen todavía cuando la página recién carga (se generan después, cuando cada pantalla termina de traer sus datos del backend) se resolvió con un `MutationObserver` sobre `document.body` que reaplica el mismo criterio cada vez que aparece contenido nuevo, sin que ninguna pantalla tenga que acordarse de llamarlo a mano. El mecanismo reactivo de 8-9 (revertir a Espectador ante un 401) se mantiene sin cambios como respaldo, para el caso borde de que la clave guardada deje de ser válida mientras el formulario ya estaba abierto. |

Verificación: probado en el navegador integrado sobre la app real
(Live Server, `127.0.0.1:5500`). Se confirmó que, como Espectador, tanto
los botones fijos (por ejemplo "Programar partido", "Sortear partidos")
como una fila de ejemplo inyectada dinámicamente con botones "Editar" /
"Eliminar" / "Iniciar partido" quedan ocultos sin necesidad de llamar a
ninguna función a mano (el `MutationObserver` los agarra solo). Al
simular el ingreso como Director Técnico todos reaparecen, y al cerrar
sesión vuelven a ocultarse, sin recargar la página. También se verificó
específicamente el caso de "Registrar cambio" en Alineaciones, que ya
tenía su propio criterio de visibilidad independiente (solo si el
partido está `EN_CURSO`, controlado con el atributo `hidden`): las
cuatro combinaciones de rol × estado del partido se probaron una por
una y el elemento solo queda visible cuando se cumplen las dos
condiciones a la vez, confirmando que el atributo nuevo (que solo toca
el estilo inline) convive sin pisar la lógica existente. `node --check`
sobre los seis `.js` modificados.

## Validacion proactiva de la clave de Director Tecnico (sugerencia del usuario, septiembre 2026)

Sobre la mejora anterior (8-12, ocultar los botones de escritura en modo
Espectador), el usuario planteo que igual haria falta un mecanismo que
valide la clave contra la definida en el backend en el momento de
ingresarla, y no deje pasar a Director Tecnico si esta mal -en vez de
cualquier otro mecanismo alternativo-, autorizando explicitamente tocar
el backend si hacia falta.

| # | Hallazgo | Estado | Lado | Justificación |
|---|---|---|---|---|
| 8-13 | Debería existir un mecanismo que valide si la clave de Director Técnico es correcta respecto a la definida, y no dejar pasar si no lo es | Completado | Ambos | Backend: nuevo `DirectorTecnicoController` con `POST /api/director-tecnico/validar` (`fix(fase8-back-auth): fase8-13`). No valida nada por su cuenta: al ser un método POST, el `DirectorTecnicoInterceptor` ya existente (fase7-01) exige y compara el header `X-Director-Tecnico-Key` *antes* de que la petición llegue al controlador (está registrado sobre todo `/api/**`). Si el método llega a ejecutarse es porque la clave ya fue validada (devuelve 200); si es incorrecta o falta, el interceptor corta con 401 antes de llegar ahí. Se evitó así duplicar la lógica de comparación de la clave en un segundo lugar. Frontend: `MQA_preguntarRolDirectorTecnico` (`js/config.js`) pasó a ser asíncrona — si se ingresa una clave no vacía, hace ese `POST` con la clave en el header antes de aceptar nada; solo si el backend responde 200 se guarda la clave y se entra como Director Técnico. Si responde 401 se avisa con un mensaje explícito ("la clave ingresada no es correcta") y se sigue en Espectador; si no hay conexión con el backend se avisa con un mensaje distinto (no se sabe si la clave es correcta o no) y también se sigue en Espectador — nunca se deja pasar sin poder confirmarla. `js/app.js` ahora espera (`await`) ese resultado antes de refrescar el botón de Rol, para no mostrar "Director Técnico" ni un instante antes de tiempo. El mecanismo reactivo de 8-9 (revertir a Espectador ante un 401 en una escritura real) se mantiene sin cambios, como respaldo para el caso borde de que la clave deje de ser válida *después* de haber sido aceptada (por ejemplo, si cambia la configuración del backend mientras la sesión ya estaba abierta). |

Verificación: no fue posible compilar el backend con Maven desde este
entorno (sin acceso de red a `repo.maven.apache.org` para `mvnw` ni
caché local en `~/.m2`, la misma limitación ya documentada más arriba
en este mismo archivo); se revisó `DirectorTecnicoController.java`
línea por línea contra el estilo ya establecido en los demás
controladores del proyecto (`RegistroInformativoController` como
referencia) y se comprobó el balance de llaves/paréntesis con un
script. Queda pendiente correr `mvn test`/`mvn compile` en un entorno
con acceso a Maven Central antes de desplegar. El frontend se probó en
el navegador integrado simulando las tres respuestas posibles del
endpoint nuevo (mockeando `window.fetch`, porque el backend real no era
alcanzable desde este entorno de prueba): clave correcta (200) entra
como Director Técnico; clave incorrecta (401) y falla de conexión se
quedan en Espectador, cada una con su propio mensaje; y dejar el campo
vacío no llega a llamar al backend. También se probó el flujo completo
a través del botón de Rol real (no solo la función por separado),
confirmando que el botón y la visibilidad de "Configuración" terminan
en el estado correcto en los dos casos. `node --check` en `js/config.js`
y `js/app.js`.
