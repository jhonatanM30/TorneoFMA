import { JugadorService } from "../services/JugadorService.js";

const MAX_FILAS = 50;

function crearFila(indice) {
    const fila = document.createElement("div");
    fila.className = "lote-fila";
    fila.dataset.indice = indice;
    fila.innerHTML = `
        <input type="text" class="lote-nombre" placeholder="Nombre" maxlength="100" required>
        <select class="lote-posicion" required>
            <option value="">Posición</option>
            <option value="PORTERO">Portero</option>
            <option value="DEFENSA">Defensa</option>
            <option value="MEDIOCAMPISTA">Mediocampista</option>
            <option value="DELANTERO">Delantero</option>
        </select>
        <input type="number" class="lote-edad" placeholder="Edad" min="1" required>
        <input type="number" class="lote-dorsal" placeholder="Dorsal" min="1" required>
        <button type="button" class="btn-quitar-fila" title="Quitar jugador" aria-label="Quitar jugador">&times;</button>
    `;
    return fila;
}

// equipos: lista de EquipoDTO ya cargada por jugadores.js.
export function inicializarModalJugadorLote({ equipos = [], onLoteGuardado = () => {} } = {}) {
    const modalContainer = document.getElementById("modal-lote-container");

    if (!modalContainer) {
        console.warn("No se encontró el contenedor del modal de carga en lote");
        return;
    }

    fetch("components/modal-jugador-lote.html")
        .then((response) => response.text())
        .then((html) => {
            modalContainer.innerHTML = html;

            const modal = document.getElementById("modal-jugador-lote");
            const btnCerrarModal = modal.querySelector(".close");
            const form = modal.querySelector("#form-jugador-lote");
            const filasContainer = modal.querySelector("#lote-filas");
            const btnAgregarFila = modal.querySelector("#lote-agregar-fila");
            const selectEquipo = modal.querySelector("#lote-equipo");
            const formStatus = modal.querySelector("#lote-form-status");
            const resultadosContainer = modal.querySelector("#lote-resultados");
            const submitButton = modal.querySelector("#lote-submit-btn");
            const submitText = modal.querySelector("#lote-submit-text");

            selectEquipo.innerHTML = '<option value="">Seleccione un equipo</option>' +
                equipos.map((equipo) => `<option value="${equipo.id}">${equipo.nombre}</option>`).join("");

            let contadorFilas = 0;

            const setStatus = (message, type = "info") => {
                formStatus.textContent = message || "";
                formStatus.className = `form-status ${type}`;
            };

            const agregarFila = () => {
                if (filasContainer.children.length >= MAX_FILAS) {
                    setStatus(`El lote no puede tener más de ${MAX_FILAS} jugadores.`, "error");
                    return;
                }
                contadorFilas += 1;
                filasContainer.appendChild(crearFila(contadorFilas));
            };

            filasContainer.addEventListener("click", (event) => {
                if (event.target.classList.contains("btn-quitar-fila")) {
                    if (filasContainer.children.length > 1) {
                        event.target.closest(".lote-fila").remove();
                    }
                }
            });

            btnAgregarFila.addEventListener("click", agregarFila);

            const resetModal = () => {
                filasContainer.innerHTML = "";
                contadorFilas = 0;
                agregarFila();
                selectEquipo.value = "";
                resultadosContainer.innerHTML = "";
                setStatus("");
            };

            const closeModal = () => {
                modal.style.display = "none";
                resetModal();
            };

            window.abrirModalJugadorLote = () => {
                resetModal();
                modal.style.display = "flex";
            };

            btnCerrarModal.addEventListener("click", closeModal);
            const btnCancelarLote = modal.querySelector("#lote-cancelar-btn");
            btnCancelarLote.addEventListener("click", closeModal);

            window.addEventListener("click", (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });

            form.addEventListener("submit", async (event) => {
                event.preventDefault();

                const idEquipo = selectEquipo.value ? Number(selectEquipo.value) : null;
                if (!idEquipo) {
                    setStatus("Debe seleccionar el equipo para el que se registran los jugadores.", "error");
                    return;
                }

                const filas = Array.from(filasContainer.querySelectorAll(".lote-fila"));
                const jugadores = filas.map((fila) => ({
                    nombre: fila.querySelector(".lote-nombre").value.trim(),
                    posicion: fila.querySelector(".lote-posicion").value,
                    edad: Number(fila.querySelector(".lote-edad").value),
                    dorsal: Number(fila.querySelector(".lote-dorsal").value),
                    idEquipo
                }));

                const filasIncompletas = jugadores.some((j) => !j.nombre || !j.posicion || !j.edad || !j.dorsal);
                if (filasIncompletas) {
                    setStatus("Completa nombre, posición, edad y dorsal en todas las filas (o quítalas si no las vas a usar).", "error");
                    return;
                }

                submitButton.disabled = true;
                submitText.textContent = "Guardando...";
                setStatus("");
                resultadosContainer.innerHTML = "";

                try {
                    const respuesta = await JugadorService.crearJugadoresEnLote(jugadores);

                    resultadosContainer.innerHTML = respuesta.resultados.map((item) => {
                        const nombreFila = jugadores[item.indice]?.nombre || `Fila ${item.indice + 1}`;
                        if (item.exito) {
                            return `<div class="lote-resultado-item exito">✔ ${nombreFila}: creado correctamente.</div>`;
                        }
                        return `<div class="lote-resultado-item error">✘ ${nombreFila}: ${item.error}</div>`;
                    }).join("");

                    setStatus(`Procesados ${respuesta.total}: ${respuesta.exitosos} creados, ${respuesta.fallidos} con error.`,
                        respuesta.fallidos > 0 ? "error" : "success");

                    if (respuesta.exitosos > 0) {
                        await onLoteGuardado();
                    }
                } catch (error) {
                    setStatus(error.message || "Ocurrió un error al guardar el lote.", "error");
                } finally {
                    submitButton.disabled = false;
                    submitText.textContent = "Guardar lote";
                }
            });
        })
        .catch((error) => console.error("Error cargando el modal de carga en lote:", error));
}
