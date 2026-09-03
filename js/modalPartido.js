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
// FRONTEND_VISION.md Fase3: "un partido se deberia permitir Editar" - ya
// se agrego PUT /api/partidos en el backend, este modal ahora soporta
// modo edicion igual que Equipo/Jugador (id oculto + abrirModalPartido(partido)).
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
            const modalTitle = modal.querySelector("#partido-modal-title");
            const submitButton = modal.querySelector("#partido-submit-btn");
            const submitText = modal.querySelector("#partido-submit-text");
            const hiddenId = modal.querySelector("#partido-id");
            const selectLocal = modal.querySelector("#partido-local");
            const selectVisitante = modal.querySelector("#partido-visitante");
            const inputFecha = modal.querySelector("#partido-fecha");

            // FRONTEND_API_PROMPT.md: "Fecha no puede ser anterior a hoy". El
            // atributo min bloquea el date picker; validarPartido() además
            // rechaza igual si el navegador no soporta el date picker nativo.
            inputFecha.min = new Date().toISOString().slice(0, 10);

            // FRONTEND_VISION.md Fase3: "se debe permitir seleccionar
            // diferentes equipos entre local y visitante ANTES de continuar
            // con la demas informacion, nunca que sean los mismos equipos".
            // Antes solo se validaba al enviar el formulario; ahora, en
            // cuanto se elige un equipo en un select, se le quita esa opcion
            // al otro select para que ni siquiera se pueda elegir el mismo.
            const refrescarOpciones = () => {
                const idLocal = selectLocal.value;
                const idVisitante = selectVisitante.value;

                selectLocal.innerHTML = '<option value="">Seleccione</option>' +
                    equipos.filter((equipo) => String(equipo.id) !== idVisitante)
                        .map((equipo) => `<option value="${equipo.id}">${equipo.nombre}</option>`).join("");

                selectVisitante.innerHTML = '<option value="">Seleccione</option>' +
                    equipos.filter((equipo) => String(equipo.id) !== idLocal)
                        .map((equipo) => `<option value="${equipo.id}">${equipo.nombre}</option>`).join("");

                selectLocal.value = idLocal;
                selectVisitante.value = idVisitante;
            };

            refrescarOpciones();
            selectLocal.addEventListener("change", refrescarOpciones);
            selectVisitante.addEventListener("change", refrescarOpciones);

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
                hiddenId.value = "";
                modalTitle.textContent = "Programar Partido";
                submitText.textContent = "Guardar";
                refrescarOpciones();
                setStatus("");
            };

            window.abrirModalPartido = (partido = null) => {
                formPartido.reset();

                if (!partido) {
                    hiddenId.value = "";
                    modalTitle.textContent = "Programar Partido";
                    submitText.textContent = "Guardar";
                } else {
                    hiddenId.value = partido.id || "";
                    modalTitle.textContent = "Editar Partido";
                    submitText.textContent = "Actualizar";
                    selectLocal.value = partido.idEquipoLocal ?? partido.equipoLocal?.id ?? "";
                    selectVisitante.value = partido.idEquipoVisitante ?? partido.equipoVisitante?.id ?? "";
                    formPartido.querySelector("#partido-fecha").value = partido.fecha || "";
                    formPartido.querySelector("#partido-hora").value = partido.hora || "";
                    formPartido.querySelector("#partido-goles-local").value = partido.golesLocal ?? 0;
                    formPartido.querySelector("#partido-goles-visitante").value = partido.golesVisitante ?? 0;
                    formPartido.querySelector("#partido-fase").value = partido.fase || "";
                }

                refrescarOpciones();
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
                    id: hiddenId.value ? Number(hiddenId.value) : undefined,
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
                    let resultado;
                    let mensajeExito;

                    if (payload.id) {
                        resultado = await PartidoService.editarPartido(payload);
                        mensajeExito = resultado?.mensaje || "Partido actualizado correctamente.";
                    } else {
                        resultado = await PartidoService.crearPartido(payload);
                        mensajeExito = resultado?.mensaje || "Partido programado correctamente.";
                    }

                    if (resultado) {
                        formPartido.reset();
                        closeModal();
                        mostrarToast(mensajeExito, "success");
                        await onPartidoGuardado();
                    }
                } catch (error) {
                    setStatus(error.message || "Ocurrió un error al guardar el partido.", "error");
                } finally {
                    setSavingState(false);
                }
            });
        })
        .catch((error) => console.error("Error cargando el modal de partido:", error));
}
