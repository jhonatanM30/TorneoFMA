import { TournamentService } from "../services/TournamentService.js";
import { abrirFormulario } from "./modalFormulario.js";
import { htmlTablaPosiciones } from "./torneoTabla.js";
import { mostrarToast } from "./toast.js";
import { escaparHtml } from "./formatos.js";

// Secciones de los torneos KNOCKOUT (eliminatoria directa) y GROUPS_KNOCKOUT
// (fase de grupos y eliminatoria): grupos, llaves, repechaje y cruces.

const esPotenciaDe2 = (n) => n >= 2 && (n & (n - 1)) === 0;
const hoy = () => new Date().toISOString().slice(0, 10);

// Equipos que entran al cuadro: los inscritos menos los perdedores de los
// partidos de repechaje ya finalizados (gana quien tiene más goles y, con el
// marcador igual, más penales).
function participantesDelCuadro(equipos, partidos) {
    const eliminados = new Set();
    partidos.filter((p) => p.fase === "REPECHAJE" && p.estado === "FINALIZADO").forEach((p) => {
        let diferencia = Number(p.golesLocal ?? 0) - Number(p.golesVisitante ?? 0);
        if (diferencia === 0) diferencia = Number(p.penalesLocal ?? 0) - Number(p.penalesVisitante ?? 0);
        if (diferencia === 0) return;
        const perdedor = diferencia > 0
            ? (p.idEquipoVisitante ?? p.equipoVisitante?.id)
            : (p.idEquipoLocal ?? p.equipoLocal?.id);
        eliminados.add(String(perdedor));
    });
    return equipos.filter((e) => !eliminados.has(String(e.id)));
}

// --- Llaves -------------------------------------------------------------------

function htmlEquipoCruce(equipo, goles, penales, esGanador) {
    if (!equipo) {
        return `<div class="cruce-equipo cruce-pendiente"><span>Por definir</span></div>`;
    }
    return `
        <div class="cruce-equipo ${esGanador ? "cruce-ganador" : ""}">
            <span class="cruce-nombre">${escaparHtml(equipo.name)}</span>
            <span class="cruce-marcador">${goles ?? "-"}${penales != null ? ` <small title="Penales">(${penales})</small>` : ""}</span>
        </div>`;
}

function htmlCruce(cruce, titulo = "") {
    const ganador = cruce.winnerTeamId != null ? String(cruce.winnerTeamId) : null;
    const fecha = cruce.date ? `${cruce.date}${cruce.time ? ` ${String(cruce.time).slice(0, 5)}` : ""}` : "";
    return `
        <div class="cruce" data-match-id="${cruce.matchId ?? ""}">
            ${titulo ? `<div class="cruce-titulo">${titulo}</div>` : ""}
            ${htmlEquipoCruce(cruce.homeTeam, cruce.homeGoals, cruce.homePenalties, ganador && cruce.homeTeam && String(cruce.homeTeam.id) === ganador)}
            ${htmlEquipoCruce(cruce.awayTeam, cruce.awayGoals, cruce.awayPenalties, ganador && cruce.awayTeam && String(cruce.awayTeam.id) === ganador)}
            ${fecha ? `<div class="cruce-fecha"><i class="fas fa-calendar"></i> ${escaparHtml(fecha)}</div>` : ""}
        </div>`;
}

function htmlLlaves(llaves) {
    const rondas = llaves.rounds.map((ronda) => `
        <div class="llave-ronda">
            <h5>${escaparHtml(ronda.name)}</h5>
            ${ronda.ties.length > 0
                ? ronda.ties.map((c) => htmlCruce(c)).join("")
                : `<div class="cruce cruce-vacio"><span class="cruce-pendiente">Por definir</span></div>`}
        </div>`).join("");

    return `
        ${llaves.champion ? `<div class="llave-campeon"><i class="fas fa-trophy"></i> Campeón: <strong>${escaparHtml(llaves.champion.name)}</strong></div>` : ""}
        <div class="llaves-scroll"><div class="llaves">${rondas}</div></div>
        ${llaves.thirdPlace ? `<div class="llave-tercer-puesto">${htmlCruce(llaves.thirdPlace, "Partido por el tercer puesto")}</div>` : ""}`;
}

// ids (texto) de los partidos que forman las llaves: protegidos, no se
// eliminan ni cambian de equipos (su fecha y hora sí se editan).
function idsPartidosDeLlaves(llaves) {
    const ids = new Set();
    llaves.rounds.forEach((r) => r.ties.forEach((c) => c.matchId != null && ids.add(String(c.matchId))));
    if (llaves.thirdPlace?.matchId != null) ids.add(String(llaves.thirdPlace.matchId));
    return ids;
}

// --- Contenido propio de los formularios ----------------------------------------

// Cruces a mano de la primera ronda (solo KNOCKOUT): cada equipo una sola vez.
function extraCruces(participantes) {
    let casilla;
    let lista;
    return {
        render(contenedor) {
            const opciones = `<option value="">Equipo...</option>` +
                participantes.map((e) => `<option value="${e.id}">${escaparHtml(e.nombre)}</option>`).join("");
            const cruces = Array.from({ length: Math.floor(participantes.length / 2) }, (_, i) => `
                <div class="cruce-fila">
                    <span>Cruce ${i + 1}</span>
                    <select data-lado="home">${opciones}</select>
                    <span>vs</span>
                    <select data-lado="away">${opciones}</select>
                </div>`).join("");
            contenedor.innerHTML = `
                <label class="check-label"><input type="checkbox" class="cruces-manual"> Elegir los cruces a mano (si no, se sortean)</label>
                <div class="cruces-lista" hidden>
                    <p class="modal-help">En el orden del cuadro. Cada equipo que participa debe aparecer exactamente una vez.</p>
                    ${cruces}
                </div>`;
            casilla = contenedor.querySelector(".cruces-manual");
            lista = contenedor.querySelector(".cruces-lista");
            casilla.addEventListener("change", () => { lista.hidden = !casilla.checked; });
        },
        leer() {
            if (!casilla.checked) return {};
            const pairings = [...lista.querySelectorAll(".cruce-fila")].map((fila) => ({
                homeTeamId: Number(fila.querySelector("[data-lado=home]").value),
                awayTeamId: Number(fila.querySelector("[data-lado=away]").value)
            }));
            const usados = pairings.flatMap((p) => [p.homeTeamId, p.awayTeamId]);
            if (usados.some((id) => !id)) throw new Error("Completa todos los cruces.");
            if (new Set(usados).size !== usados.length) throw new Error("Un equipo no puede aparecer en más de un cruce.");
            return { pairings };
        }
    };
}

// Composición de los grupos a mano (solo GROUPS_KNOCKOUT): cada equipo en un grupo.
function extraGrupos(equipos) {
    let casilla;
    let lista;
    const letras = (n) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
    return {
        render(contenedor) {
            contenedor.innerHTML = `
                <label class="check-label"><input type="checkbox" class="grupos-manual"> Elegir la composición de los grupos a mano (si no, se sortea)</label>
                <div class="grupos-lista" hidden></div>`;
            casilla = contenedor.querySelector(".grupos-manual");
            lista = contenedor.querySelector(".grupos-lista");
            const form = contenedor.closest("form");

            const dibujar = () => {
                const previas = new Map([...lista.querySelectorAll("select")].map((s) => [s.dataset.equipo, s.value]));
                const cantidad = Math.min(Math.max(Number(form.elements.groupCount.value) || 0, 0), 26);
                const opciones = `<option value="">Grupo...</option>` +
                    letras(cantidad).map((l) => `<option value="${l}">Grupo ${l}</option>`).join("");
                lista.innerHTML = `<p class="modal-help">Asigna cada equipo a un grupo. Los tamaños pueden diferir como máximo en 1.</p>` +
                    equipos.map((e) => `
                        <div class="cruce-fila">
                            <span>${escaparHtml(e.nombre)}</span>
                            <select data-equipo="${e.id}">${opciones}</select>
                        </div>`).join("");
                lista.querySelectorAll("select").forEach((s) => {
                    if (previas.get(s.dataset.equipo)) s.value = previas.get(s.dataset.equipo);
                });
            };

            casilla.addEventListener("change", () => { lista.hidden = !casilla.checked; if (casilla.checked) dibujar(); });
            form.elements.groupCount.addEventListener("input", () => { if (casilla.checked) dibujar(); });
        },
        leer() {
            if (!casilla.checked) return {};
            const porGrupo = new Map();
            for (const select of lista.querySelectorAll("select")) {
                if (!select.value) throw new Error("Asigna un grupo a todos los equipos.");
                if (!porGrupo.has(select.value)) porGrupo.set(select.value, []);
                porGrupo.get(select.value).push(Number(select.dataset.equipo));
            }
            const cantidad = Number(lista.closest("form").elements.groupCount.value);
            const groups = letras(cantidad).map((l) => ({ teamIds: porGrupo.get(l) || [] }));
            if (groups.some((g) => g.teamIds.length === 0)) throw new Error("Todos los grupos deben tener equipos.");
            return { groups };
        }
    };
}

// --- Sección ----------------------------------------------------------------------

// Devuelve el conjunto de ids de partidos de las llaves (protegidos).
export async function renderSeccionEliminatoria(contenedor, torneo, equipos, partidos, recargar) {
    const conGrupos = torneo.format === "GROUPS_KNOCKOUT";
    const enCurso = torneo.status === "IN_PROGRESS";

    contenedor.innerHTML = `
        ${conGrupos ? `
            <h4 class="torneo-seccion-titulo">Grupos</h4>
            <div id="elim-grupos"><div class="loading-state">Cargando grupos...</div></div>` : ""}
        <h4 class="torneo-seccion-titulo">Llaves de la eliminatoria</h4>
        <div id="elim-llaves"><div class="loading-state">Cargando llaves...</div></div>`;

    const [grupos, llaves] = await Promise.all([
        conGrupos ? TournamentService.obtenerGrupos(torneo.id).catch((e) => e) : [],
        TournamentService.obtenerLlaves(torneo.id).catch((e) => e)
    ]);

    // --- Grupos
    if (conGrupos) {
        const cont = contenedor.querySelector("#elim-grupos");
        if (grupos instanceof Error) {
            cont.innerHTML = `<div class="empty-state">No se pudieron cargar los grupos.<br>${escaparHtml(grupos.message)}</div>`;
        } else if (grupos.length === 0) {
            const puedeFormar = enCurso && partidos.length === 0;
            cont.innerHTML = `
                <div class="torneo-calendario-vacio">
                    <p class="torneo-ayuda">${enCurso
                        ? (partidos.length === 0
                            ? "Todavía no hay grupos. Fórmalos (por sorteo o a mano) y se genera el calendario de cada grupo."
                            : "El torneo ya tiene partidos y no tiene grupos: no se pueden formar grupos.")
                        : "Los grupos se forman cuando el torneo está en curso."}</p>
                    ${puedeFormar ? `<button class="btn" id="btn-formar-grupos" data-requiere-admin="true">Formar grupos</button>` : ""}
                </div>`;
        } else {
            cont.innerHTML = grupos.map((grupo) => `
                <div class="grupo-card">
                    <h5>Grupo ${escaparHtml(grupo.name)} <small>· clasifican ${grupo.qualifiersCount}</small></h5>
                    ${htmlTablaPosiciones(grupo.standings, { clasifican: grupo.qualifiersCount })}
                </div>`).join("");
        }
    }

    // --- Llaves
    const contLlaves = contenedor.querySelector("#elim-llaves");
    let protegidos = new Set();
    const hayGrupos = !conGrupos || (Array.isArray(grupos) && grupos.length > 0);

    if (llaves instanceof Error) {
        contLlaves.innerHTML = `<div class="empty-state">No se pudieron cargar las llaves.<br>${escaparHtml(llaves.message)}</div>`;
    } else if (llaves.rounds.length > 0) {
        contLlaves.innerHTML = htmlLlaves(llaves);
        protegidos = idsPartidosDeLlaves(llaves);
    } else {
        const participantes = participantesDelCuadro(equipos, partidos);
        const pendientesGrupos = partidos.filter((p) => p.fase === "FASE_DE_GRUPOS" && p.estado !== "FINALIZADO").length;
        const avisos = [];

        if (!enCurso) {
            avisos.push("Las llaves se generan cuando el torneo está en curso.");
        } else if (conGrupos && !hayGrupos) {
            avisos.push("Primero forma los grupos: las llaves se arman con los clasificados.");
        } else if (conGrupos && pendientesGrupos > 0) {
            avisos.push(`Faltan ${pendientesGrupos} partido(s) de la fase de grupos por finalizar para poder generar las llaves.`);
        } else if (!conGrupos && !esPotenciaDe2(participantes.length)) {
            avisos.push(
                `Hay ${participantes.length} equipo(s) en el cuadro y deben ser 2, 4, 8, 16... Arma un repechaje: ` +
                "usa \"Crear partido\", elige la fase Repechaje entre dos equipos, juégalo (el perdedor queda eliminado) y vuelve a generar las llaves."
            );
        }
        const puedeGenerar = enCurso && hayGrupos;

        contLlaves.innerHTML = `
            <div class="torneo-calendario-vacio">
                <p class="torneo-ayuda">Todavía no se generaron las llaves.</p>
                ${avisos.map((a) => `<p class="torneo-ayuda">${escaparHtml(a)}</p>`).join("")}
                ${puedeGenerar ? `<button class="btn" id="btn-generar-llaves" data-requiere-admin="true">Generar llaves</button>` : ""}
            </div>`;

        contLlaves.querySelector("#btn-generar-llaves")?.addEventListener("click", () => {
            abrirFormulario({
                titulo: "Generar llaves",
                ayuda: conGrupos
                    ? "Se arma el cuadro con los clasificados de cada grupo; los cruces los define el servidor."
                    : "Solo se crean los partidos de la primera ronda; las demás rondas se crean solas al definirse los ganadores.",
                textoEnviar: "Generar llaves",
                campos: [
                    { name: "startDate", label: "Fecha de inicio", type: "date", required: true, min: hoy(), help: "Debe ser posterior al último partido del torneo (repechaje o fase de grupos)." },
                    { name: "time", label: "Hora de los partidos", type: "time", required: true },
                    { name: "intervalDays", label: "Días entre rondas (opcional)", type: "number", min: 1, max: 30, step: 1, placeholder: "7" },
                    { name: "thirdPlaceMatch", label: "Partido por el tercer puesto", type: "checkbox", value: true }
                ],
                extra: conGrupos ? null : extraCruces(participantes),
                alEnviar: async (valores) => {
                    await TournamentService.generarLlaves(torneo.id, valores);
                    mostrarToast("Llaves generadas.", "success");
                    await recargar();
                }
            });
        });
    }

    // --- Formar grupos
    contenedor.querySelector("#btn-formar-grupos")?.addEventListener("click", () => {
        abrirFormulario({
            titulo: "Formar grupos",
            ayuda: "Cada grupo juega todos contra todos, una vuelta; la jornada k de todos los grupos cae el mismo día. Si algún equipo ya juega en una de esas fechas, no se crea nada.",
            textoEnviar: "Formar grupos",
            campos: [
                { name: "groupCount", label: "Cantidad de grupos", type: "number", min: 2, step: 1, required: true, value: 2, help: "Potencia de 2 (2, 4, 8...), con al menos 2 equipos por grupo." },
                { name: "qualifiersPerGroup", label: "Clasifican por grupo", type: "number", min: 1, max: 2, step: 1, required: true, value: 2, help: "1 o 2, y menos que el grupo más pequeño." },
                { name: "startDate", label: "Fecha de inicio", type: "date", required: true, min: hoy() },
                { name: "time", label: "Hora de los partidos", type: "time", required: true },
                { name: "intervalDays", label: "Días entre jornadas (opcional)", type: "number", min: 1, max: 30, step: 1, placeholder: "7" }
            ],
            extra: extraGrupos(equipos),
            alEnviar: async (valores) => {
                const creados = await TournamentService.formarGrupos(torneo.id, valores);
                mostrarToast(`Grupos formados: ${creados.length}.`, "success");
                await recargar();
            }
        });
    });

    return protegidos;
}
