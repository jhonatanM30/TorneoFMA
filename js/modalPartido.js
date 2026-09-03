import { PartidoService } from "../services/PartidoService.js";
import { mostrarToast } from "./toast.js";

const validarPartido = (partido) => {
    const errores = [];

    if (!partido.idEquipoLocal) {
        errores.push("Debe seleccionar el equipo local.");
    }

    if (!partido.idEquipoVisitante) {
        errores.push("Debe seleccionar el equipo visitante.");
    }

    if (partido.idEquipoLocal && partido.idEquipoVisitante && partido.idEquipoLocal === partido.idEquipoVisitante) {
        errores.push("El equipo local y el visitante deben ser diferentes.");
    }

    const hoy = new Date().toISOString().slice(0, 10);
    if (!partido.fecha) {
        errores.push("Debe indicar la fecha del partido.");
    } else if (partido.fecha < hoy) {
        errores.push("La fecha del partido no puede ser anterior a hoy.");
    }

    if (!partido.hora) {
        errores.push("Debe indicar la hora del partido.");
    }

    if (partido.golesLocal === null || partido.golesLocal === undefined || Number(partido.golesLocal) < 0) {
        errores.push("Los goles del equipo local no pueden ser negativos.");
    }

    if (partido.golesVisitante === null || partido.golesVisitante === undefined || Number(partido.golesVisitante) < 0) {
        errores.push("Los goles del equipo visitante no pueden ser negativos.");
    }

    return errores;
};

// equipos: lista de EquipoDTO ya cargada por partidos.js.
// El backend (PartidoController) solo expone crear y eliminar, no editar,
// así que este modal (a diferencia de Equipo/Jugador) no tiene modo edición.
export function inicializarModalPartido({ equipos = [], onPartidoGuardado = () => {} } = {}) {
    const modalContainer = document.getElementById("modal-container");

    if (!modalContainer) {
        console.warn("No se encontró el contenedor del modal de partido");
        return;
    }

    fetch("components/modal-partido.html")
        .then((response) => response.text())
        .then((html) => {
            modalContainer.innerHTML = html;

            const modal = document.getElementById("modal-partido");
            const btnCerrarModal = modal.querySelector(".close");
            const formPartido = modal.querySelector("#form-partido");
            const formStatus = modal.querySelector("#partido-form-status");
            const submitButton = modal.querySelector("#partido-submit-btn");
            const submitText = modal.querySelector("#partido-submit-text");
            const selectLocal = modal.querySelector("#partido-local");
            const selectVisitante = modal.querySelector("#partido-visitante");
            const inputFecha = modal.querySelector("#partido-fecha");

            // FRONTEND_API_PROMPT.md: "Fecha no puede ser anterior a hoy". El
            // atributo min bloquea el date picker; validarPartido() además
            // rechaza igual si el navegador no soporta el date picker nativo.
            inputFecha.min = new Date().toISOString().slice(0, 10);

            const opcionesEquipos = equipos.map((equipo) => `<option value="${equipo.id}">${equipo.nombre}</option>`).join("");
            selectLocal.innerHTML = '<option value="">Seleccione</option>' + opcionesEquipos;
            selectVisitante.innerHTML = '<option value="">Seleccione</option>' + opcionesEquipos;

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

            const closeModal = () => {
                modal.style.display = "none";
                formPartido.reset();
                setStatus("");
            };

            window.abrirModalPartido = () => {
                formPartido.reset();
                setStatus("");
                modal.style.display = "flex";
            };

            btnCerrarModal.addEventListener("click", closeModal);
            const btnCancelarPartido = modal.querySelector("#partido-cancelar-btn");
            btnCancelarPartido.addEventListener("click", closeModal);

            window.addEventListener("click", (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });

            formPartido.addEventListener("submit", async (event) => {
                event.preventDefault();

                const payload = {
                    idEquipoLocal: selectLocal.value ? Number(selectLocal.value) : null,
                    idEquipoVisitante: selectVisitante.value ? Number(selectVisitante.value) : null,
                    fecha: formPartido.querySelector("#partido-fecha").value,
                    hora: formPartido.querySelector("#partido-hora").value,
                    golesLocal: Number(formPartido.querySelector("#partido-goles-local").value),
                    golesVisitante: Number(formPartido.querySelector("#partido-goles-visitante").value),
                    fase: formPartido.querySelector("#partido-fase").value
                };

                const errores = validarPartido(payload);
                if (errores.length > 0) {
                    setStatus(errores[0], "error");
                    return;
                }

                setSavingState(true);
                setStatus("");

                try {
                    const resultado = await PartidoService.crearPartido(payload);

                    if (resultado) {
                        formPartido.reset();
                        closeModal();
                        mostrarToast(resultado?.mensaje || "Partido programado correctamente.", "success");
                        await onPartidoGuardado();
                    }
                } catch (error) {
                    setStatus(error.message || "Ocurrió un error al programar el partido.", "error");
                } finally {
                    setSavingState(false);
                }
            });
        })
        .catch((error) => console.error("Error cargando el modal de partido:", error));
}
