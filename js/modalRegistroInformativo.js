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

// Modal de creación de registros informativos (Fase 6 - Configuración).
// Solo crea: el backend no expone edición, y FRONTEND_VISION.md pide
// crear y eliminar, no editar.
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
            const submitButton = modal.querySelector("#registro-submit-btn");
            const submitText = modal.querySelector("#registro-submit-text");
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
                submitText.textContent = isSaving ? "Guardando..." : "Guardar";
            };

            const closeModal = () => {
                modal.style.display = "none";
                formRegistro.reset();
                setStatus("");
            };

            window.abrirModalRegistroInformativo = () => {
                formRegistro.reset();
                setStatus("");
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
                    const resultado = await RegistroInformativoService.crearRegistro(payload);

                    if (resultado) {
                        formRegistro.reset();
                        closeModal();
                        mostrarToast("Registro informativo creado correctamente.", "success");
                        await onRegistroGuardado();
                    }
                } catch (error) {
                    setStatus(error.message || "Ocurrió un error al crear el registro informativo.", "error");
                } finally {
                    setSavingState(false);
                }
            });
        })
        .catch((error) => console.error("Error cargando el modal de registro informativo:", error));
}
