import { PartidoService } from "../services/PartidoService.js";
import { mostrarToast } from "./toast.js";

// FRONTEND_VISION.md Fase1/Fase3: "Sorteos de partidos deberia estar en
// la pantalla de partidos" + "Deberia de existir la opcion de sortear
// partido [...] para que se pueda dar el sorteo, deberian existir mas de
// 2 equipos [...] si hay 3 sale al azar un partido y el equipo faltante
// no tendra partido, si se seleccionan 4 equipos el sorteo se hace para
// definir los 2 partidos y asi sucesivamente" + "Los detalles del
// partido sorteado se llenan antes de darle sortear" (decision
// confirmada: se pide fecha/hora POR CADA PAREJA resultante, no una sola
// fecha para todo el sorteo).
export function inicializarModalSorteo({ equipos = [], onSorteoGuardado = () => {} } = {}) {
    const modalContainer = document.getElementById("modal-sorteo-container");

    if (!modalContainer) {
        console.warn("No se encontró el contenedor del modal de sorteo");
        return;
    }

    fetch("components/modal-sorteo.html")
        .then((response) => response.text())
        .then((html) => {
            modalContainer.innerHTML = html;

            const modal = document.getElementById("modal-sorteo");
            const btnCerrarModal = modal.querySelector(".close");
            const pasoEquipos = modal.querySelector("#sorteo-paso-equipos");
            const listaEquipos = modal.querySelector("#sorteo-lista-equipos");
            const statusEquipos = modal.querySelector("#sorteo-form-status");
            const btnSortear = modal.querySelector("#sorteo-sortear-btn");
            const btnCancelar = modal.querySelector("#sorteo-cancelar-btn");
            const formParejas = modal.querySelector("#sorteo-form-partidos");
            const parejasContainer = modal.querySelector("#sorteo-parejas");
            const statusParejas = modal.querySelector("#sorteo-form-status-2");
            const btnVolver = modal.querySelector("#sorteo-volver-btn");
            const guardarBtn = modal.querySelector("#sorteo-guardar-btn");
            const guardarText = modal.querySelector("#sorteo-guardar-text");

            modal.style.display = "none";

            let parejasActuales = [];
            let sobranteActual = null;

            const setStatus = (elemento, mensaje, tipo = "info") => {
                elemento.textContent = mensaje || "";
                elemento.className = `form-status ${tipo}`;
            };

            const resetModal = () => {
                pasoEquipos.hidden = false;
                formParejas.hidden = true;
                listaEquipos.innerHTML = equipos.map((equipo) => `
                    <label class="sorteo-equipo-item">
                        <input type="checkbox" value="${equipo.id}" class="sorteo-equipo-check">
                        ${equipo.nombre}
                    </label>
                `).join("");
                setStatus(statusEquipos, "");
                setStatus(statusParejas, "");
                parejasActuales = [];
                sobranteActual = null;
            };

            const closeModal = () => {
                modal.style.display = "none";
                resetModal();
            };

            window.abrirModalSorteo = () => {
                resetModal();
                modal.style.display = "flex";
            };

            btnCerrarModal.addEventListener("click", closeModal);
            btnCancelar.addEventListener("click", closeModal);
            window.addEventListener("click", (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });

            btnSortear.addEventListener("click", () => {
                const seleccionados = Array.from(listaEquipos.querySelectorAll(".sorteo-equipo-check:checked"))
                    .map((chk) => equipos.find((equipo) => String(equipo.id) === chk.value))
                    .filter(Boolean);

                if (seleccionados.length < 3) {
                    setStatus(statusEquipos, "Selecciona al menos 3 equipos para sortear (con solo 2, programa el partido directamente desde \"Programar partido\").", "error");
                    return;
                }

                // Fisher-Yates: baraja los equipos seleccionados y los
                // empareja de a dos en el orden resultante.
                const barajados = [...seleccionados];
                for (let i = barajados.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [barajados[i], barajados[j]] = [barajados[j], barajados[i]];
                }

                parejasActuales = [];
                for (let i = 0; i + 1 < barajados.length; i += 2) {
                    parejasActuales.push({ local: barajados[i], visitante: barajados[i + 1] });
                }
                sobranteActual = barajados.length % 2 === 1 ? barajados[barajados.length - 1] : null;

                const hoy = new Date().toISOString().slice(0, 10);
                parejasContainer.innerHTML = parejasActuales.map((pareja, indice) => `
                    <fieldset class="sorteo-pareja" data-indice="${indice}">
                        <legend>${pareja.local.nombre} vs ${pareja.visitante.nombre}</legend>
                        <label>Fecha:
                            <input type="date" class="sorteo-fecha" min="${hoy}" required>
                        </label>
                        <label>Hora:
                            <input type="time" class="sorteo-hora" required>
                        </label>
                        <label>Fase:
                            <select class="sorteo-fase">
                                <option value="FASE_DE_GRUPOS">Fase de grupos</option>
                                <option value="REPECHAJE">Repechaje</option>
                                <option value="ELIMINACION_DIRECTA">Eliminación directa</option>
                                <option value="FINAL">Final</option>
                            </select>
                        </label>
                    </fieldset>
                `).join("") + (sobranteActual
                    ? `<p class="sorteo-sobrante">${sobranteActual.nombre} queda libre en este sorteo (número impar de equipos): no le tocó pareja.</p>`
                    : "");

                pasoEquipos.hidden = true;
                formParejas.hidden = false;
            });

            btnVolver.addEventListener("click", () => {
                formParejas.hidden = true;
                pasoEquipos.hidden = false;
            });

            formParejas.addEventListener("submit", async (event) => {
                event.preventDefault();

                const fieldsets = Array.from(parejasContainer.querySelectorAll(".sorteo-pareja"));
                const datos = fieldsets.map((fieldset, indice) => ({
                    pareja: parejasActuales[indice],
                    fecha: fieldset.querySelector(".sorteo-fecha").value,
                    hora: fieldset.querySelector(".sorteo-hora").value,
                    fase: fieldset.querySelector(".sorteo-fase").value
                }));

                if (datos.some((dato) => !dato.fecha || !dato.hora)) {
                    setStatus(statusParejas, "Completa fecha y hora de todos los partidos del sorteo.", "error");
                    return;
                }

                guardarBtn.disabled = true;
                guardarText.textContent = "Guardando...";
                setStatus(statusParejas, "");

                let creados = 0;
                const errores = [];

                // Envio secuencial (no Promise.all): cada creación puede
                // fallar por su cuenta (ej. fecha ya ocupada para uno de los
                // equipos) sin que eso frene la creación de los demás
                // partidos del sorteo, igual que la carga de jugadores en
                // lote.
                for (const dato of datos) {
                    try {
                        await PartidoService.crearPartido({
                            idEquipoLocal: dato.pareja.local.id,
                            idEquipoVisitante: dato.pareja.visitante.id,
                            fecha: dato.fecha,
                            hora: dato.hora,
                            golesLocal: 0,
                            golesVisitante: 0,
                            fase: dato.fase
                        });
                        creados += 1;
                    } catch (error) {
                        errores.push(`${dato.pareja.local.nombre} vs ${dato.pareja.visitante.nombre}: ${error.message}`);
                    }
                }

                guardarBtn.disabled = false;
                guardarText.textContent = "Guardar sorteo";

                closeModal();
                mostrarToast(`Sorteo: ${creados} de ${datos.length} partidos programados.`, errores.length > 0 ? "error" : "success");
                if (errores.length > 0) {
                    mostrarToast(errores.slice(0, 2).join(" · ") + (errores.length > 2 ? ` (y ${errores.length - 2} más)` : ""), "error");
                }
                if (creados > 0) {
                    await onSorteoGuardado();
                }
            });
        })
        .catch((error) => console.error("Error cargando el modal de sorteo:", error));
}
