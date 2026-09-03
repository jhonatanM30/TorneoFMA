import { AlineacionService } from "../services/AlineacionService.js";
import { mostrarToast } from "./toast.js";

const etiquetaPartido = (partido) => {
    const local = partido.equipoLocal?.nombre || "Local";
    const visitante = partido.equipoVisitante?.nombre || "Visitante";
    return `${local} vs ${visitante} (${partido.fecha || "sin fecha"})`;
};

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
            const selectJugador = modal.querySelector("#alineacion-jugador");
            const checkTitular = modal.querySelector("#alineacion-titular");

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
                submitText.textContent = isSaving ? "Guardando..." : "Guardar";
            };

            // Al elegir el partido: limita el select de jugador a los dos
            // equipos que juegan ese partido y, además, excluye a los que ya
            // están alineados en él (el backend igual lo rechazaría por
            // duplicado, pero así se evita el viaje al servidor de una vez).
            const actualizarJugadoresDelPartido = async () => {
                const idPartido = selectPartido.value;
                const partido = partidos.find((item) => String(item.id) === idPartido);

                if (!partido) {
                    selectJugador.innerHTML = '<option value="">Seleccione un partido primero</option>';
                    selectJugador.disabled = true;
                    return;
                }

                selectJugador.innerHTML = '<option value="">Cargando jugadores...</option>';
                selectJugador.disabled = true;

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

                selectJugador.disabled = false;
                selectJugador.innerHTML = disponibles.length > 0
                    ? '<option value="">Seleccione un jugador</option>' +
                        disponibles.map((jugador) => `<option value="${jugador.id}">${jugador.nombre} (${jugador.equipo?.nombre || ""})</option>`).join("")
                    : '<option value="">Los jugadores de ambos equipos ya están alineados</option>';
            };

            selectPartido.addEventListener("change", actualizarJugadoresDelPartido);

            const closeModal = () => {
                modal.style.display = "none";
                formAlineacion.reset();
                selectJugador.innerHTML = '<option value="">Seleccione un partido primero</option>';
                selectJugador.disabled = true;
                setStatus("");
            };

            window.abrirModalAlineacion = (idPartidoPreseleccionado = null) => {
                formAlineacion.reset();
                selectJugador.innerHTML = '<option value="">Seleccione un partido primero</option>';
                selectJugador.disabled = true;
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

                const payload = {
                    idPartido: selectPartido.value ? Number(selectPartido.value) : null,
                    idJugador: selectJugador.value ? Number(selectJugador.value) : null,
                    titular: checkTitular.checked
                };

                if (!payload.idPartido || !payload.idJugador) {
                    setStatus("Debe seleccionar un partido y un jugador.", "error");
                    return;
                }

                setSavingState(true);
                setStatus("");

                try {
                    const resultado = await AlineacionService.crearAlineacion(payload);

                    if (resultado) {
                        formAlineacion.reset();
                        closeModal();
                        mostrarToast(resultado?.mensaje || "Jugador alineado correctamente.", "success");
                        await onAlineacionGuardada();
                    }
                } catch (error) {
                    setStatus(error.message || "Ocurrió un error al registrar la alineación.", "error");
                } finally {
                    setSavingState(false);
                }
            });
        })
        .catch((error) => console.error("Error cargando el modal de alineación:", error));
}
