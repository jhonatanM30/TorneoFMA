import { EquipoService } from "../services/EquipoService.js";
import { mostrarToast } from "./toast.js";
import { JugadorService } from "../services/JugadorService.js";
import { inicializarModalJugador } from "./modalJugador.js";
import { inicializarModalJugadorLote } from "./modalJugadorLote.js";

let jugadoresCache = [];
let equiposCache = [];

document.addEventListener("DOMContentLoaded", async function () {
    const jugadoresContainer = document.querySelector(".jugadores-container");
    const searchInput = document.getElementById("buscar-jugador");
    const filtroEquipo = document.getElementById("filtro-equipo");
    const filtroPosicion = document.getElementById("filtro-posicion");
    const checksPosicion = () => Array.from(filtroPosicion.querySelectorAll("input[type=\"checkbox\"]"));
    const btnAgregarJugador = document.getElementById("btn-agregar-jugador");
    const btnAgregarLote = document.getElementById("btn-agregar-lote");

    if (!jugadoresContainer) {
        console.error("No se encontró el contenedor de jugadores.");
        return;
    }

    try {
        equiposCache = await EquipoService.obtenerEquipos();
    } catch (error) {
        equiposCache = [];
        console.error("No se pudieron cargar los equipos para los filtros/formularios:", error);
    }

    llenarSelectEquipos(filtroEquipo, equiposCache, "Todos los equipos");

    const filtrarLocalmente = (lista) => {
        const idEquipo = filtroEquipo.value;
        const posicionesMarcadas = checksPosicion().filter((chk) => chk.checked).map((chk) => chk.value);

        return lista.filter((jugador) => {
            const coincideEquipo = !idEquipo || String(jugador.idEquipo ?? jugador.equipo?.id ?? "") === idEquipo;
            const coincidePosicion = posicionesMarcadas.length === 0 || posicionesMarcadas.includes(jugador.posicion);
            return coincideEquipo && coincidePosicion;
        });
    };

    const refrescar = async () => {
        const query = searchInput.value.trim();

        if (query) {
            try {
                const encontrados = await JugadorService.buscarJugadoresPorNombre(query);
                renderJugadores(jugadoresContainer, filtrarLocalmente(encontrados), refrescar);
            } catch (error) {
                jugadoresContainer.innerHTML = `<div class="empty-state">No se pudieron buscar jugadores.<br>${error.message || ""}</div>`;
            }
            return;
        }

        await cargarJugadores();
    };

    async function cargarJugadores() {
        jugadoresContainer.innerHTML = "<div class='loading-state'>Cargando jugadores...</div>";
        try {
            const jugadores = await JugadorService.obtenerJugadores();
            jugadoresCache = Array.isArray(jugadores) ? jugadores : [];
            renderJugadores(jugadoresContainer, filtrarLocalmente(jugadoresCache), refrescar);
        } catch (error) {
            jugadoresContainer.innerHTML = `
                <div class="empty-state">
                    No se pudieron cargar los jugadores.<br>
                    ${error.message || "Intenta nuevamente más tarde."}
                </div>
            `;
        }
    }

    inicializarModalJugador({
        equipos: equiposCache,
        onJugadorGuardado: refrescar
    });

    inicializarModalJugadorLote({
        equipos: equiposCache,
        onLoteGuardado: refrescar
    });

    btnAgregarJugador.addEventListener("click", () => {
        if (window.abrirModalJugador) {
            window.abrirModalJugador();
        }
    });

    btnAgregarLote.addEventListener("click", () => {
        if (window.abrirModalJugadorLote) {
            window.abrirModalJugadorLote();
        }
    });

    searchInput.addEventListener("input", refrescar);
    filtroEquipo.addEventListener("change", refrescar);
    checksPosicion().forEach((chk) => chk.addEventListener("change", refrescar));

    await cargarJugadores();
});

function llenarSelectEquipos(select, equipos, etiquetaTodos) {
    select.innerHTML = `<option value="">${etiquetaTodos}</option>` +
        equipos.map((equipo) => `<option value="${equipo.id}">${equipo.nombre}</option>`).join("");
}

const ETIQUETAS_POSICION = {
    PORTERO: "Portero",
    DEFENSA: "Defensa",
    MEDIOCAMPISTA: "Mediocampista",
    DELANTERO: "Delantero"
};

// Indicador visual del equipo pedido por FRONTEND_API_PROMPT.md ("color o
// logo"): como los equipos no siempre tienen escudo (imagenUrl es
// opcional), se deriva un color estable a partir del id del equipo (mismo
// id -> mismo color siempre, sin depender de un dato que puede faltar).
function colorParaEquipo(idEquipo) {
    const semilla = Number(idEquipo) || 0;
    const tono = (semilla * 47) % 360;
    return `hsl(${tono}, 62%, 45%)`;
}

function renderJugadores(container, jugadores, onCambio) {
    if (!Array.isArray(jugadores) || jugadores.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                No hay jugadores registrados con los filtros seleccionados.
            </div>
        `;
        return;
    }

    container.innerHTML = jugadores.map((jugador) => {
        const nombreEquipo = jugador.equipo?.nombre || "Sin equipo";
        const posicionEtiqueta = ETIQUETAS_POSICION[jugador.posicion] || jugador.posicion || "Sin posición";

        const idEquipoJugador = jugador.idEquipo ?? jugador.equipo?.id ?? "";
        const colorEquipo = colorParaEquipo(idEquipoJugador);

        return `
            <article class="jugador-card" data-id="${jugador.id ?? ""}" style="border-top-color: ${colorEquipo};">
                <span class="dorsal">${jugador.dorsal ?? "-"}</span>
                <div><span class="badge-posicion ${jugador.posicion || ""}">${posicionEtiqueta}</span></div>
                <h3>${jugador.nombre || "Jugador sin nombre"}</h3>
                <p><strong>Equipo:</strong> <span class="punto-equipo" style="background-color: ${colorEquipo};"></span>${nombreEquipo}</p>
                <p><strong>Edad:</strong> ${jugador.edad ?? "-"}</p>
                <div class="jugador-actions">
                    <button class="btn btn-small btn-editar" data-id="${jugador.id ?? ""}">Editar</button>
                    <button class="btn btn-small btn-eliminar" data-id="${jugador.id ?? ""}">Eliminar</button>
                </div>
            </article>
        `;
    }).join("");

    container.querySelectorAll(".btn-editar").forEach((button) => {
        button.addEventListener("click", () => {
            const jugador = jugadores.find((item) => String(item.id) === String(button.dataset.id));
            if (jugador && window.abrirModalJugador) {
                window.abrirModalJugador(jugador);
            }
        });
    });

    container.querySelectorAll(".btn-eliminar").forEach((button) => {
        button.addEventListener("click", async () => {
            const jugador = jugadores.find((item) => String(item.id) === String(button.dataset.id));
            if (!jugador) return;

            const confirmar = window.confirm(`¿Estás seguro de eliminar al jugador "${jugador.nombre}"?`);
            if (!confirmar) return;

            try {
                await JugadorService.eliminarJugador(jugador.id);
                mostrarToast("Jugador eliminado correctamente.", "success");
                if (typeof onCambio === "function") {
                    await onCambio();
                }
            } catch (error) {
                mostrarToast(error.message || "No se pudo eliminar el jugador", "error");
            }
        });
    });
}
