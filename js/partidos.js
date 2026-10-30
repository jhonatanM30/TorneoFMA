import { EquipoService } from "../services/EquipoService.js";
import { JugadorService } from "../services/JugadorService.js";
import { EstadisticaService } from "../services/EstadisticaService.js";
import { mostrarToast } from "./toast.js";
import { PartidoService } from "../services/PartidoService.js";
import { inicializarModalPartido } from "./modalPartido.js";
import { inicializarModalSorteo } from "./modalSorteo.js";

let partidosCache = [];
let equiposCache = [];
let jugadoresCache = [];
let estadisticasCache = [];

const ETIQUETAS_FASE = {
    FASE_DE_GRUPOS: "Fase de grupos",
    REPECHAJE: "Repechaje",
    ELIMINACION_DIRECTA: "Eliminación directa",
    FINAL: "Final"
};

// FRONTEND_VISION.md Fase3-09: estados del partido (PROGRAMADO/EN_CURSO/
// FINALIZADO). Se muestran como badge y controlan qué botón de transición
// (Iniciar/Finalizar) se ofrece en cada tarjeta.
const ETIQUETAS_ESTADO = {
    PROGRAMADO: "Programado",
    EN_CURSO: "En curso",
    FINALIZADO: "Finalizado"
};

document.addEventListener("DOMContentLoaded", async function () {
    const partidosContainer = document.querySelector(".partidos-container");
    const searchInput = document.getElementById("buscar-partido");
    const filtroFase = document.getElementById("filtro-fase");
    const filtroFechaDesde = document.getElementById("filtro-fecha-desde");
    const filtroFechaHasta = document.getElementById("filtro-fecha-hasta");
    const btnOrdenFecha = document.getElementById("btn-orden-fecha");
    const btnAgregarPartido = document.getElementById("btn-agregar-partido");
    const btnSorteoPartidos = document.getElementById("btn-sorteo-partidos");
    let ordenDescendente = false;

    if (!partidosContainer) {
        console.error("No se encontró el contenedor de partidos.");
        return;
    }

    // Hallazgo post-despliegue (fase9): jugadores y estadísticas se cargan
    // acá también (no solo equipos) para poder armar, debajo de cada
    // partido, un resumen de "novedades" (goles/tarjetas/asistencias por
    // jugador) sin llamadas adicionales al backend - mismo patrón que ya
    // usa alineaciones.js para su historial.
    try {
        [equiposCache, jugadoresCache, estadisticasCache] = await Promise.all([
            EquipoService.obtenerEquipos(),
            JugadorService.obtenerJugadores(),
            EstadisticaService.obtenerEstadisticas()
        ]);
    } catch (error) {
        equiposCache = [];
        jugadoresCache = [];
        estadisticasCache = [];
        console.error("No se pudieron cargar los datos para el formulario/resumen de partidos:", error);
    }

    inicializarModalPartido({
        equipos: equiposCache,
        onPartidoGuardado: async () => {
            await cargarPartidos();
        }
    });

    inicializarModalSorteo({
        equipos: equiposCache,
        onSorteoGuardado: async () => {
            await cargarPartidos();
        }
    });

    btnAgregarPartido.addEventListener("click", () => {
        if (window.abrirModalPartido) {
            window.abrirModalPartido();
        }
    });

    btnSorteoPartidos.addEventListener("click", () => {
        if (window.abrirModalSorteo) {
            window.abrirModalSorteo();
        }
    });

    // Filtro por fase + filtro por rango de fechas (ambos pedidos por
    // FRONTEND_API_PROMPT.md: "filtro por fase" ya existía, "filtro por
    // fecha (rango)" es nuevo). Las fechas llegan como "YYYY-MM-DD", que se
    // comparan bien como strings sin parsear a Date.
    const aplicarFiltros = (lista) => {
        const fase = filtroFase.value;
        const desde = filtroFechaDesde.value;
        const hasta = filtroFechaHasta.value;

        return lista.filter((partido) => {
            const coincideFase = !fase || partido.fase === fase;
            const coincideDesde = !desde || (partido.fecha && partido.fecha >= desde);
            const coincideHasta = !hasta || (partido.fecha && partido.fecha <= hasta);
            return coincideFase && coincideDesde && coincideHasta;
        });
    };

    async function cargarPartidos() {
        partidosContainer.innerHTML = "<div class='loading-state'>Cargando partidos...</div>";
        try {
            const [partidos, estadisticas] = await Promise.all([
                PartidoService.obtenerPartidos(),
                EstadisticaService.obtenerEstadisticas()
            ]);
            partidosCache = Array.isArray(partidos) ? partidos : [];
            estadisticasCache = Array.isArray(estadisticas) ? estadisticas : estadisticasCache;
            render(aplicarFiltros(partidosCache));
        } catch (error) {
            partidosContainer.innerHTML = `
                <div class="empty-state">
                    No se pudieron cargar los partidos.<br>
                    ${error.message || "Intenta nuevamente más tarde."}
                </div>
            `;
        }
    }

    async function buscarPorEquipo(nombre) {
        try {
            const partidos = await PartidoService.buscarPartidosPorEquipo(nombre);
            render(aplicarFiltros(Array.isArray(partidos) ? partidos : []));
        } catch (error) {
            partidosContainer.innerHTML = `
                <div class="empty-state">
                    No se encontraron partidos para la búsqueda indicada.
                </div>
            `;
        }
    }

    // Hallazgo post-despliegue (fase9): "el historial del partido que sale
    // en alineaciones deberia mostrarse en el partido abajo cuando se
    // registre la novedad, con gol amarilla o la novedad relacionada
    // ejemplo yeiler 1gol, 1(imagen de tarjeta amarilla)". Como
    // Estadistica ahora es un solo registro por jugador+partido (con
    // contadores), este resumen es directo: una línea por jugador con
    // registro en este partido.
    function resumenNovedades(idPartido) {
        const idPartidoStr = String(idPartido);
        const registros = estadisticasCache.filter((estadistica) => String(estadistica.idPartido) === idPartidoStr);

        if (registros.length === 0) {
            return "";
        }

        const items = registros.map((estadistica) => {
            const jugador = jugadoresCache.find((item) => String(item.id) === String(estadistica.idJugador));
            const nombre = jugador?.nombre || `Jugador #${estadistica.idJugador}`;

            const partes = [];
            if (Number(estadistica.goles) > 0) partes.push(`${estadistica.goles} ⚽`);
            if (Number(estadistica.asistencias) > 0) partes.push(`${estadistica.asistencias} 🅰️`);
            if (Number(estadistica.tarjetasAmarillas) > 0) partes.push(`${estadistica.tarjetasAmarillas} 🟨`);
            if (Number(estadistica.tarjetasRojas) > 0) partes.push(`${estadistica.tarjetasRojas} 🟥`);

            if (partes.length === 0) {
                return null;
            }

            return `<li><strong>${nombre}</strong>: ${partes.join(", ")}</li>`;
        }).filter(Boolean);

        if (items.length === 0) {
            return "";
        }

        return `<ul class="partido-novedades">${items.join("")}</ul>`;
    }

    function render(partidos) {
        if (!Array.isArray(partidos) || partidos.length === 0) {
            partidosContainer.innerHTML = `
                <div class="empty-state">
                    No hay partidos registrados con los filtros seleccionados.
                </div>
            `;
            return;
        }

        const ordenados = [...partidos].sort((a, b) => {
            const fechaHoraA = `${a.fecha || ""} ${a.hora || ""}`;
            const fechaHoraB = `${b.fecha || ""} ${b.hora || ""}`;
            return ordenDescendente ? fechaHoraB.localeCompare(fechaHoraA) : fechaHoraA.localeCompare(fechaHoraB);
        });

        partidosContainer.innerHTML = ordenados.map((partido) => {
            const local = partido.equipoLocal?.nombre || "Equipo local";
            const visitante = partido.equipoVisitante?.nombre || "Equipo visitante";
            const faseEtiqueta = ETIQUETAS_FASE[partido.fase] || partido.fase || "Sin fase";

            const golesLocal = Number(partido.golesLocal ?? 0);
            const golesVisitante = Number(partido.golesVisitante ?? 0);
            const claseLocal = golesLocal > golesVisitante ? "equipo-ganador" : "";
            const claseVisitante = golesVisitante > golesLocal ? "equipo-ganador" : "";

            const estado = partido.estado || "PROGRAMADO";
            const estadoEtiqueta = ETIQUETAS_ESTADO[estado] || estado;
            const botonEstado = estado === "PROGRAMADO"
                ? `<button class="btn btn-small btn-iniciar-partido" data-requiere-admin="true" data-id="${partido.id ?? ""}">Iniciar partido</button>`
                : estado === "EN_CURSO"
                    ? `<button class="btn btn-small btn-finalizar-partido" data-requiere-admin="true" data-id="${partido.id ?? ""}">Finalizar partido</button>`
                    : "";

            // Hallazgo post-despliegue (fase9): "una vez finalizado el
            // partido, no se puede editar ni eliminar" - además de que el
            // backend ya lo rechaza, se ocultan directamente los botones
            // para un partido FINALIZADO (mismo criterio que
            // data-requiere-admin: evitar que se intente una acción que de
            // todos modos va a fallar).
            const puedeEditarseOEliminarse = estado !== "FINALIZADO";
            const botonesEdicion = puedeEditarseOEliminarse
                ? `
                    <button class="btn btn-small btn-editar" data-requiere-admin="true" data-id="${partido.id ?? ""}">Editar</button>
                    <button class="btn btn-small btn-eliminar" data-requiere-admin="true" data-id="${partido.id ?? ""}">Eliminar</button>
                `
                : "";

            return `
                <article class="partido-card" data-id="${partido.id ?? ""}">
                    <div>
                        <div class="partido-equipos">
                            <span class="${claseLocal}">${local}</span>
                            <span class="partido-marcador">${golesLocal} - ${golesVisitante}</span>
                            <span class="${claseVisitante}">${visitante}</span>
                        </div>
                        <div class="partido-meta">
                            <span><i class="fas fa-calendar"></i> ${partido.fecha || "Sin fecha"} ${partido.hora || ""}</span>
                            <span class="badge-fase ${partido.fase || ""}">${faseEtiqueta}</span>
                            <span class="badge-estado badge-estado--${estado.toLowerCase()}">${estadoEtiqueta}</span>
                        </div>
                        ${resumenNovedades(partido.id)}
                    </div>
                    <div class="partido-actions">
                        <a class="btn btn-small btn-alineacion" href="alineaciones.html?idPartido=${partido.id ?? ""}">Alineación</a>
                        ${botonEstado}
                        ${botonesEdicion}
                    </div>
                </article>
            `;
        }).join("");

        partidosContainer.querySelectorAll(".btn-editar").forEach((button) => {
            button.addEventListener("click", () => {
                const partido = partidos.find((item) => String(item.id) === String(button.dataset.id));
                if (partido && window.abrirModalPartido) {
                    window.abrirModalPartido(partido);
                }
            });
        });

        partidosContainer.querySelectorAll(".btn-eliminar").forEach((button) => {
            button.addEventListener("click", async () => {
                const partido = partidos.find((item) => String(item.id) === String(button.dataset.id));
                if (!partido) return;

                const confirmar = window.confirm("¿Estás seguro de eliminar este partido? También se eliminarán sus alineaciones, cambios de jugador y estadísticas registradas.");
                if (!confirmar) return;

                try {
                    await PartidoService.eliminarPartido(partido.id);
                    mostrarToast("Partido eliminado correctamente.", "success");
                    await cargarPartidos();
                } catch (error) {
                    mostrarToast(error.message || "No se pudo eliminar el partido", "error");
                }
            });
        });

        partidosContainer.querySelectorAll(".btn-iniciar-partido").forEach((button) => {
            button.addEventListener("click", async () => {
                try {
                    await PartidoService.iniciarPartido(button.dataset.id);
                    mostrarToast("Partido iniciado.", "success");
                    await cargarPartidos();
                } catch (error) {
                    mostrarToast(error.message || "No se pudo iniciar el partido", "error");
                }
            });
        });

        partidosContainer.querySelectorAll(".btn-finalizar-partido").forEach((button) => {
            button.addEventListener("click", async () => {
                const confirmar = window.confirm("¿Finalizar este partido? No podrás registrar más cambios de jugador.");
                if (!confirmar) return;

                try {
                    await PartidoService.finalizarPartido(button.dataset.id);
                    mostrarToast("Partido finalizado.", "success");
                    await cargarPartidos();
                } catch (error) {
                    mostrarToast(error.message || "No se pudo finalizar el partido", "error");
                }
            });
        });
    }

    searchInput.addEventListener("input", async (event) => {
        const query = event.target.value.trim();

        if (!query) {
            await cargarPartidos();
            return;
        }

        await buscarPorEquipo(query);
    });

    filtroFase.addEventListener("change", () => render(aplicarFiltros(partidosCache)));
    filtroFechaDesde.addEventListener("change", () => render(aplicarFiltros(partidosCache)));
    filtroFechaHasta.addEventListener("change", () => render(aplicarFiltros(partidosCache)));
    btnOrdenFecha.addEventListener("click", () => {
        ordenDescendente = !ordenDescendente;
        btnOrdenFecha.textContent = ordenDescendente ? "Fecha ↓" : "Fecha ↑";
        render(aplicarFiltros(partidosCache));
    });

    await cargarPartidos();
});
