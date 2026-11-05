import { TournamentService } from "../services/TournamentService.js";
import { EquipoService } from "../services/EquipoService.js";
import { PartidoService } from "../services/PartidoService.js";
import { mostrarToast } from "./toast.js";
import { escaparHtml, formatearFechaHora } from "./formatos.js";
import { inicializarModalTorneo } from "./modalTorneo.js";
import { inicializarModalPartido } from "./modalPartido.js";
import { renderSeccionLiga, agruparPorJornada, htmlEncabezadoJornada } from "./torneoLiga.js";
import { renderSeccionEliminatoria } from "./torneoEliminatoria.js";
import { abrirFormularioPenales, necesitaPenales } from "./penales.js";
import {
    ETIQUETAS_FORMATO,
    ETIQUETAS_ESTADO_TORNEO,
    ETIQUETAS_FASE,
    ETIQUETAS_ESTADO_PARTIDO,
    esHistorico
} from "./torneoUtils.js";

// Módulo de torneos. La lista y el detalle son públicos; todo control de
// escritura lleva data-requiere-admin (js/app.js lo muestra solo al ADMIN).
// El backend sigue siendo la autoridad y responde 401/403.

let equiposCache = [];
let torneoActualId = null;
// Partidos de las llaves (protegidos): no se eliminan ni cambian de equipos.
let partidosProtegidos = new Set();

document.addEventListener("DOMContentLoaded", async function () {
    const vistaLista = document.getElementById("vista-lista");
    const vistaDetalle = document.getElementById("vista-detalle");
    const listaContenedor = document.getElementById("torneos-lista");
    const btnCrear = document.getElementById("btn-crear-torneo");

    if (!listaContenedor || !vistaDetalle) {
        console.error("No se encontraron los contenedores de torneos.");
        return;
    }

    try {
        equiposCache = await EquipoService.obtenerEquipos();
    } catch (error) {
        equiposCache = [];
        console.error("No se pudieron cargar los equipos:", error.message);
    }

    inicializarModalTorneo({
        onTorneoGuardado: async () => {
            if (torneoActualId) await abrirDetalle(torneoActualId);
            else await cargarLista();
        }
    });

    inicializarModalPartido({
        equipos: equiposCache,
        onPartidoGuardado: async () => {
            if (torneoActualId) await abrirDetalle(torneoActualId);
        }
    });

    btnCrear.addEventListener("click", () => window.abrirModalTorneo?.());

    // --- Navegación lista <-> detalle por hash (#id) --------------------------
    const enrutar = async () => {
        const id = Number(window.location.hash.slice(1));
        if (Number.isInteger(id) && id > 0) {
            await abrirDetalle(id);
        } else {
            torneoActualId = null;
            vistaDetalle.hidden = true;
            vistaDetalle.innerHTML = "";
            vistaLista.hidden = false;
            await cargarLista();
        }
    };
    window.addEventListener("hashchange", enrutar);

    // --- Lista ---------------------------------------------------------------
    async function cargarLista() {
        listaContenedor.innerHTML = "<div class='loading-state'>Cargando torneos...</div>";
        try {
            renderLista(await TournamentService.obtenerTorneos());
        } catch (error) {
            listaContenedor.innerHTML = `
                <div class="empty-state">
                    No se pudieron cargar los torneos.<br>${escaparHtml(error.message || "Intenta nuevamente más tarde.")}
                </div>`;
        }
    }

    function insignias(torneo) {
        return `
            <span class="badge-formato">${ETIQUETAS_FORMATO[torneo.format] || escaparHtml(torneo.format)}</span>
            <span class="badge-estado-torneo badge-estado-torneo--${String(torneo.status).toLowerCase()}">
                ${ETIQUETAS_ESTADO_TORNEO[torneo.status] || escaparHtml(torneo.status)}
            </span>`;
    }

    function renderLista(torneos) {
        if (torneos.length === 0) {
            listaContenedor.innerHTML = "<div class='empty-state'>Todavía no hay torneos creados.</div>";
            return;
        }

        listaContenedor.innerHTML = torneos.map((torneo) => `
            <a class="torneo-card" href="#${torneo.id}">
                <div class="torneo-card-titulo">
                    <h3>${escaparHtml(torneo.name)}</h3>
                    <div class="torneo-insignias">${insignias(torneo)}</div>
                </div>
                <p class="torneo-card-meta">
                    <i class="fas fa-users"></i>
                    ${esHistorico(torneo) ? "Sin inscripción: admite cualquier equipo" : `${torneo.teamCount ?? 0} equipo(s) inscrito(s)`}
                </p>
            </a>
        `).join("");
    }

    // --- Detalle -------------------------------------------------------------
    async function abrirDetalle(id) {
        torneoActualId = id;
        vistaLista.hidden = true;
        vistaDetalle.hidden = false;
        vistaDetalle.innerHTML = "<div class='loading-state'>Cargando torneo...</div>";

        try {
            const [torneo, equipos, partidos] = await Promise.all([
                TournamentService.obtenerTorneo(id),
                TournamentService.obtenerEquipos(id),
                TournamentService.obtenerPartidos(id)
            ]);
            await renderDetalle(torneo, equipos, partidos);
        } catch (error) {
            vistaDetalle.innerHTML = `
                <a class="torneo-volver" href="#">← Todos los torneos</a>
                <div class="empty-state">
                    No se pudo cargar el torneo.<br>${escaparHtml(error.message || "Intenta nuevamente más tarde.")}
                </div>`;
        }
    }

    async function renderDetalle(torneo, equipos, partidos) {
        partidosProtegidos = new Set();
        const historico = esHistorico(torneo);
        const borrador = torneo.status === "DRAFT";
        const enCurso = torneo.status === "IN_PROGRESS";
        const pendientes = partidos.filter((p) => p.estado !== "FINALIZADO").length;

        const acciones = [];
        if (!historico && borrador) {
            acciones.push(`<button class="btn btn-small" id="btn-editar-torneo" data-requiere-admin="true">Editar</button>`);
            acciones.push(`<button class="btn btn-small btn-iniciar-partido" id="btn-iniciar-torneo" data-requiere-admin="true">Iniciar torneo</button>`);
            acciones.push(`<button class="btn btn-small btn-eliminar" id="btn-eliminar-torneo" data-requiere-admin="true">Eliminar</button>`);
        }
        if (enCurso) {
            acciones.push(`<button class="btn btn-small" id="btn-crear-partido-torneo" data-requiere-admin="true">Crear partido</button>`);
        }
        if (!historico && enCurso) {
            acciones.push(`<button class="btn btn-small btn-finalizar-partido" id="btn-finalizar-torneo" data-requiere-admin="true">Finalizar torneo</button>`);
        }

        const equiposInscritosIds = new Set(equipos.map((e) => String(e.id)));
        const libres = equiposCache.filter((e) => !equiposInscritosIds.has(String(e.id)));

        vistaDetalle.innerHTML = `
            <a class="torneo-volver" href="#">← Todos los torneos</a>

            <div class="torneo-encabezado">
                <h3>${escaparHtml(torneo.name)}</h3>
                <div class="torneo-insignias">${insignias(torneo)}</div>
                <p class="torneo-card-meta">
                    ${historico ? "Torneo protegido: agrupa los partidos anteriores a los torneos." : `${torneo.teamCount ?? equipos.length} equipo(s) inscrito(s)`}
                    ${torneo.createdAt ? ` · Creado: ${formatearFechaHora(torneo.createdAt)}` : ""}
                    ${torneo.startedAt ? ` · Iniciado: ${formatearFechaHora(torneo.startedAt)}` : ""}
                </p>
                <div class="torneo-acciones">${acciones.join("")}</div>
                ${!historico && enCurso && pendientes > 0
                    ? `<p class="torneo-ayuda">Faltan ${pendientes} partido(s) por finalizar para poder finalizar el torneo.</p>` : ""}
                ${!historico && borrador
                    ? `<p class="torneo-ayuda" data-requiere-admin="true">Para iniciar el torneo necesitas al menos 2 equipos inscritos. Al iniciarlo, el formato y las inscripciones quedan bloqueados.</p>` : ""}
                <div id="torneo-aviso" class="torneo-aviso" hidden></div>
            </div>

            <h4 class="torneo-seccion-titulo">Equipos inscritos</h4>
            <div id="torneo-equipos">
                ${historico
                    ? "<p class='torneo-ayuda'>El torneo Histórico no usa inscripción: admite cualquier pareja de equipos.</p>"
                    : equipos.length === 0
                        ? "<p class='torneo-ayuda'>Todavía no hay equipos inscritos.</p>"
                        : `<ul class="torneo-equipos-lista">${equipos.map((e) => `
                            <li>
                                <span>${escaparHtml(e.nombre)}</span>
                                ${borrador ? `<button class="btn btn-small btn-eliminar btn-retirar-equipo" data-requiere-admin="true" data-id="${e.id}">Retirar</button>` : ""}
                            </li>`).join("")}</ul>`}
                ${!historico && borrador ? `
                    <form id="form-inscribir" class="torneo-inscribir" data-requiere-admin="true">
                        <select id="inscribir-equipo" aria-label="Equipo a inscribir">
                            <option value="">Selecciona un equipo para inscribir</option>
                            ${libres.map((e) => `<option value="${e.id}">${escaparHtml(e.nombre)}</option>`).join("")}
                        </select>
                        <button class="btn btn-small" type="submit">Inscribir</button>
                    </form>` : ""}
            </div>

            <!-- Aquí se agregan las secciones propias de cada formato. -->
            <div id="torneo-seccion-formato"></div>

            <h4 class="torneo-seccion-titulo" id="torneo-partidos-titulo">Partidos del torneo</h4>
            <div id="torneo-partidos" class="partidos-container torneo-partidos">
                ${htmlPartidos(torneo, equipos, partidos)}
            </div>
        `;

        conectarAcciones(torneo, equipos, partidos, pendientes);

        // Sección propia del formato. Se rellena al final para que un fallo
        // de la tabla no deje sin pintar el resto del detalle.
        const seccionFormato = document.getElementById("torneo-seccion-formato");
        const recargar = () => abrirDetalle(torneo.id);
        if (torneo.format === "LEAGUE") {
            await renderSeccionLiga(seccionFormato, torneo, partidos, recargar);
        } else if (torneo.format === "KNOCKOUT" || torneo.format === "GROUPS_KNOCKOUT") {
            partidosProtegidos = await renderSeccionEliminatoria(seccionFormato, torneo, equipos, partidos, recargar);
            // Los partidos de las llaves no se eliminan.
            document.querySelectorAll(".btn-eliminar-partido").forEach((boton) => {
                if (partidosProtegidos.has(boton.dataset.id)) boton.remove();
            });
        }
    }

    // Una liga con partidos se muestra por jornadas (una jornada = una fecha).
    function htmlPartidos(torneo, equipos, partidos) {
        if (partidos.length === 0) {
            return "<div class='empty-state'>Este torneo todavía no tiene partidos.</div>";
        }
        if (torneo.format !== "LEAGUE") {
            return partidos.map(tarjetaPartido).join("");
        }
        return agruparPorJornada(partidos, equipos).map((jornada) => `
            <section class="jornada">
                ${htmlEncabezadoJornada(jornada)}
                ${jornada.partidos.map(tarjetaPartido).join("")}
            </section>`).join("");
    }

    function tarjetaPartido(partido) {
        const estado = partido.estado || "PROGRAMADO";
        const golesLocal = Number(partido.golesLocal ?? 0);
        const golesVisitante = Number(partido.golesVisitante ?? 0);
        const penales = partido.penalesLocal != null && partido.penalesVisitante != null
            ? `<span class="partido-penales">(pen. ${partido.penalesLocal} - ${partido.penalesVisitante})</span>` : "";
        const editable = estado !== "FINALIZADO";

        return `
            <article class="partido-card" data-id="${partido.id}">
                <div>
                    <div class="partido-equipos">
                        <span>${escaparHtml(partido.equipoLocal?.nombre || "Equipo local")}</span>
                        <span class="partido-marcador">${golesLocal} - ${golesVisitante}</span>
                        <span>${escaparHtml(partido.equipoVisitante?.nombre || "Equipo visitante")}</span>
                        ${penales}
                    </div>
                    <div class="partido-meta">
                        <span><i class="fas fa-calendar"></i> ${partido.fecha || "Sin fecha"} ${partido.hora || ""}</span>
                        <span class="badge-fase ${partido.fase || ""}">${ETIQUETAS_FASE[partido.fase] || partido.fase || "Sin fase"}</span>
                        <span class="badge-estado badge-estado--${estado.toLowerCase()}">${ETIQUETAS_ESTADO_PARTIDO[estado] || estado}</span>
                    </div>
                </div>
                <div class="partido-actions">
                    <a class="btn btn-small btn-alineacion" href="partidos.html">Ir a Partidos</a>
                    ${necesitaPenales(partido) ? `<button class="btn btn-small btn-penales" data-requiere-admin="true" data-id="${partido.id}">Registrar penales</button>` : ""}
                    ${editable ? `
                        <button class="btn btn-small btn-editar-partido" data-requiere-admin="true" data-id="${partido.id}">Editar</button>
                        <button class="btn btn-small btn-eliminar btn-eliminar-partido" data-requiere-admin="true" data-id="${partido.id}">Eliminar</button>` : ""}
                </div>
            </article>`;
    }

    function conectarAcciones(torneo, equipos, partidos, pendientes) {
        const id = torneo.id;
        const aviso = document.getElementById("torneo-aviso");

        const ejecutar = async (accion, mensajeExito) => {
            try {
                await accion();
                if (mensajeExito) mostrarToast(mensajeExito, "success");
                await abrirDetalle(id);
            } catch (error) {
                mostrarToast(error.message || "No se pudo completar la acción.", "error");
                return error;
            }
            return null;
        };

        document.getElementById("btn-editar-torneo")?.addEventListener("click", () => window.abrirModalTorneo?.(torneo));

        document.getElementById("btn-eliminar-torneo")?.addEventListener("click", async () => {
            if (!window.confirm(`¿Eliminar el torneo "${torneo.name}"? Esta acción no se puede deshacer.`)) return;
            try {
                await TournamentService.eliminarTorneo(id);
                mostrarToast("Torneo eliminado correctamente.", "success");
                window.location.hash = "";
            } catch (error) {
                mostrarToast(error.message || "No se pudo eliminar el torneo.", "error");
            }
        });

        document.getElementById("btn-iniciar-torneo")?.addEventListener("click", async () => {
            if (!window.confirm("¿Iniciar el torneo? El formato y las inscripciones quedarán bloqueados.")) return;
            // Con menos de 2 equipos el servidor responde con su mensaje y el torneo sigue en borrador.
            await ejecutar(() => TournamentService.iniciarTorneo(id), "Torneo iniciado.");
        });

        document.getElementById("btn-crear-partido-torneo")?.addEventListener("click", () =>
            window.abrirModalPartido?.(null, { idTorneo: id }));

        document.getElementById("btn-finalizar-torneo")?.addEventListener("click", async () => {
            if (!window.confirm("¿Finalizar el torneo? Después solo podrá consultarse.")) return;
            const error = await ejecutar(() => TournamentService.finalizarTorneo(id), "Torneo finalizado.");
            if (error) {
                // Partidos pendientes: se ofrece ir a jugarlos o eliminarlos.
                aviso.hidden = false;
                aviso.innerHTML = `
                    <p>${escaparHtml(error.message)}</p>
                    ${pendientes > 0 ? `<p>Partidos sin finalizar en este torneo: <strong>${pendientes}</strong>.</p>` : ""}
                    <a class="btn btn-small" href="partidos.html">Ir a jugarlos en Partidos</a>
                    <button type="button" class="btn btn-small btn-secundario" id="btn-ver-pendientes">Revisar o eliminar aquí</button>`;
                document.getElementById("btn-ver-pendientes").addEventListener("click", () =>
                    document.getElementById("torneo-partidos-titulo").scrollIntoView({ behavior: "smooth" }));
            }
        });

        document.getElementById("form-inscribir")?.addEventListener("submit", async (evento) => {
            evento.preventDefault();
            const teamId = Number(document.getElementById("inscribir-equipo").value);
            if (!teamId) {
                mostrarToast("Selecciona el equipo que quieres inscribir.", "error");
                return;
            }
            await ejecutar(() => TournamentService.inscribirEquipo(id, teamId), "Equipo inscrito.");
        });

        document.querySelectorAll(".btn-retirar-equipo").forEach((boton) => {
            boton.addEventListener("click", async () => {
                const equipo = equipos.find((e) => String(e.id) === boton.dataset.id);
                if (!window.confirm(`¿Retirar a "${equipo?.nombre || "este equipo"}" del torneo?`)) return;
                await ejecutar(() => TournamentService.retirarEquipo(id, boton.dataset.id), "Equipo retirado.");
            });
        });

        document.querySelectorAll(".btn-editar-partido").forEach((boton) => {
            boton.addEventListener("click", () => {
                const partido = partidos.find((p) => String(p.id) === boton.dataset.id);
                if (partido) {
                    window.abrirModalPartido?.(partido, { equiposBloqueados: partidosProtegidos.has(String(partido.id)) });
                }
            });
        });

        document.querySelectorAll(".btn-penales").forEach((boton) => {
            boton.addEventListener("click", () => {
                const partido = partidos.find((p) => String(p.id) === boton.dataset.id);
                if (partido) abrirFormularioPenales(partido, () => abrirDetalle(id));
            });
        });

        document.querySelectorAll(".btn-eliminar-partido").forEach((boton) => {
            boton.addEventListener("click", async () => {
                if (!window.confirm("¿Estás seguro de eliminar este partido? También se eliminarán sus alineaciones, cambios de jugador y estadísticas registradas.")) return;
                await ejecutar(() => PartidoService.eliminarPartido(boton.dataset.id), "Partido eliminado correctamente.");
            });
        });
    }

    await enrutar();
});
