import { EstadisticaService } from "../services/EstadisticaService.js";
import { mostrarToast } from "./toast.js";
import { AlineacionService } from "../services/AlineacionService.js";

const validarEstadistica = (estadistica) => {
    const errores = [];

    if (!estadistica.idPartido) {
        errores.push("Debe seleccionar un partido.");
    }

    if (!estadistica.idJugador) {
        errores.push("Debe seleccionar un jugador.");
    }

    ["goles", "tarjetasAmarillas", "tarjetasRojas", "asistencias"].forEach((campo) => {
        if (estadistica[campo] === null || estadistica[campo] === undefined || Number(estadistica[campo]) < 0) {
            errores.push("Los valores numéricos no pueden ser negativos.");
        }
    });

    return errores;
};

const etiquetaPartido = (partido) => {
    const local = partido.equipoLocal?.nombre || "Local";
    const visitante = partido.equipoVisitante?.nombre || "Visitante";
    return `${local} vs ${visitante} (${partido.fecha || "sin fecha"})`;
};

// partidos/jugadores: listas ya cargadas por estadisticas.js, para no volver
// a llamar al backend al abrir el modal.
//
// El select de Jugador, al elegir un partido, se limita a quienes estén
// REALMENTE alineados en ese partido (GET /api/alineaciones/partido/{id}),
// tal como pedía FRONTEND_API_PROMPT.md ("Solo permitir registrar
// jugadores que estén alineados en el partido"). Si el partido todavía no
// tiene alineación cargada, el select queda vacío con un mensaje que
// indica ir primero a la pantalla de Alineaciones.
export function inicializarModalEstadistica({ partidos = [], jugadores = [], onEstadisticaGuardada = () => {} } = {}) {
    const modalContainer = document.getElementById("modal-container");

    if (!modalContainer) {
        console.warn("No se encontró el contenedor del modal de estadística");
        return;
    }

    fetch("components/modal-estadistica.html")
        .then((response) => response.text())
        .then((html) => {
            modalContainer.innerHTML = html;

            const modal = document.getElementById("modal-estadistica");
            const btnCerrarModal = modal.querySelector(".close");
            const formEstadistica = modal.querySelector("#form-estadistica");
            const formStatus = modal.querySelector("#estadistica-form-status");
            const submitButton = modal.querySelector("#estadistica-submit-btn");
            const submitText = modal.querySelector("#estadistica-submit-text");
            const selectPartido = modal.querySelector("#estadistica-partido");
            const selectJugador = modal.querySelector("#estadistica-jugador");

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

            const actualizarJugadoresDelPartido = async () => {
                const idPartido = selectPartido.value;
                const partido = partidos.find((item) => String(item.id) === idPartido);

                if (!partido) {
                    selectJugador.innerHTML = '<option value="">Seleccione un partido primero</option>';
                    selectJugador.disabled = true;
                    return;
                }

                selectJugador.innerHTML = '<option value="">Cargando jugadores alineados...</option>';
                selectJugador.disabled = true;

                let alineados = [];
                try {
                    alineados = await AlineacionService.obtenerPorPartido(partido.id);
                } catch (error) {
                    console.error("No se pudo consultar la alineación del partido:", error);
                }

                const jugadoresDelPartido = alineados.map((item) => {
                    return item.jugador || jugadores.find((jugador) => String(jugador.id) === String(item.idJugador));
                }).filter(Boolean);

                selectJugador.disabled = false;
                selectJugador.innerHTML = jugadoresDelPartido.length > 0
                    ? '<option value="">Seleccione un jugador</option>' +
                        jugadoresDelPartido.map((jugador) => `<option value="${jugador.id}">${jugador.nombre} (${jugador.equipo?.nombre || ""})</option>`).join("")
                    : '<option value="">Este partido todavía no tiene jugadores alineados (ver Alineaciones)</option>';
            };

            selectPartido.addEventListener("change", actualizarJugadoresDelPartido);

            const closeModal = () => {
                modal.style.display = "none";
                formEstadistica.reset();
                selectJugador.innerHTML = '<option value="">Seleccione un partido primero</option>';
                selectJugador.disabled = true;
                setStatus("");
            };

            window.abrirModalEstadistica = () => {
                formEstadistica.reset();
                selectJugador.innerHTML = '<option value="">Seleccione un partido primero</option>';
                selectJugador.disabled = true;
                setStatus("");
                modal.style.display = "flex";
            };

            btnCerrarModal.addEventListener("click", closeModal);
            const btnCancelarEstadistica = modal.querySelector("#estadistica-cancelar-btn");
            btnCancelarEstadistica.addEventListener("click", closeModal);

            window.addEventListener("click", (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });

            formEstadistica.addEventListener("submit", async (event) => {
                event.preventDefault();

                const payload = {
                    idPartido: selectPartido.value ? Number(selectPartido.value) : null,
                    idJugador: selectJugador.value ? Number(selectJugador.value) : null,
                    goles: Number(formEstadistica.querySelector("#estadistica-goles").value),
                    tarjetasAmarillas: Number(formEstadistica.querySelector("#estadistica-amarillas").value),
                    tarjetasRojas: Number(formEstadistica.querySelector("#estadistica-rojas").value),
                    asistencias: Number(formEstadistica.querySelector("#estadistica-asistencias").value)
                };

                const errores = validarEstadistica(payload);
                if (errores.length > 0) {
                    setStatus(errores[0], "error");
                    return;
                }

                setSavingState(true);
                setStatus("");

                try {
                    const resultado = await EstadisticaService.crearEstadistica(payload);

                    if (resultado) {
                        formEstadistica.reset();
                        closeModal();
                        mostrarToast("Estadística registrada correctamente.", "success");
                        await onEstadisticaGuardada();
                    }
                } catch (error) {
                    setStatus(error.message || "Ocurrió un error al registrar la estadística.", "error");
                } finally {
                    setSavingState(false);
                }
            });
        })
        .catch((error) => console.error("Error cargando el modal de estadística:", error));
}
