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

    // fase3-09/fase3-10: minuto es opcional (null si no se indica), pero si
    // se indica no puede ser negativo.
    if (estadistica.minuto !== null && estadistica.minuto !== undefined && Number(estadistica.minuto) < 0) {
        errores.push("El minuto no puede ser negativo.");
    }

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
//
// Hallazgo post-despliegue (fase9):
// - El backend ahora exige que el partido esté EN_CURSO o FINALIZADO para
//   registrar una estadística: si está PROGRAMADO, se avisa de una vez en
//   vez de dejar elegir jugador para recién fallar al guardar.
// - "una vez creado un registro de estadisticas para un jugador en un
//   partido, las siguientes... se puede gestionar desde el mismo
//   registro": al elegir un jugador ya con estadística registrada en ese
//   partido, el modal detecta el registro existente (GET /buscar) y pasa
//   solo a modo edición, en vez de dejar crear un duplicado. También se
//   puede abrir directamente en modo edición desde la tabla (botón
//   Editar), pasando el registro ya conocido.
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
            const existenteInfo = modal.querySelector("#estadistica-existente-info");
            const modalTitle = modal.querySelector("#estadistica-modal-title");
            const submitButton = modal.querySelector("#estadistica-submit-btn");
            const submitText = modal.querySelector("#estadistica-submit-text");
            const hiddenId = modal.querySelector("#estadistica-id");
            const selectPartido = modal.querySelector("#estadistica-partido");
            const selectJugador = modal.querySelector("#estadistica-jugador");

            selectPartido.innerHTML = '<option value="">Seleccione un partido</option>' +
                partidos.map((partido) => `<option value="${partido.id}">${etiquetaPartido(partido)}</option>`).join("");

            modal.style.display = "none";

            const setStatus = (message, type = "info") => {
                formStatus.textContent = message || "";
                formStatus.className = `form-status ${type}`;
            };

            const setExistenteInfo = (message) => {
                existenteInfo.hidden = !message;
                existenteInfo.textContent = message || "";
            };

            const setSavingState = (isSaving) => {
                submitButton.disabled = isSaving;
                submitButton.classList.toggle("is-loading", isSaving);
                submitText.textContent = isSaving ? "Guardando..." : (hiddenId.value ? "Actualizar" : "Guardar");
            };

            const pasarAModoEdicion = (estadistica) => {
                hiddenId.value = estadistica.id;
                modalTitle.textContent = "Editar Estadística";
                formEstadistica.querySelector("#estadistica-goles").value = estadistica.goles ?? 0;
                formEstadistica.querySelector("#estadistica-amarillas").value = estadistica.tarjetasAmarillas ?? 0;
                formEstadistica.querySelector("#estadistica-rojas").value = estadistica.tarjetasRojas ?? 0;
                formEstadistica.querySelector("#estadistica-asistencias").value = estadistica.asistencias ?? 0;
                formEstadistica.querySelector("#estadistica-minuto").value = estadistica.minuto ?? "";
                setExistenteInfo("Ya existe un registro de este jugador en este partido: se va a editar en vez de crear uno nuevo.");
                setSavingState(false);
            };

            const volverAModoCreacion = () => {
                hiddenId.value = "";
                modalTitle.textContent = "Registrar Estadística";
                formEstadistica.querySelector("#estadistica-goles").value = 0;
                formEstadistica.querySelector("#estadistica-amarillas").value = 0;
                formEstadistica.querySelector("#estadistica-rojas").value = 0;
                formEstadistica.querySelector("#estadistica-asistencias").value = 0;
                formEstadistica.querySelector("#estadistica-minuto").value = "";
                setExistenteInfo("");
                setSavingState(false);
            };

            // true mientras el modal fue abierto directamente en modo
            // edición (botón "Editar" de la tabla): en ese caso partido y
            // jugador quedan fijos (no se pueden reasignar, el backend lo
            // rechazaría) y no se vuelve a auto-detectar nada al cambiarlos.
            let edicionDirecta = false;

            const actualizarJugadoresDelPartido = async () => {
                const idPartido = selectPartido.value;
                const partido = partidos.find((item) => String(item.id) === idPartido);

                if (!partido) {
                    selectJugador.innerHTML = '<option value="">Seleccione un partido primero</option>';
                    selectJugador.disabled = true;
                    return;
                }

                // Hallazgo post-despliegue (fase9): registrar solo se
                // permite con el partido EN_CURSO o FINALIZADO.
                if (partido.estado === "PROGRAMADO") {
                    selectJugador.innerHTML = '<option value="">Este partido todavía no ha iniciado</option>';
                    selectJugador.disabled = true;
                    setStatus("Este partido todavía no ha iniciado: no se pueden registrar estadísticas hasta que arranque.", "info");
                    return;
                }

                setStatus("");
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

            selectPartido.addEventListener("change", () => {
                if (edicionDirecta) return;
                volverAModoCreacion();
                actualizarJugadoresDelPartido();
            });

            selectJugador.addEventListener("change", async () => {
                if (edicionDirecta) return;

                const idPartido = selectPartido.value;
                const idJugador = selectJugador.value;

                if (!idPartido || !idJugador) {
                    volverAModoCreacion();
                    return;
                }

                try {
                    const existente = await EstadisticaService.buscarExistente(idJugador, idPartido);
                    if (existente) {
                        pasarAModoEdicion(existente);
                    } else {
                        volverAModoCreacion();
                    }
                } catch (error) {
                    console.error("No se pudo verificar si ya existe una estadística para este jugador y partido:", error);
                    volverAModoCreacion();
                }
            });

            const closeModal = () => {
                modal.style.display = "none";
                formEstadistica.reset();
                selectJugador.innerHTML = '<option value="">Seleccione un partido primero</option>';
                selectJugador.disabled = false;
                selectPartido.disabled = false;
                edicionDirecta = false;
                volverAModoCreacion();
                setStatus("");
            };

            // estadisticaExistente: si se pasa (desde el botón "Editar" de
            // la tabla), el modal abre ya en modo edición con partido y
            // jugador fijos.
            window.abrirModalEstadistica = (estadisticaExistente = null) => {
                formEstadistica.reset();
                setStatus("");
                selectPartido.disabled = false;
                edicionDirecta = false;

                if (!estadisticaExistente) {
                    selectJugador.innerHTML = '<option value="">Seleccione un partido primero</option>';
                    selectJugador.disabled = true;
                    volverAModoCreacion();
                    modal.style.display = "flex";
                    return;
                }

                edicionDirecta = true;
                const partido = partidos.find((item) => String(item.id) === String(estadisticaExistente.idPartido));
                const jugador = jugadores.find((item) => String(item.id) === String(estadisticaExistente.idJugador));

                selectPartido.value = String(estadisticaExistente.idPartido);
                selectPartido.disabled = true;

                selectJugador.innerHTML = `<option value="${estadisticaExistente.idJugador}">${jugador?.nombre || `Jugador #${estadisticaExistente.idJugador}`}</option>`;
                selectJugador.value = String(estadisticaExistente.idJugador);
                selectJugador.disabled = true;

                pasarAModoEdicion(estadisticaExistente);
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
                    asistencias: Number(formEstadistica.querySelector("#estadistica-asistencias").value),
                    minuto: formEstadistica.querySelector("#estadistica-minuto").value !== ""
                        ? Number(formEstadistica.querySelector("#estadistica-minuto").value)
                        : null
                };

                const errores = validarEstadistica(payload);
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
                        resultado = await EstadisticaService.editarEstadistica(hiddenId.value, payload);
                        mensajeExito = "Estadística actualizada correctamente.";
                    } else {
                        resultado = await EstadisticaService.crearEstadistica(payload);
                        mensajeExito = "Estadística registrada correctamente.";
                    }

                    if (resultado) {
                        formEstadistica.reset();
                        closeModal();
                        mostrarToast(mensajeExito, "success");
                        await onEstadisticaGuardada();
                    }
                } catch (error) {
                    setStatus(error.message || "Ocurrió un error al guardar la estadística.", "error");
                } finally {
                    setSavingState(false);
                }
            });
        })
        .catch((error) => console.error("Error cargando el modal de estadística:", error));
}
