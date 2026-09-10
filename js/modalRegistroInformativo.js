import { RegistroInformativoService } from "../services/RegistroInformativoService.js";
import { mostrarToast } from "./toast.js";

const validarRegistro = (registro) => {
    const errores = [];

    if (!registro.titulo || !registro.titulo.trim()) {
        errores.push("El título es obligatorio.");
    }

    if (!registro.contenido || !registro.contenido.trim()) {
        errores.push("El contenido es obligatorio.");
    }

    return errores;
};

// Hallazgo post-despliegue (fase9): "deberia permitir editar". El modal
// ahora soporta modo edición igual que Equipo/Jugador/Partido (id oculto
// + abrirModalRegistroInformativo(registro)); la fecha de publicación
// original no se toca desde acá (la conserva el backend).
export function inicializarModalRegistroInformativo({ onRegistroGuardado = () => {} } = {}) {
    const modalContainer = document.getElementById("modal-container");

    if (!modalContainer) {
        console.warn("No se encontró el contenedor del modal de registro informativo");
        return;
    }

    fetch("components/modal-registro-informativo.html")
        .then((response) => response.text())
        .then((html) => {
            modalContainer.innerHTML = html;

            const modal = document.getElementById("modal-registro-informativo");
            const btnCerrarModal = modal.querySelector(".close");
            const formRegistro = modal.querySelector("#form-registro-informativo");
            const formStatus = modal.querySelector("#registro-form-status");
            const modalTitle = modal.querySelector("#registro-modal-title");
            const submitButton = modal.querySelector("#registro-submit-btn");
            const submitText = modal.querySelector("#registro-submit-text");
            const hiddenId = modal.querySelector("#registro-id");
            const inputTitulo = modal.querySelector("#registro-titulo");
            const inputContenido = modal.querySelector("#registro-contenido");

            modal.style.display = "none";

            const setStatus = (message, type = "info") => {
                formStatus.textContent = message || "";
                formStatus.className = `form-status ${type}`;
            };

            const setSavingState = (isSaving) => {
                submitButton.disabled = isSaving;
                submitButton.classList.toggle("is-loading", isSaving);
                submitText.textContent = isSaving ? "Guardando..." : (hiddenId.value ? "Actualizar" : "Guardar");
            };

            const closeModal = () => {
                modal.style.display = "none";
                formRegistro.reset();
                hiddenId.value = "";
                modalTitle.textContent = "Nuevo registro informativo";
                submitText.textContent = "Guardar";
                setStatus("");
            };

            window.abrirModalRegistroInformativo = (registro = null) => {
                formRegistro.reset();
                setStatus("");

                if (!registro) {
                    hiddenId.value = "";
                    modalTitle.textContent = "Nuevo registro informativo";
                    submitText.textContent = "Guardar";
                } else {
                    hiddenId.value = registro.id || "";
                    modalTitle.textContent = "Editar registro informativo";
                    submitText.textContent = "Actualizar";
                    inputTitulo.value = registro.titulo || "";
                    inputContenido.value = registro.contenido || "";
                }

                modal.style.display = "flex";
            };

            btnCerrarModal.addEventListener("click", closeModal);
            const btnCancelarRegistro = modal.querySelector("#registro-cancelar-btn");
            btnCancelarRegistro.addEventListener("click", closeModal);

            window.addEventListener("click", (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });

            formRegistro.addEventListener("submit", async (event) => {
                event.preventDefault();

                const payload = {
                    titulo: inputTitulo.value.trim(),
                    contenido: inputContenido.value.trim()
                };

                const errores = validarRegistro(payload);
                if (errores.length > 0) {
                    setStatus(errores[0], "error");
                    return;
                }

                setSavingState(true);
                setStatus("");

                try {
                    let resultado;
                    let mensajeExito;

                    if (hiddenId.value) {
                        resultado = await RegistroInformativoService.editarRegistro(hiddenId.value, payload);
                        mensajeExito = "Registro informativo actualizado correctamente.";
                    } else {
                        resultado = await RegistroInformativoService.crearRegistro(payload);
                        mensajeExito = "Registro informativo creado correctamente.";
                    }

                    if (resultado) {
                        formRegistro.reset();
                        closeModal();
                        mostrarToast(mensajeExito, "success");
                        await onRegistroGuardado();
                    }
                } catch (error) {
                    setStatus(error.message || "Ocurrió un error al guardar el registro informativo.", "error");
                } finally {
                    setSavingState(false);
                }
            });
        })
        .catch((error) => console.error("Error cargando el modal de registro informativo:", error));
}
