import { JugadorService } from "../services/JugadorService.js";
import { mostrarToast } from "./toast.js";
import { PartidoService } from "../services/PartidoService.js";
import { EstadisticaService } from "../services/EstadisticaService.js";
import { inicializarModalEstadistica } from "./modalEstadistica.js";

let estadisticasCache = [];
let jugadoresCache = [];
let partidosCache = [];

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
        [jugadoresCache, partidosCache] = await Promise.all([
            JugadorService.obtenerJugadores(),
            PartidoService.obtenerPartidos()
        ]);
    } catch (error) {
        jugadoresCache = [];
        partidosCache = [];
        console.error("No se pudieron cargar jugadores/partidos para Estadísticas:", error);
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

    await cargarEstadisticas();
});

function llenarSelectJugadores(select, jugadores) {
    select.innerHTML = '<option value="">Todos los jugadores</option>' +
        jugadores.map((jugador) => `<option value="${jugador.id}">${jugador.nombre}</option>`).join("");
}

function llenarSelectPartidos(select, partidos) {
    select.innerHTML = '<option value="">Todos los partidos</option>' +
        partidos.map((partido) => `<option value="${partido.id}">${partido.equipoLocal?.nombre || "Local"} vs ${partido.equipoVisitante?.nombre || "Visitante"}</option>`).join("");
}
