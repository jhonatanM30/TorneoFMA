import { TransferService } from "../services/TransferService.js";
import { mostrarToast } from "./toast.js";
import { formatearCosto } from "./formatos.js";
import { Auth } from "./auth.js";

// Modal "Solicitar traspaso". equipos: lista de EquipoDTO ya cargada por
// jugadores.js (se excluye el equipo actual del jugador del select).
export function inicializarModalTraspaso({ equipos = [], onTraspasoSolicitado = () => {} } = {}) {
    const modalContainer = document.getElementById("modal-traspaso-container");

    if (!modalContainer) {
        console.warn("No se encontró el contenedor del modal de traspaso");
        return;
    }

    fetch("components/modal-traspaso.html")
        .then((response) => response.text())
        .then((html) => {
            modalContainer.innerHTML = html;

            const modal = document.getElementById("modal-traspaso");
            const form = modal.querySelector("#form-traspaso");
            const formStatus = modal.querySelector("#traspaso-form-status");
            const selectDestino = modal.querySelector("#traspaso-equipo-destino");
            const inputDorsal = modal.querySelector("#traspaso-dorsal");
            const submitButton = modal.querySelector("#traspaso-submit-btn");
            const submitText = modal.querySelector("#traspaso-submit-text");

            let jugadorActual = null;

            modal.style.display = "none";

            const setStatus = (message, type = "info") => {
                formStatus.textContent = message || "";
                formStatus.className = `form-status ${type}`;
            };

            const setSavingState = (isSaving) => {
                submitButton.disabled = isSaving;
                submitButton.classList.toggle("is-loading", isSaving);
                submitText.textContent = isSaving ? "Solicitando..." : "Solicitar";
            };

            const closeModal = () => {
                modal.style.display = "none";
                form.reset();
                inputDorsal.classList.remove("input-invalido");
                jugadorActual = null;
                setStatus("");
            };

            window.abrirModalTraspaso = (jugador) => {
                if (!jugador) return;
                jugadorActual = jugador;

                const idEquipoActual = jugador.idEquipo ?? jugador.equipo?.id ?? null;
                form.reset();
                inputDorsal.classList.remove("input-invalido");

                modal.querySelector("#traspaso-jugador").textContent = jugador.nombre || "Jugador";
                modal.querySelector("#traspaso-equipo-origen").textContent = jugador.equipo?.nombre || "Sin equipo";
                modal.querySelector("#traspaso-costo").textContent = formatearCosto(jugador.costo);

                // ADMIN elige cualquier destino; un DT solo puede pedir
                // traspasos hacia su equipo (el servidor lo vuelve a
                // comprobar contra su cuenta).
                const usuario = Auth.obtenerUsuario();
                const esDT = usuario?.role === "DT";
                const equiposDestino = equipos.filter((equipo) => {
                    if (String(equipo.id) === String(idEquipoActual)) return false;
                    return !esDT || String(equipo.id) === String(usuario.teamId);
                });

                selectDestino.innerHTML = (esDT ? "" : '<option value="">Seleccione un equipo</option>') +
                    equiposDestino
                        .map((equipo) => `<option value="${equipo.id}">${equipo.nombre}</option>`)
                        .join("");
                selectDestino.disabled = esDT;
                if (esDT && equiposDestino.length === 0) {
                    selectDestino.innerHTML = `<option value="">${usuario.teamName || "Tu equipo"}</option>`;
                }

                setStatus(esDT && equiposDestino.length === 0
                    ? "Este jugador ya pertenece a tu equipo; no hay traspaso que solicitar."
                    : "", esDT && equiposDestino.length === 0 ? "error" : "info");
                modal.style.display = "flex";
            };

            modal.querySelector(".close").addEventListener("click", closeModal);
            modal.querySelector("#traspaso-cancelar-btn").addEventListener("click", closeModal);
            window.addEventListener("click", (event) => {
                if (event.target === modal) closeModal();
            });

            form.addEventListener("submit", async (event) => {
                event.preventDefault();
                if (!jugadorActual) return;

                if (!selectDestino.value) {
                    setStatus(Auth.esDT()
                        ? "Este jugador ya pertenece a tu equipo; no hay traspaso que solicitar."
                        : "Debes seleccionar el equipo destino.", "error");
                    return;
                }

                const payload = {
                    playerId: Number(jugadorActual.id),
                    destinationTeamId: Number(selectDestino.value)
                };

                const dorsalTexto = inputDorsal.value.trim();
                if (dorsalTexto !== "") {
                    const dorsal = Number(dorsalTexto);
                    if (!Number.isInteger(dorsal) || dorsal < 1) {
                        setStatus("El dorsal nuevo debe ser un número mayor a 0.", "error");
                        return;
                    }
                    payload.destinationDorsal = dorsal;
                }

                setSavingState(true);
                setStatus("");
                inputDorsal.classList.remove("input-invalido");

                try {
                    await TransferService.solicitarTraspaso(payload);
                    closeModal();
                    mostrarToast("Solicitud de traspaso creada. Queda pendiente hasta que un organizador la confirme.", "success");
                    await onTraspasoSolicitado();
                } catch (error) {
                    const mensaje = error.message || "No se pudo solicitar el traspaso.";
                    // Dorsal ocupado en el destino: se resuelve reenviando
                    // con un dorsal libre, así que se deja el modal abierto
                    // y se lleva al usuario al campo de dorsal.
                    if (/dorsal/i.test(mensaje)) {
                        setStatus(`${mensaje} Ingresa un dorsal distinto y vuelve a solicitar.`, "error");
                        inputDorsal.classList.add("input-invalido");
                        inputDorsal.focus();
                    } else {
                        setStatus(mensaje, "error");
                    }
                } finally {
                    setSavingState(false);
                }
            });
        })
        .catch((error) => console.error("Error cargando el modal de traspaso:", error));
}
