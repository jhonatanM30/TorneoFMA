import { EquipoService } from "../services/EquipoService.js";
import { JugadorService } from "../services/JugadorService.js";
import { mostrarToast } from "./toast.js";
import { PartidoService } from "../services/PartidoService.js";
import { EstadisticaService } from "../services/EstadisticaService.js";
import { inicializarModalEstadistica } from "./modalEstadistica.js";

let estadisticasCache = [];
let jugadoresCache = [];
let partidosCache = [];
let equiposCache = [];

document.addEventListener("DOMContentLoaded", async function () {
    const estadisticasContainer = document.querySelector(".estadisticas-container");
    const filtroJugador = document.getElementById("filtro-jugador");
    const filtroPartido = document.getElementById("filtro-partido");
    const btnAgregarEstadistica = document.getElementById("btn-agregar-estadistica");

    if (!estadisticasContainer) {
        console.error("No se encontró el contenedor de estadísticas.");
        return;
    }

    // Los jugadores necesitan el nombre de su equipo (jugador.equipo.nombre)
    // para el filtro por partido del modal; JugadorService.obtenerJugadores
    // ya devuelve esa relación, así que no hace falta cruzar con equipos aquí.
    try {
        [jugadoresCache, partidosCache, equiposCache] = await Promise.all([
            JugadorService.obtenerJugadores(),
            PartidoService.obtenerPartidos(),
            EquipoService.obtenerEquipos()
        ]);
    } catch (error) {
        jugadoresCache = [];
        partidosCache = [];
        equiposCache = [];
        console.error("No se pudieron cargar jugadores/partidos/equipos para Estadísticas:", error);
    }

    llenarSelectJugadores(filtroJugador, jugadoresCache);
    llenarSelectPartidos(filtroPartido, partidosCache);

    inicializarModalEstadistica({
        partidos: partidosCache,
        jugadores: jugadoresCache,
        onEstadisticaGuardada: cargarEstadisticas
    });

    btnAgregarEstadistica.addEventListener("click", () => {
        if (window.abrirModalEstadistica) {
            window.abrirModalEstadistica();
        }
    });

    const filtrarLocalmente = (lista) => {
        const idJugador = filtroJugador.value;
        const idPartido = filtroPartido.value;

        return lista.filter((estadistica) => {
            const coincideJugador = !idJugador || String(estadistica.idJugador) === idJugador;
            const coincidePartido = !idPartido || String(estadistica.idPartido) === idPartido;
            return coincideJugador && coincidePartido;
        });
    };

    async function cargarEstadisticas() {
        estadisticasContainer.innerHTML = "<div class='loading-state'>Cargando estadísticas...</div>";
        try {
            const estadisticas = await EstadisticaService.obtenerEstadisticas();
            estadisticasCache = Array.isArray(estadisticas) ? estadisticas : [];
            render(filtrarLocalmente(estadisticasCache));
        } catch (error) {
            estadisticasContainer.innerHTML = `
                <div class="empty-state">
                    No se pudieron cargar las estadísticas.<br>
                    ${error.message || "Intenta nuevamente más tarde."}
                </div>
            `;
        }
    }

    function render(estadisticas) {
        if (!Array.isArray(estadisticas) || estadisticas.length === 0) {
            estadisticasContainer.innerHTML = `
                <div class="empty-state">
                    No hay estadísticas registradas con los filtros seleccionados.
                </div>
            `;
            return;
        }

        estadisticasContainer.innerHTML = `
            <table class="estadisticas-table">
                <thead>
                    <tr>
                        <th>Jugador</th>
                        <th>Partido</th>
                        <th>Goles</th>
                        <th>T. Amarillas</th>
                        <th>T. Rojas</th>
                        <th>Asistencias</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${estadisticas.map((estadistica) => filaEstadistica(estadistica)).join("")}
                </tbody>
            </table>
        `;

        estadisticasContainer.querySelectorAll(".btn-eliminar").forEach((button) => {
            button.addEventListener("click", async () => {
                const confirmar = window.confirm("¿Estás seguro de eliminar esta estadística?");
                if (!confirmar) return;

                try {
                    await EstadisticaService.eliminarEstadistica(button.dataset.id);
                    mostrarToast("Estadística eliminada correctamente.", "success");
                    await cargarEstadisticas();
                } catch (error) {
                    mostrarToast(error.message || "No se pudo eliminar la estadística", "error");
                }
            });
        });
    }

    function filaEstadistica(estadistica) {
        const jugador = jugadoresCache.find((item) => String(item.id) === String(estadistica.idJugador));
        const partido = partidosCache.find((item) => String(item.id) === String(estadistica.idPartido));

        const nombreJugador = jugador?.nombre || `Jugador #${estadistica.idJugador}`;
        const equipoJugador = jugador?.equipo?.nombre ? ` (${jugador.equipo.nombre})` : "";
        const etiquetaPartido = partido
            ? `${partido.equipoLocal?.nombre || "Local"} vs ${partido.equipoVisitante?.nombre || "Visitante"}`
            : `Partido #${estadistica.idPartido}`;

        const tieneRoja = Number(estadistica.tarjetasRojas) > 0;

        return `
            <tr class="${tieneRoja ? "fila-tarjeta-roja" : ""}">
                <td>${nombreJugador}${equipoJugador}</td>
                <td>${etiquetaPartido}</td>
                <td>${estadistica.goles ?? 0}</td>
                <td>${estadistica.tarjetasAmarillas ?? 0}</td>
                <td>${estadistica.tarjetasRojas ?? 0}</td>
                <td>${estadistica.asistencias ?? 0}</td>
                <td><button class="btn btn-small btn-eliminar" data-id="${estadistica.id}">Eliminar</button></td>
            </tr>
        `;
    }

    filtroJugador.addEventListener("change", () => render(filtrarLocalmente(estadisticasCache)));
    filtroPartido.addEventListener("change", () => render(filtrarLocalmente(estadisticasCache)));

    renderResumenPorEquipo();

    await cargarEstadisticas();
});

// FRONTEND_VISION.md Fase4: resumen agregado por equipo (partidos
// jugados, titulos, goles y tarjetas totales) + un grafico, a partir de
// los mismos datos ya cargados (sin endpoints nuevos: el backend no tiene
// una consulta de agregados, se calcula en el cliente).
function renderResumenPorEquipo() {
    const cuerpoTabla = document.getElementById("tabla-resumen-equipos-body");
    const canvas = document.getElementById("chart-equipos-stats");
    if (!cuerpoTabla) return;

    const jugadorPorId = new Map(jugadoresCache.map((jugador) => [String(jugador.id), jugador]));

    const resumenPorEquipo = new Map();
    const obtenerResumen = (idEquipo) => {
        if (!resumenPorEquipo.has(idEquipo)) {
            resumenPorEquipo.set(idEquipo, { partidos: new Set(), goles: 0, amarillas: 0, rojas: 0 });
        }
        return resumenPorEquipo.get(idEquipo);
    };

    partidosCache.forEach((partido) => {
        if (partido.equipoLocal?.id) obtenerResumen(partido.equipoLocal.id).partidos.add(partido.id);
        if (partido.equipoVisitante?.id) obtenerResumen(partido.equipoVisitante.id).partidos.add(partido.id);
    });

    estadisticasCache.forEach((estadistica) => {
        const jugador = jugadorPorId.get(String(estadistica.idJugador));
        const idEquipo = jugador?.idEquipo ?? jugador?.equipo?.id;
        if (idEquipo === undefined || idEquipo === null) return;

        const resumen = obtenerResumen(idEquipo);
        resumen.goles += Number(estadistica.goles || 0);
        resumen.amarillas += Number(estadistica.tarjetasAmarillas || 0);
        resumen.rojas += Number(estadistica.tarjetasRojas || 0);
    });

    if (equiposCache.length === 0) {
        cuerpoTabla.innerHTML = '<tr><td colspan="6" class="empty-state">No hay equipos registrados.</td></tr>';
        return;
    }

    cuerpoTabla.innerHTML = equiposCache.map((equipo) => {
        const resumen = obtenerResumen(equipo.id);
        return `
            <tr>
                <td>${equipo.nombre}</td>
                <td>${resumen.partidos.size}</td>
                <td>${equipo.titulos ?? 0}</td>
                <td>${resumen.goles}</td>
                <td>${resumen.amarillas}</td>
                <td>${resumen.rojas}</td>
            </tr>
        `;
    }).join("");

    if (!canvas || typeof Chart === "undefined") return;

    new Chart(canvas, {
        type: "bar",
        data: {
            labels: equiposCache.map((equipo) => equipo.nombre),
            datasets: [
                { label: "Goles", data: equiposCache.map((equipo) => obtenerResumen(equipo.id).goles), backgroundColor: "#145A32" },
                { label: "T. Amarillas", data: equiposCache.map((equipo) => obtenerResumen(equipo.id).amarillas), backgroundColor: "#FFD700" },
                { label: "T. Rojas", data: equiposCache.map((equipo) => obtenerResumen(equipo.id).rojas), backgroundColor: "#b22222" }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: "bottom" } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });
}

function llenarSelectJugadores(select, jugadores) {
    select.innerHTML = '<option value="">Todos los jugadores</option>' +
        jugadores.map((jugador) => `<option value="${jugador.id}">${jugador.nombre}</option>`).join("");
}

function llenarSelectPartidos(select, partidos) {
    select.innerHTML = '<option value="">Todos los partidos</option>' +
        partidos.map((partido) => `<option value="${partido.id}">${partido.equipoLocal?.nombre || "Local"} vs ${partido.equipoVisitante?.nombre || "Visitante"}</option>`).join("");
}
