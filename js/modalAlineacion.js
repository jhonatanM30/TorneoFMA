import { AlineacionService } from "../services/AlineacionService.js";
import { mostrarToast } from "./toast.js";

const etiquetaPartido = (partido) => {
    const local = partido.equipoLocal?.nombre || "Local";
    const visitante = partido.equipoVisitante?.nombre || "Visitante";
    return `${local} vs ${visitante} (${partido.fecha || "sin fecha"})`;
};

// Hallazgo post-despliegue (fase9): "se deberia permitir alinear en Lote,
// creo que es mas optimo que 1 a 1 cada partido". El backend no ganó un
// endpoint de creación masiva: se sigue usando el mismo POST
// /api/alineaciones de siempre, pero ahora se manda una petición por cada
// jugador marcado, en secuencia (mismo patrón ya usado por el Sorteo de
// partidos), en vez de obligar a abrir el modal una vez por jugador.
//
// partidos/jugadores: listas ya cargadas por alineaciones.js.
export function inicializarModalAlineacion({ partidos = [], jugadores = [], onAlineacionGuardada = () => {} } = {}) {
    const modalContainer = document.getElementById("modal-container");

    if (!modalContainer) {
        console.warn("No se encontró el contenedor del modal de alineación");
        return;
    }

    fetch("components/modal-alineacion.html")
        .then((response) => response.text())
        .then((html) => {
            modalContainer.innerHTML = html;

            const modal = document.getElementById("modal-alineacion");
            const btnCerrarModal = modal.querySelector(".close");
            const formAlineacion = modal.querySelector("#form-alineacion");
            const formStatus = modal.querySelector("#alineacion-form-status");
            const submitButton = modal.querySelector("#alineacion-submit-btn");
            const submitText = modal.querySelector("#alineacion-submit-text");
            const selectPartido = modal.querySelector("#alineacion-partido");
            const listaJugadores = modal.querySelector("#alineacion-lista-jugadores");

            selectPartido.innerHTML = '<option value="">Seleccione un partido</option>' +
                partidos.map((partido) => `<option value="${partido.id}">${etiquetaPartido(partido)}</option>`).join("");

            modal.style.display = "none";

            const setStatus = (message, type = "info") => {
                formStatus.textContent = message || "";
                formStatus.className = `form-status ${type}`;
            };

            const setSavingState = (isSaving) => {
                submitButton.disabled = isSaving;
                submitButton.classList.toggle("is-loading", isSaving);
                submitText.textContent = isSaving ? "Guardando..." : "Guardar alineación";
            };

            const filaJugador = (jugador) => `
                <label class="alineacion-lote-fila">
                    <input type="checkbox" class="alineacion-check" value="${jugador.id}">
                    <span class="alineacion-lote-nombre">${jugador.nombre} <small>(${jugador.equipo?.nombre || ""})</small></span>
                    <select class="alineacion-rol" data-id="${jugador.id}">
                        <option value="suplente">Suplente</option>
                        <option value="titular">Titular</option>
                    </select>
                </label>
            `;

            // Al elegir el partido: limita la lista a los jugadores de los
            // dos equipos que juegan ese partido y excluye a los que ya
            // están alineados en él (el backend igual lo rechazaría por
            // duplicado, pero así se evita el viaje al servidor de una vez).
            const actualizarJugadoresDelPartido = async () => {
                const idPartido = selectPartido.value;
                const partido = partidos.find((item) => String(item.id) === idPartido);

                if (!partido) {
                    listaJugadores.innerHTML = '<p class="empty-state">Seleccione un partido para ver los jugadores disponibles.</p>';
                    return;
                }

                listaJugadores.innerHTML = '<p class="loading-state">Cargando jugadores disponibles...</p>';

                const idsEquipos = [partido.equipoLocal?.id, partido.equipoVisitante?.id]
                    .filter((id) => id !== undefined && id !== null)
                    .map(String);

                let yaAlineados = [];
                try {
                    const alineacionActual = await AlineacionService.obtenerPorPartido(partido.id);
                    yaAlineados = alineacionActual.map((item) => String(item.idJugador ?? item.jugador?.id ?? ""));
                } catch (error) {
                    console.error("No se pudo consultar la alineación actual del partido:", error);
                }

                const disponibles = jugadores.filter((jugador) => {
                    const idEquipoJugador = String(jugador.idEquipo ?? jugador.equipo?.id ?? "");
                    return idsEquipos.includes(idEquipoJugador) && !yaAlineados.includes(String(jugador.id));
                });

                listaJugadores.innerHTML = disponibles.length > 0
                    ? disponibles.map(filaJugador).join("")
                    : '<p class="empty-state">Los jugadores de ambos equipos ya están alineados.</p>';
            };

            selectPartido.addEventListener("change", actualizarJugadoresDelPartido);

            const closeModal = () => {
                modal.style.display = "none";
                formAlineacion.reset();
                listaJugadores.innerHTML = '<p class="empty-state">Seleccione un partido para ver los jugadores disponibles.</p>';
                setStatus("");
            };

            window.abrirModalAlineacion = (idPartidoPreseleccionado = null) => {
                formAlineacion.reset();
                listaJugadores.innerHTML = '<p class="empty-state">Seleccione un partido para ver los jugadores disponibles.</p>';
                setStatus("");

                if (idPartidoPreseleccionado) {
                    selectPartido.value = String(idPartidoPreseleccionado);
                    actualizarJugadoresDelPartido();
                }

                modal.style.display = "flex";
            };

            btnCerrarModal.addEventListener("click", closeModal);
            const btnCancelarAlineacion = modal.querySelector("#alineacion-cancelar-btn");
            btnCancelarAlineacion.addEventListener("click", closeModal);

            window.addEventListener("click", (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });

            formAlineacion.addEventListener("submit", async (event) => {
                event.preventDefault();

                const idPartido = selectPartido.value ? Number(selectPartido.value) : null;
                if (!idPartido) {
                    setStatus("Debe seleccionar un partido.", "error");
                    return;
                }

                const seleccionados = Array.from(listaJugadores.querySelectorAll(".alineacion-check:checked")).map((checkbox) => {
                    const idJugador = Number(checkbox.value);
                    const selectRol = listaJugadores.querySelector(`.alineacion-rol[data-id="${idJugador}"]`);
                    return { idJugador, titular: selectRol?.value === "titular" };
                });

                if (seleccionados.length === 0) {
                    setStatus("Marca al menos un jugador para alinear.", "error");
                    return;
                }

                setSavingState(true);
                setStatus("");

                // Alineación en lote = varias peticiones POST secuenciales
                // (no hay endpoint de creación masiva en el backend, mismo
                // criterio ya usado por el Sorteo de partidos). Se sigue
                // aunque alguna falle (por ejemplo, cupo de 11 titulares
                // superado a mitad de camino), para no perder las que sí
                // se pudieron guardar, y se informa un resumen al final.
                let exitosos = 0;
                const errores = [];

                for (const seleccion of seleccionados) {
                    try {
                        await AlineacionService.crearAlineacion({
                            idPartido,
                            idJugador: seleccion.idJugador,
                            titular: seleccion.titular
                        });
                        exitosos += 1;
                    } catch (error) {
                        const jugador = jugadores.find((item) => String(item.id) === String(seleccion.idJugador));
                        errores.push(`${jugador?.nombre || `Jugador #${seleccion.idJugador}`}: ${error.message || "no se pudo alinear"}`);
                    }
                }

                setSavingState(false);

                if (exitosos > 0) {
                    mostrarToast(
                        errores.length === 0
                            ? `${exitosos} jugador(es) alineado(s) correctamente.`
                            : `${exitosos} jugador(es) alineado(s). ${errores.length} no se pudo(eron) alinear.`,
                        errores.length === 0 ? "success" : "info"
                    );
                }

                if (errores.length > 0) {
                    setStatus(errores.join(" "), "error");
                }

                if (exitosos > 0) {
                    await onAlineacionGuardada();
                }

                if (errores.length === 0) {
                    formAlineacion.reset();
                    closeModal();
                } else {
                    // Se deja el modal abierto (con el partido ya elegido)
                    // para que se pueda reintentar solo con los jugadores
                    // que fallaron, en vez de perder la selección completa.
                    await actualizarJugadoresDelPartido();
                }
            });
        })
        .catch((error) => console.error("Error cargando el modal de alineación:", error));
}
