import { EquipoService } from "../services/EquipoService.js";
import { mostrarToast } from "./toast.js";
import { PartidoService } from "../services/PartidoService.js";
import { inicializarModalPartido } from "./modalPartido.js";

let partidosCache = [];
let equiposCache = [];

const ETIQUETAS_FASE = {
    FASE_DE_GRUPOS: "Fase de grupos",
    REPECHAJE: "Repechaje",
    ELIMINACION_DIRECTA: "Eliminación directa",
    FINAL: "Final"
};

document.addEventListener("DOMContentLoaded", async function () {
    const partidosContainer = document.querySelector(".partidos-container");
    const searchInput = document.getElementById("buscar-partido");
    const filtroFase = document.getElementById("filtro-fase");
    const filtroFechaDesde = document.getElementById("filtro-fecha-desde");
    const filtroFechaHasta = document.getElementById("filtro-fecha-hasta");
    const btnOrdenFecha = document.getElementById("btn-orden-fecha");
    const btnAgregarPartido = document.getElementById("btn-agregar-partido");
    let ordenDescendente = false;

    if (!partidosContainer) {
        console.error("No se encontró el contenedor de partidos.");
        return;
    }

    try {
        equiposCache = await EquipoService.obtenerEquipos();
    } catch (error) {
        equiposCache = [];
        console.error("No se pudieron cargar los equipos para el formulario de partidos:", error);
    }

    inicializarModalPartido({
        equipos: equiposCache,
        onPartidoGuardado: async () => {
            await cargarPartidos();
        }
    });

    btnAgregarPartido.addEventListener("click", () => {
        if (window.abrirModalPartido) {
            window.abrirModalPartido();
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
            const partidos = await PartidoService.obtenerPartidos();
            partidosCache = Array.isArray(partidos) ? partidos : [];
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
                        </div>
                    </div>
                    <div class="partido-actions">
                        <a class="btn btn-small btn-alineacion" href="alineaciones.html?idPartido=${partido.id ?? ""}">Alineación</a>
                        <button class="btn btn-small btn-editar" data-id="${partido.id ?? ""}">Editar</button>
                        <button class="btn btn-small btn-eliminar" data-id="${partido.id ?? ""}">Eliminar</button>
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

                const confirmar = window.confirm("¿Estás seguro de eliminar este partido?");
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
