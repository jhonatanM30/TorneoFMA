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
| 2 — Jugadores | 7 | 1 | 0 | 8 |
| 3 — Partidos y Alineaciones | 8 | 1 | 1 | 10 |
| 4 — Estadísticas | 2 | 0 | 0 | 2 |
| 5 — Inicio | 2 | 0 | 0 | 2 |
| 6 — Configuración | 1 | 0 | 0 | 1 |
| 7 — Constante intencional | 1 | 0 | 0 | 1 |
| **Total** | **29** | **2** | **1** | **32** |

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
| 2 | Bonus: foto de jugador como fondo suave de su card | **Pendiente** | Ambos | No implementado. Requiere primero un hallazgo de Back nuevo (equivalente a Fase1-01 pero para `Jugador`: campo `imagenUrl`, endpoint de subida) antes de poder tocar el frontend. Es un bonus explícitamente opcional en el texto original ("como bonus"), así que no se priorizó frente a los hallazgos obligatorios. **Pregunta abierta:** ¿se prioriza esta mejora visual, y de ser así, la imagen del jugador se guarda con el mismo mecanismo de disco que el escudo del equipo (mismo `app.uploads.dir`) o se prefiere otro enfoque? |
| 2 | En ninguna funcionalidad debería existir `alert()`, siempre toast | Completado | Front | Verificado con `grep -rn "alert(" **/*.js **/*.html` sobre todo el repo: cero llamadas activas a `alert()` (solo quedan menciones en comentarios explicando por qué se reemplazaron). Sin commit dedicado: quedó resuelto como efecto de Fase1-03 (detalle de equipo) y Fase2-06 (resultado de lote), verificado ahora de punta a punta. |
| 3 | Al crear partido, los equipos local y visitante nunca deben poder ser el mismo | Completado | Front | Cada select se recalcula (`refrescarOpciones()`) excluyendo al equipo ya elegido en el otro (`fix(fase3-partidos): fase3-01`). |
| 3 | En "programar partido" los botones inferiores no son visibles tras llenar el formulario | Completado | Front | Mismo fix de `.modal-content` con scroll interno que Fase2-03 (`fix(fase2-jugadores,fase3-partidos): fase2-03/fase3-02`). |
| 3 | Un partido debería crearse siempre con goles local/visitante en 0-0 por defecto | Completado (ya cumplido) | Front | Verificado: el input de goles y el `PartidoDTO` del frontend ya tenían `value="0"` / `golesLocal = 0` por defecto desde la línea base (`feat(fase5-partidos-alineaciones)`). No requirió cambio de código; se deja documentado como confirmación explícita. |
| 3 | Todos los filtros de Partidos deben funcionar correctamente | Completado | Ambos | Backend: `GET /api/partidos/buscar` para búsqueda parcial por equipo, antes solo existía coincidencia exacta (`fix(fase3-back-partidos): fase3-04`). Frontend: se conectó ese endpoint (`fix(fase3-partidos): fase3-04`); los filtros de fase y rango de fechas ya funcionaban sobre la caché en memoria y se verificaron manualmente junto con el de búsqueda. |
| 3 | Un partido debería poder editarse | Completado | Ambos | Backend: nuevo `PUT /api/partidos`, con un resguardo que impide cambiar los equipos de un partido si ya tiene alineación registrada (para no dejar huérfanos esos registros) (`fix(fase3-back-partidos): fase3-05`). Frontend: botón "Editar" en cada tarjeta de partido, reutilizando el mismo modal de creación (`fix(fase3-partidos): fase3-05`). |
| 3 | Debe existir la opción de sortear partidos entre varios equipos elegidos al azar, con las reglas de emparejado descritas | Completado | Front | Nuevo `components/modal-sorteo.html` + `js/modalSorteo.js`: Fisher-Yates sobre los equipos elegidos, emparejado secuencial (si sobra uno, queda sin partido en esta ronda), envío secuencial (no en paralelo) de cada `POST /api/partidos` para que un fallo no bloquee a los demás (`fix(fase3-partidos): fase3-06/fase3-07`). Sin cambios de backend: reutiliza el endpoint de creación existente. |
| 3 | Los detalles de cada partido sorteado (fecha/hora/fase) se completan antes de sortear, solo los equipos quedan al azar; debe poder editarse igual que cualquier partido | Completado | Front | El modal de sorteo pide fecha/hora/fase por cada pareja resultante antes de confirmar (decisión del usuario: pedir fecha/hora por cada pareja en vez de una fecha única para todo el sorteo) (`fix(fase3-partidos): fase3-06/fase3-07`). La edición posterior la cubre el hallazgo anterior (Fase3-05), sin necesitar nada especial para partidos nacidos de un sorteo. |
| 3 | Debería poder accederse a la alineación de un partido desde el propio partido, para alinear titulares del equipo elegido | Completado | Front | Botón "Alineación" en cada tarjeta de partido que navega a `alineaciones.html?idPartido=...`; esa página preselecciona el partido y filtra sus jugadores por equipo (`fix(fase3-partidos): fase3-08`). |
| 3 | Ir más allá: registrar cambios de jugador en vivo (titular↔suplente) con el tiempo de partido, y sucesos del partido (amarilla, roja, gol, asistencia) en el transcurso del mismo | **Bloqueado** | Ambos | El propio texto del hallazgo lo condiciona a "si lo ves viable desde este módulo": requiere un modelo de datos nuevo (un partido "en curso" con reloj/minuto, un historial de eventos con marca de tiempo, y diferenciar alineación inicial de sustituciones), que no existe hoy ni en el backend (`Partido`/`Alineacion`/`Estadistica` son registros planos, sin línea de tiempo) ni en el frontend. No es una extensión incremental de lo que ya existe: es un módulo nuevo de "partido en vivo". **Pregunta abierta:** ¿se modela como un estado de partido (`EN_CURSO`/`FINALIZADO`) con una tabla de eventos (`evento_partido`: tipo, minuto, jugador, partido), reemplazando o complementando la tabla `estadistica` actual (que ya guarda goles/tarjetas/asistencias pero sin momento en el tiempo)? Sin esa decisión de modelo no se puede empezar el diseño técnico. |
| 3 | Poder consultar las alineaciones de cada partido (titulares y suplentes) y los cambios realizados en el mismo | **Pendiente** (parcial) | Ambos | La mitad ya está resuelta: `alineaciones.html` permite elegir un partido y ver sus titulares/suplentes (`feat(fase5-partidos-alineaciones)`, reforzado por el acceso directo de Fase3-08). La parte de "los cambios realizados en el mismo" depende directamente del hallazgo anterior (Fase3-09): sin un historial de sustituciones no hay nada que consultar todavía. **Pregunta abierta:** la misma que Fase3-09 — una vez definido el modelo de eventos/sustituciones, esta consulta es una vista adicional sobre esa misma tabla, no un hallazgo aparte. |
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
(`node -e` parseando cada archivo nuevo/modificado con `new Function`).
Igualmente queda pendiente una prueba manual de extremo a extremo en el
navegador, una vez el backend esté desplegado con los endpoints nuevos
(Fase 6 y Fase 7 en particular dependen uno del otro).
