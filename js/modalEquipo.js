import { EquipoService } from "../services/EquipoService.js";
import { mostrarToast } from "./toast.js";

const validarEquipo = (equipo) => {
    const errores = [];

    if (!equipo.nombre || equipo.nombre.trim().length < 2) {
        errores.push("El campo nombre es requerido y debe tener al menos 2 caracteres.");
    } else if (equipo.nombre.length > 100) {
        errores.push("El campo nombre no puede superar los 100 caracteres.");
    }

    if (!equipo.directorTecnico || equipo.directorTecnico.trim().length < 2) {
        errores.push("El campo director técnico es requerido.");
    } else if (equipo.directorTecnico.length > 100) {
        errores.push("El campo director técnico no puede superar los 100 caracteres.");
    }

    if (!equipo.tipoClasificacion || equipo.tipoClasificacion.trim().length === 0) {
        errores.push("Debe seleccionar un tipo de clasificación.");
    } else if (equipo.tipoClasificacion.length > 50) {
        errores.push("El tipo de clasificación no puede superar los 50 caracteres.");
    }

    if (equipo.imagenUrl && equipo.imagenUrl.trim()) {
        const urlValida = /^(https?:\/\/)[^\s/$.?#].[\S]*$/i;
        if (!urlValida.test(equipo.imagenUrl.trim())) {
            errores.push("La URL de la imagen no es válida.");
        }
    }

    if (equipo.titulos !== "" && equipo.titulos !== null && equipo.titulos !== undefined) {
        const titulos = Number(equipo.titulos);
        if (Number.isNaN(titulos) || titulos < 0) {
            errores.push("Los títulos deben ser un número mayor o igual a 0.");
        }
    }

    return errores;
};

export function inicializarModalEquipo({ onEquipoGuardado = () => {} } = {}) {
    const modalContainer = document.getElementById("modal-container");

    if (!modalContainer) {
        console.warn("No se encontró el contenedor del modal");
        return;
    }

    fetch("components/modal-equipo.html")
        .then((response) => response.text())
        .then((html) => {
            modalContainer.innerHTML = html;

            const modal = document.getElementById("modal-equipo");
            const btnCerrarModal = modal.querySelector(".close");
            const formEquipo = modal.querySelector("#form-equipo");
            const formStatus = modal.querySelector("#equipo-form-status");
            const modalTitle = modal.querySelector("#equipo-modal-title");
            const submitButton = modal.querySelector("#equipo-submit-btn");
            const submitText = modal.querySelector("#equipo-submit-text");
            const hiddenId = modal.querySelector("#equipo-id");

            if (!modal || !btnCerrarModal || !formEquipo) {
                console.error("El modal o los botones no se encontraron.");
                return;
            }

            modal.style.display = "none";

            const setStatus = (message, type = "info") => {
                if (!formStatus) return;
                formStatus.textContent = message || "";
                formStatus.className = `form-status ${type}`;
            };

            const setSavingState = (isSaving) => {
                if (!submitButton || !submitText) return;
                submitButton.disabled = isSaving;
                submitButton.classList.toggle("is-loading", isSaving);
                submitText.textContent = isSaving ? "Guardando..." : "Guardar";
            };

            const closeModal = () => {
                modal.style.display = "none";
                formEquipo.reset();
                hiddenId.value = "";
                modalTitle.textContent = "Agregar Nuevo Equipo";
                submitText.textContent = "Guardar";
                setStatus("");
            };

            window.abrirModalEquipo = (equipo = null) => {
                if (!equipo) {
                    modalTitle.textContent = "Agregar Nuevo Equipo";
                    submitText.textContent = "Guardar";
                    hiddenId.value = "";
                    formEquipo.reset();
                } else {
                    modalTitle.textContent = "Editar Equipo";
                    submitText.textContent = "Actualizar";
                    hiddenId.value = equipo.id || "";
                    formEquipo.querySelector("#nombre").value = equipo.nombre || "";
                    formEquipo.querySelector("#dt").value = equipo.directorTecnico || "";
                    formEquipo.querySelector("#escudo").value = equipo.imagenUrl || "";
                    formEquipo.querySelector("#titulos").value = equipo.titulos ?? 0;
                    formEquipo.querySelector("#tipoClasificacion").value = equipo.tipoClasificacion || "";
                }

                setStatus("");
                modal.style.display = "flex";
            };

            btnCerrarModal.addEventListener("click", closeModal);
            const btnCancelarEquipo = modal.querySelector("#equipo-cancelar-btn");
            btnCancelarEquipo.addEventListener("click", closeModal);

            window.addEventListener("click", (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });

            formEquipo.addEventListener("submit", async (event) => {
                event.preventDefault();

                const payload = {
                    id: hiddenId.value ? Number(hiddenId.value) : undefined,
                    nombre: formEquipo.querySelector("#nombre").value.trim(),
                    directorTecnico: formEquipo.querySelector("#dt").value.trim(),
                    imagenUrl: formEquipo.querySelector("#escudo").value.trim(),
                    titulos: formEquipo.querySelector("#titulos").value === "" ? 0 : Number(formEquipo.querySelector("#titulos").value),
                    tipoClasificacion: formEquipo.querySelector("#tipoClasificacion").value.trim()
                };

                const errores = validarEquipo(payload);
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
                        resultado = await EquipoService.editarEquipo(payload);
                        mensajeExito = resultado?.mensaje || "Equipo actualizado correctamente.";
                    } else {
                        resultado = await EquipoService.crearEquipo(payload);
                        mensajeExito = resultado?.mensaje || "Equipo creado correctamente.";
                    }

                    if (resultado) {
                        formEquipo.reset();
                        closeModal();
                        mostrarToast(mensajeExito, "success");
                        await onEquipoGuardado();
                    }
                } catch (error) {
                    setStatus(error.message || "Ocurrió un error al guardar el equipo.", "error");
                } finally {
                    setSavingState(false);
                }
            });
        })
        .catch((error) => console.error("Error cargando el modal:", error));
}

