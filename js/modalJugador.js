import { JugadorService } from "../services/JugadorService.js";
import { mostrarToast } from "./toast.js";

const validarJugador = (jugador) => {
    const errores = [];

    if (!jugador.nombre || jugador.nombre.trim().length < 2) {
        errores.push("El nombre del jugador es requerido y debe tener al menos 2 caracteres.");
    } else if (jugador.nombre.length > 100) {
        errores.push("El nombre del jugador no puede superar los 100 caracteres.");
    }

    if (!jugador.posicion) {
        errores.push("Debe seleccionar una posición.");
    }

    if (!jugador.edad || Number(jugador.edad) < 1) {
        errores.push("La edad debe ser mayor a 0.");
    }

    if (!jugador.dorsal || Number(jugador.dorsal) < 1) {
        errores.push("El dorsal debe ser mayor a 0.");
    }

    if (!jugador.idEquipo) {
        errores.push("Debe seleccionar un equipo.");
    }

    return errores;
};

// equipos: lista de EquipoDTO ya cargada por jugadores.js, para llenar el
// select del modal sin volver a llamar al backend.
export function inicializarModalJugador({ equipos = [], onJugadorGuardado = () => {} } = {}) {
    const modalContainer = document.getElementById("modal-container");

    if (!modalContainer) {
        console.warn("No se encontró el contenedor del modal de jugador");
        return;
    }

    fetch("components/modal-jugador.html")
        .then((response) => response.text())
        .then((html) => {
            modalContainer.innerHTML = html;

            const modal = document.getElementById("modal-jugador");
            const btnCerrarModal = modal.querySelector(".close");
            const formJugador = modal.querySelector("#form-jugador");
            const formStatus = modal.querySelector("#jugador-form-status");
            const modalTitle = modal.querySelector("#jugador-modal-title");
            const submitButton = modal.querySelector("#jugador-submit-btn");
            const submitText = modal.querySelector("#jugador-submit-text");
            const hiddenId = modal.querySelector("#jugador-id");
            const selectEquipo = modal.querySelector("#jugador-equipo");

            selectEquipo.innerHTML = '<option value="">Seleccione un equipo</option>' +
                equipos.map((equipo) => `<option value="${equipo.id}">${equipo.nombre}</option>`).join("");

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
                formJugador.reset();
                hiddenId.value = "";
                modalTitle.textContent = "Agregar Nuevo Jugador";
                submitText.textContent = "Guardar";
                setStatus("");
            };

            window.abrirModalJugador = (jugador = null) => {
                if (!jugador) {
                    modalTitle.textContent = "Agregar Nuevo Jugador";
                    submitText.textContent = "Guardar";
                    hiddenId.value = "";
                    formJugador.reset();
                } else {
                    modalTitle.textContent = "Editar Jugador";
                    submitText.textContent = "Actualizar";
                    hiddenId.value = jugador.id || "";
                    formJugador.querySelector("#jugador-nombre").value = jugador.nombre || "";
                    formJugador.querySelector("#jugador-posicion").value = jugador.posicion || "";
                    formJugador.querySelector("#jugador-edad").value = jugador.edad ?? "";
                    formJugador.querySelector("#jugador-dorsal").value = jugador.dorsal ?? "";
                    selectEquipo.value = jugador.idEquipo || (jugador.equipo ? jugador.equipo.id : "") || "";
                }

                setStatus("");
                modal.style.display = "flex";
            };

            btnCerrarModal.addEventListener("click", closeModal);
            const btnCancelarJugador = modal.querySelector("#jugador-cancelar-btn");
            btnCancelarJugador.addEventListener("click", closeModal);

            window.addEventListener("click", (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });

            formJugador.addEventListener("submit", async (event) => {
                event.preventDefault();

                const payload = {
                    id: hiddenId.value ? Number(hiddenId.value) : undefined,
                    nombre: formJugador.querySelector("#jugador-nombre").value.trim(),
                    posicion: formJugador.querySelector("#jugador-posicion").value,
                    edad: Number(formJugador.querySelector("#jugador-edad").value),
                    dorsal: Number(formJugador.querySelector("#jugador-dorsal").value),
                    idEquipo: selectEquipo.value ? Number(selectEquipo.value) : null
                };

                const errores = validarJugador(payload);
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
                        resultado = await JugadorService.editarJugador(payload);
                        mensajeExito = resultado?.mensaje || "Jugador actualizado correctamente.";
                    } else {
                        resultado = await JugadorService.crearJugador(payload);
                        mensajeExito = resultado?.mensaje || "Jugador creado correctamente.";
                    }

                    if (resultado) {
                        // FRONTEND_VISION.md Fase2 (bonus): si adjuntaron una
                        // foto, se sube DESPUES de crear/editar (recién ahí
                        // se conoce el id del jugador), igual que el escudo
                        // de equipo en modalEquipo.js.
                        const inputFoto = formJugador.querySelector("#jugador-foto-archivo");
                        const foto = inputFoto?.files?.[0];
                        if (foto && resultado.id) {
                            try {
                                await JugadorService.subirImagenJugador(resultado.id, foto);
                            } catch (errorFoto) {
                                mostrarToast(errorFoto.message || "El jugador se guardó, pero no se pudo subir la foto.", "error");
                            }
                        }

                        formJugador.reset();
                        closeModal();
                        mostrarToast(mensajeExito, "success");
                        await onJugadorGuardado();
                    }
                } catch (error) {
                    setStatus(error.message || "Ocurrió un error al guardar el jugador.", "error");
                } finally {
                    setSavingState(false);
                }
            });
        })
        .catch((error) => console.error("Error cargando el modal de jugador:", error));
}
