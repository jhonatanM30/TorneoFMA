import { JugadorService } from "../services/JugadorService.js";
import { PartidoService } from "../services/PartidoService.js";
import { AlineacionService } from "../services/AlineacionService.js";
import { inicializarModalAlineacion } from "./modalAlineacion.js";

let jugadoresCache = [];
let partidosCache = [];

document.addEventListener("DOMContentLoaded", async function () {
    const resultado = document.querySelector(".alineacion-resultado");
    const filtroPartido = document.getElementById("filtro-partido-alineacion");
    const btnAgregar = document.getElementById("btn-agregar-alineacion");

    if (!resultado) {
        console.error("No se encontró el contenedor de alineaciones.");
        return;
    }

    try {
        [jugadoresCache, partidosCache] = await Promise.all([
            JugadorService.obtenerJugadores(),
            PartidoService.obtenerPartidos()
        ]);
    } catch (error) {
        jugadoresCache = [];
        partidosCache = [];
        console.error("No se pudieron cargar jugadores/partidos para Alineaciones:", error);
    }

    filtroPartido.innerHTML = '<option value="">Seleccione un partido para ver su alineación</option>' +
        partidosCache.map((partido) => `<option value="${partido.id}">${partido.equipoLocal?.nombre || "Local"} vs ${partido.equipoVisitante?.nombre || "Visitante"} (${partido.fecha || "sin fecha"})</option>`).join("");

    inicializarModalAlineacion({
        partidos: partidosCache,
        jugadores: jugadoresCache,
        onAlineacionGuardada: async () => {
            await mostrarAlineacion(filtroPartido.value);
        }
    });

    btnAgregar.addEventListener("click", () => {
        if (window.abrirModalAlineacion) {
            window.abrirModalAlineacion(filtroPartido.value || null);
        }
    });

    filtroPartido.addEventListener("change", () => mostrarAlineacion(filtroPartido.value));

    async function mostrarAlineacion(idPartido) {
        if (!idPartido) {
            resultado.innerHTML = `
                <div class="empty-state">
                    Elige un partido arriba para ver quién está alineado.
                </div>
            `;
            return;
        }

        const partido = partidosCache.find((item) => String(item.id) === String(idPartido));
        resultado.innerHTML = "<div class='loading-state'>Cargando alineación...</div>";

        try {
            const alineacion = await AlineacionService.obtenerPorPartido(idPartido);
            render(partido, Array.isArray(alineacion) ? alineacion : []);
        } catch (error) {
            resultado.innerHTML = `
                <div class="empty-state">
                    No se pudo cargar la alineación de este partido.<br>
                    ${error.message || "Intenta nuevamente más tarde."}
                </div>
            `;
        }
    }

    function render(partido, alineacion) {
        if (!partido) {
            resultado.innerHTML = `<div class="empty-state">Partido no encontrado.</div>`;
            return;
        }

        const idLocal = String(partido.equipoLocal?.id ?? "");
        const idVisitante = String(partido.equipoVisitante?.id ?? "");

        const deEquipo = (idEquipo) => alineacion.filter((item) => {
            const idEquipoJugador = String(item.jugador?.equipo?.id ?? "");
            return idEquipoJugador === idEquipo;
        });

        resultado.innerHTML = `
            ${tarjetaEquipo(partido.equipoLocal?.nombre || "Equipo local", deEquipo(idLocal))}
            ${tarjetaEquipo(partido.equipoVisitante?.nombre || "Equipo visitante", deEquipo(idVisitante))}
        `;
    }

    function tarjetaEquipo(nombreEquipo, jugadoresAlineados) {
        const titulares = jugadoresAlineados.filter((item) => item.titular);
        const suplentes = jugadoresAlineados.filter((item) => !item.titular);

        return `
            <article class="alineacion-equipo">
                <h3>${nombreEquipo}</h3>
                <h4>Titulares (${titulares.length}/11)</h4>
                <ul class="alineacion-lista">
                    ${listaJugadores(titulares)}
                </ul>
                <h4>Suplentes</h4>
                <ul class="alineacion-lista">
                    ${listaJugadores(suplentes)}
                </ul>
            </article>
        `;
    }

    function listaJugadores(items) {
        if (items.length === 0) {
            return '<li class="sin-jugadores">Sin jugadores registrados</li>';
        }

        return items.map((item) => {
            const jugador = item.jugador || jugadoresCache.find((j) => String(j.id) === String(item.idJugador));
            const nombre = jugador?.nombre || `Jugador #${item.idJugador}`;
            const dorsal = jugador?.dorsal ?? "-";
            return `<li>#${dorsal} — ${nombre}</li>`;
        }).join("");
    }
});
