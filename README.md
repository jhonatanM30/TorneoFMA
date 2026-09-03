# Más Que Amigos — Frontend (Torneo)

Frontend web para la API REST de gestión del torneo **Más Que Amigos**
(equipos, jugadores, partidos y estadísticas). Este documento cubre lo que
pedía `FRONTEND_VISION.md`: la tecnología elegida, el manejo de estado,
la navegación, y cómo levantarlo — para que quien retome el proyecto no
tenga que adivinarlo leyendo el código.

## Tecnología

**HTML + CSS + JavaScript "vanilla" (ES Modules), sin framework y sin paso
de build.** Se eligió deliberadamente sobre React/Vue/Angular porque:

- El alcance funcional (4 módulos CRUD simples: Equipos, Jugadores,
  Partidos, Estadísticas) no necesita gestión de estado compleja ni
  enrutado del lado del cliente.
- Cero dependencias de build significa que cualquiera puede abrir el
  proyecto y ejecutarlo sin `npm install`, sin configurar bundler, y sin
  que una versión de Node distinta rompa nada.
- Los ES Modules nativos del navegador (`<script type="module">`,
  `import`/`export`) dan la misma separación en archivos que tendría un
  proyecto con build, sin pagar su complejidad.

Si el proyecto creciera bastante más (más módulos, necesidad de un state
management real, tests de componentes), migrar a un framework es una
decisión válida a futuro — pero no se justificaba para el alcance actual.

## Estilo

CSS plano (sin Tailwind/Sass/CSS-in-JS), con un pequeño sistema de diseño
centralizado en `css/style.css`:

- **Paleta por variables CSS** (`:root`): verde cancha (`--color-primary`)
  como color principal y dorado trofeo (`--color-accent`) como acento —
  colores que ya estaban en el banner/menú originales y que encajan con la
  identidad de un torneo de fútbol. Cada página solo agrega su propio
  CSS (`css/<página>.css`) para lo que le es específico (tarjetas de
  equipo, tabla de estadísticas, etc.), reutilizando siempre las mismas
  variables — así un cambio de color se hace en un solo lugar.
- **Modales compartidos** (`css/modales.css`): un único set de clases
  (`.modal`, `.modal-content`, `.form-status`, `.modal-buttons`...) para
  los 6 formularios modales del sitio, en vez de repetir estilos por
  módulo.
- **Modo oscuro**: variantes de esas mismas variables bajo
  `:root[data-theme="dark"]` (ver sección "Modo oscuro" más abajo).
- **Tipografía**: Montserrat (Google Fonts) para todo el texto, e iconos
  de Font Awesome (ambos cargados por CDN, no empaquetados).
- **Fondos temáticos**: cada página tiene una variante `.banner--<página>`
  que reutiliza las fotos del torneo en `assets/` como fondo del banner,
  con el mismo degradado verde superpuesto para mantener el texto legible.

## Estructura de carpetas

```
index.html, equipos.html, jugadores.html, partidos.html, estadisticas.html
  → una página HTML por módulo, todas comparten menú y footer (ver más abajo)

components/        → fragmentos HTML reutilizables (menú, footer, modales)
css/                → estilos: style.css (base + tema compartido) +
                       un archivo por página + modales.css (compartido)
dto/                → "espejo" en JS de cada DTO del backend, documentando
                       qué campos son de solo lectura y por qué
services/           → un fetch-wrapper por entidad (EquipoService,
                       JugadorService, PartidoService, EstadisticaService)
js/                  → config.js, apiErrors.js, app.js (compartidos) +
                       un <página>.js (controlador de la página) y un
                       modal<Entidad>.js (formulario modal) por módulo
assets/              → fotos del torneo usadas en Inicio y en los fondos
                       de los banners de cada página
```

### Patrón por módulo

Cada entidad (Equipo, Jugador, Partido, Estadística) sigue exactamente el
mismo patrón de 4 piezas, para que agregar un módulo nuevo sea mecánico:

1. `dto/<Entidad>DTO.js` — constructor con los mismos campos que el DTO
   Java, documentando cuáles son de solo lectura.
2. `services/<Entidad>Service.js` — un método `fetch` por endpoint,
   usando `apiErrors.js` para normalizar los errores del backend.
3. `components/modal-<entidad>.html` + `js/modal<Entidad>.js` — el
   formulario modal de alta (y edición, cuando el backend expone `PUT`).
4. `js/<entidad>.js` — controlador de la página: carga la lista, aplica
   filtros/búsqueda, y conecta los botones de editar/eliminar.

Jugador es el único módulo con una quinta pieza,
`components/modal-jugador-lote.html` + `js/modalJugadorLote.js`, para
`POST /api/jugadores/batch`.

## Manejo de estado

No hay una librería de estado ni un store global. Cada `<página>.js`
mantiene su propio estado en variables de módulo (`let equiposCache = []`,
etc.), cargadas una vez al entrar a la página y refrescadas después de
cada creación/edición/eliminación. Los filtros de cada página (búsqueda,
selects) se aplican en memoria sobre esa caché, sin volver a golpear el
backend salvo que cambie la búsqueda por texto. Es deliberadamente simple:
al no compartirse estado entre páginas (cada `<página>.html` es una carga
de documento nueva), un store global no aportaría nada.

## Navegación

Sitio multipágina clásico (una URL = un archivo `.html`), no un SPA con
router. `components/menu.html` se inyecta en cada página vía `fetch` +
`innerHTML` (ver `js/app.js`) y resalta el enlace activo comparando
`document.body.dataset.page` contra el `data-page` de cada link del menú.
Se eligió esto (en vez de un router de cliente) porque, sin framework,
un router a mano añade complejidad sin necesidad real: son 5 páginas fijas
conocidas de antemano.

## Cómo ejecutarlo

1. Levanta el backend (ver `DEPLOYMENT.md` en el repo del backend,
   `mas-que-amigos`) — con o sin Docker.
2. Sirve esta carpeta con un servidor estático simple, **no la abras como
   archivo `file://`** (los `fetch()` a `components/*.html` y a los
   módulos ES fallan por CORS/`file://` en la mayoría de navegadores).
   La forma más simple: la extensión **Live Server** de VS Code, que sirve
   en `http://127.0.0.1:5500`. El backend (`CorsConfig.java`) ya tiene
   ese origen permitido, junto con `http://localhost:5500` y
   `http://localhost:5173` (por si se sirve con Vite u otra herramienta
   en ese puerto). Si usas otro puerto/servidor, agrégalo a la lista
   `allowedOrigins` de `CorsConfig.java` en el backend.
3. Ajusta `js/config.js` si el backend no corre en
   `http://localhost:57075` (por ejemplo, si lo levantaste con
   `docker compose` en otro puerto vía `SERVER_PORT`).
4. Abre `http://127.0.0.1:5500/index.html` (o el puerto que uses).

