import { PartidoService } from "../services/PartidoService.js";
import { TournamentService } from "../services/TournamentService.js";
import { mostrarToast } from "./toast.js";
import { escaparHtml } from "./formatos.js";

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

    return errores;
};

// equipos: lista de EquipoDTO ya cargada por partidos.js.
// FRONTEND_VISION.md Fase3: "un partido se deberia permitir Editar" - ya
// se agrego PUT /api/partidos en el backend, este modal ahora soporta
// modo edicion igual que Equipo/Jugador (id oculto + abrirModalPartido(partido)).
//
// Hallazgo post-despliegue (fase9): "los goles que se reflejan en partido
// deben ser ingresados por el registro de estadisticas... si se desea
// editar se debe editar por la estadistica registrada en estadisticas".
// Los campos de goles se quitaron del formulario (ver
// components/modal-partido.html); este modal ya no los lee ni los envía.
// "Una vez finalizado el partido, no se puede editar ni eliminar": como
// defensa adicional a que partidos.js ya oculta el botón Editar para un
// partido FINALIZADO, si igual se llega a abrir el modal para uno (por
// ejemplo, con datos desactualizados en pantalla) se bloquea el envío acá
// también, con el mismo mensaje que daría el backend.
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
            const golesInfo = modal.querySelector("#partido-goles-info");
            const modalTitle = modal.querySelector("#partido-modal-title");
            const submitButton = modal.querySelector("#partido-submit-btn");
            const submitText = modal.querySelector("#partido-submit-text");
            const hiddenId = modal.querySelector("#partido-id");
            const selectLocal = modal.querySelector("#partido-local");
            const selectVisitante = modal.querySelector("#partido-visitante");
            const inputFecha = modal.querySelector("#partido-fecha");
            const selectTorneo = modal.querySelector("#partido-torneo");
            const torneoInfo = modal.querySelector("#partido-torneo-info");

            let partidoFinalizado = false;

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
            //
            // Con un torneo elegido, solo se ofrecen los equipos inscritos en
            // él (equiposDisponibles); sin torneo o en el Histórico, todos.
            let equiposDisponibles = equipos;
            const torneosPorId = new Map();

            const refrescarOpciones = () => {
                const idLocal = selectLocal.value;
                const idVisitante = selectVisitante.value;

                selectLocal.innerHTML = '<option value="">Seleccione</option>' +
                    equiposDisponibles.filter((equipo) => String(equipo.id) !== idVisitante)
                        .map((equipo) => `<option value="${equipo.id}">${equipo.nombre}</option>`).join("");

                selectVisitante.innerHTML = '<option value="">Seleccione</option>' +
                    equiposDisponibles.filter((equipo) => String(equipo.id) !== idLocal)
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

            const mostrarInfoTorneo = (mensaje) => {
                torneoInfo.hidden = !mensaje;
                torneoInfo.textContent = mensaje || "";
            };

            // Solo torneos en curso (el "Histórico" también lo está).
            const cargarTorneos = async () => {
                let torneos = [];
                try {
                    torneos = (await TournamentService.obtenerTorneos()).filter((t) => t.status === "IN_PROGRESS");
                } catch (error) {
                    mostrarInfoTorneo("No se pudieron cargar los torneos; el partido irá al Histórico.");
                }
                torneosPorId.clear();
                torneos.forEach((t) => torneosPorId.set(String(t.id), t));
                selectTorneo.innerHTML = '<option value="">Sin torneo (va al Histórico)</option>' +
                    torneos.map((t) => `<option value="${t.id}">${escaparHtml(t.name)}</option>`).join("");
            };

            // Al elegir torneo, los selectores de equipo muestran solo los inscritos.
            const aplicarTorneo = async (idTorneo) => {
                const torneo = torneosPorId.get(String(idTorneo));
                mostrarInfoTorneo("");
                if (!idTorneo || !torneo || torneo.format === "LEGACY") {
                    equiposDisponibles = equipos;
                } else {
                    try {
                        equiposDisponibles = await TournamentService.obtenerEquipos(idTorneo);
                        if (equiposDisponibles.length === 0) {
                            mostrarInfoTorneo("Este torneo no tiene equipos inscritos.");
                        }
                    } catch (error) {
                        equiposDisponibles = [];
                        setStatus(error.message || "No se pudieron cargar los equipos del torneo.", "error");
                    }
                }
                // Si el equipo ya elegido no está inscrito, se descarta.
                [selectLocal, selectVisitante].forEach((select) => {
                    if (!equiposDisponibles.some((e) => String(e.id) === select.value)) select.value = "";
                });
                refrescarOpciones();
            };

            selectTorneo.addEventListener("change", () => aplicarTorneo(selectTorneo.value));

            const setSavingState = (isSaving) => {
                submitButton.disabled = isSaving || partidoFinalizado;
                submitButton.classList.toggle("is-loading", isSaving);
                submitText.textContent = isSaving ? "Guardando..." : "Guardar";
            };

            const closeModal = () => {
                modal.style.display = "none";
                formPartido.reset();
                hiddenId.value = "";
                modalTitle.textContent = "Programar Partido";
                submitText.textContent = "Guardar";
                golesInfo.hidden = true;
                partidoFinalizado = false;
                equiposDisponibles = equipos;
                selectTorneo.disabled = false;
                selectLocal.disabled = false;
                selectVisitante.disabled = false;
                mostrarInfoTorneo("");
                refrescarOpciones();
                setStatus("");
            };

            // opciones.idTorneo preselecciona el torneo (al crear desde el
            // detalle de un torneo). Al editar, el torneo no se puede cambiar
            // (el backend ignora idTorneo en PUT).
            // opciones.equiposBloqueados: partido de las llaves, protegido: solo
            // se edita su fecha y hora, no sus equipos.
            window.abrirModalPartido = async (partido = null, { idTorneo = null, equiposBloqueados = false } = {}) => {
                formPartido.reset();
                golesInfo.hidden = true;
                partidoFinalizado = false;
                equiposDisponibles = equipos;
                setSavingState(true);
                modal.style.display = "flex";

                await cargarTorneos();

                if (!partido) {
                    hiddenId.value = "";
                    modalTitle.textContent = "Programar Partido";
                    submitText.textContent = "Guardar";
                    selectTorneo.disabled = false;
                    if (idTorneo && torneosPorId.has(String(idTorneo))) {
                        selectTorneo.value = String(idTorneo);
                    }
                    await aplicarTorneo(selectTorneo.value);
                } else {
                    hiddenId.value = partido.id || "";
                    modalTitle.textContent = "Editar Partido";
                    submitText.textContent = "Actualizar";

                    if (partido.idTorneo != null) {
                        if (!torneosPorId.has(String(partido.idTorneo))) {
                            selectTorneo.insertAdjacentHTML("beforeend", `<option value="${partido.idTorneo}">Torneo #${partido.idTorneo}</option>`);
                        }
                        selectTorneo.value = String(partido.idTorneo);
                    }
                    selectTorneo.disabled = true;
                    await aplicarTorneo(selectTorneo.value);

                    selectLocal.value = partido.idEquipoLocal ?? partido.equipoLocal?.id ?? "";
                    selectVisitante.value = partido.idEquipoVisitante ?? partido.equipoVisitante?.id ?? "";
                    formPartido.querySelector("#partido-fecha").value = partido.fecha || "";
                    formPartido.querySelector("#partido-hora").value = partido.hora || "";
                    formPartido.querySelector("#partido-fase").value = partido.fase || "";

                    const golesLocal = Number(partido.golesLocal ?? 0);
                    const golesVisitante = Number(partido.golesVisitante ?? 0);
                    golesInfo.hidden = false;
                    golesInfo.textContent = `Marcador actual: ${golesLocal} - ${golesVisitante}. `
                        + "Se calcula solo con lo registrado en Estadísticas; para corregirlo, edita ahí el registro del jugador correspondiente.";

                    partidoFinalizado = partido.estado === "FINALIZADO";
                    if (partidoFinalizado) {
                        setStatus("Este partido ya finalizó: no se puede editar.", "error");
                    }
                }

                refrescarOpciones();
                selectLocal.disabled = equiposBloqueados;
                selectVisitante.disabled = equiposBloqueados;
                if (equiposBloqueados) {
                    mostrarInfoTorneo("Este partido es de las llaves: solo puedes cambiar su fecha y hora.");
                }
                if (!partidoFinalizado) {
                    setStatus("");
                }
                setSavingState(false);
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

                if (partidoFinalizado) {
                    setStatus("Este partido ya finalizó: no se puede editar.", "error");
                    return;
                }

                const payload = {
                    id: hiddenId.value ? Number(hiddenId.value) : undefined,
                    idEquipoLocal: selectLocal.value ? Number(selectLocal.value) : null,
                    idEquipoVisitante: selectVisitante.value ? Number(selectVisitante.value) : null,
                    fecha: formPartido.querySelector("#partido-fecha").value,
                    hora: formPartido.querySelector("#partido-hora").value,
                    fase: formPartido.querySelector("#partido-fase").value
                };

                // Solo al crear: el torneo de un partido no cambia después.
                if (!payload.id && selectTorneo.value) {
                    payload.idTorneo = Number(selectTorneo.value);
                }

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
