import { TournamentService } from "../services/TournamentService.js";
import { mostrarToast } from "./toast.js";

// Modal para crear o editar (solo en borrador) un torneo.
// window.abrirModalTorneo()        -> crear
// window.abrirModalTorneo(torneo)  -> editar nombre y formato
export function inicializarModalTorneo({ onTorneoGuardado = () => {} } = {}) {
    const contenedor = document.getElementById("modal-torneo-container");
    if (!contenedor) {
        console.warn("No se encontró el contenedor del modal de torneo");
        return;
    }

    fetch("components/modal-torneo.html")
        .then((response) => response.text())
        .then((html) => {
            contenedor.innerHTML = html;

            const modal = document.getElementById("modal-torneo");
            const form = modal.querySelector("#form-torneo");
            const estado = modal.querySelector("#torneo-form-status");
            const titulo = modal.querySelector("#torneo-modal-title");
            const inputId = modal.querySelector("#torneo-id");
            const inputNombre = modal.querySelector("#torneo-nombre");
            const selectFormato = modal.querySelector("#torneo-formato");
            const submit = modal.querySelector("#torneo-submit-btn");
            const submitTexto = modal.querySelector("#torneo-submit-text");

            modal.style.display = "none";

            const setEstado = (mensaje, tipo = "info") => {
                estado.textContent = mensaje || "";
                estado.className = `form-status ${tipo}`;
            };

            const cerrar = () => {
                modal.style.display = "none";
                form.reset();
                inputId.value = "";
                setEstado("");
            };

            window.abrirModalTorneo = (torneo = null) => {
                form.reset();
                setEstado("");
                inputId.value = torneo?.id ?? "";
                titulo.textContent = torneo ? "Editar torneo" : "Crear torneo";
                submitTexto.textContent = torneo ? "Actualizar" : "Crear";
                if (torneo) {
                    inputNombre.value = torneo.name || "";
                    selectFormato.value = torneo.format || "";
                }
                modal.style.display = "flex";
                inputNombre.focus();
            };

            modal.querySelector(".close").addEventListener("click", cerrar);
            modal.querySelector("#torneo-cancelar-btn").addEventListener("click", cerrar);
            window.addEventListener("click", (evento) => {
                if (evento.target === modal) cerrar();
            });

            form.addEventListener("submit", async (evento) => {
                evento.preventDefault();

                const datos = { name: inputNombre.value.trim(), format: selectFormato.value };
                if (datos.name.length < 3 || datos.name.length > 100) {
                    setEstado("El nombre del torneo debe tener entre 3 y 100 caracteres.", "error");
                    return;
                }
                if (!datos.format) {
                    setEstado("Debes seleccionar el formato del torneo.", "error");
                    return;
                }

                submit.disabled = true;
                submitTexto.textContent = "Guardando...";
                setEstado("");
                try {
                    const id = inputId.value;
                    const guardado = id
                        ? await TournamentService.editarTorneo(id, datos)
                        : await TournamentService.crearTorneo(datos);
                    cerrar();
                    mostrarToast(id ? "Torneo actualizado correctamente." : "Torneo creado en borrador.", "success");
                    await onTorneoGuardado(guardado);
                } catch (error) {
                    setEstado(error.message || "No se pudo guardar el torneo.", "error");
                } finally {
                    submit.disabled = false;
                    submitTexto.textContent = inputId.value ? "Actualizar" : "Crear";
                }
            });
        })
        .catch((error) => console.error("Error cargando el modal de torneo:", error));
}
