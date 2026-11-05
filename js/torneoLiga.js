import { TournamentService } from "../services/TournamentService.js";
import { abrirFormulario } from "./modalFormulario.js";
import { htmlTablaPosiciones } from "./torneoTabla.js";
import { mostrarToast } from "./toast.js";
import { escaparHtml } from "./formatos.js";

// Una jornada es una fecha: todos los partidos con la misma `fecha` forman
// una jornada y la jornada 1 es la fecha más antigua (el backend no guarda
// número de jornada). Con equipos impares, descansa quien no juega esa fecha.
export function agruparPorJornada(partidos, equipos) {
    const porFecha = new Map();
    partidos.forEach((partido) => {
        const clave = partido.fecha || "";
        if (!porFecha.has(clave)) porFecha.set(clave, []);
        porFecha.get(clave).push(partido);
    });

    return [...porFecha.keys()].sort().map((fecha, indice) => {
        const delDia = porFecha.get(fecha);
        const juegan = new Set();
        delDia.forEach((p) => {
            juegan.add(String(p.idEquipoLocal ?? p.equipoLocal?.id));
            juegan.add(String(p.idEquipoVisitante ?? p.equipoVisitante?.id));
        });
        const descansan = equipos.length % 2 === 1
            ? equipos.filter((e) => !juegan.has(String(e.id))).map((e) => e.nombre)
            : [];
        return { numero: indice + 1, fecha, partidos: delDia, descansan };
    });
}

export function htmlEncabezadoJornada(jornada) {
    return `
        <div class="jornada-encabezado">
            <strong>Jornada ${jornada.numero}</strong>
            <span>${escaparHtml(jornada.fecha || "Sin fecha")}</span>
            ${jornada.descansan.length > 0 ? `<span class="jornada-descansa">Descansa: ${jornada.descansan.map(escaparHtml).join(", ")}</span>` : ""}
        </div>`;
}

// Sección propia de un torneo LEAGUE: tabla de posiciones (siempre visible,
// también en borrador, con todos en 0) y el botón de calendario automático.
export async function renderSeccionLiga(contenedor, torneo, partidos, recargar) {
    const puedeGenerar = torneo.status === "IN_PROGRESS" && partidos.length === 0;

    contenedor.innerHTML = `
        <h4 class="torneo-seccion-titulo">Tabla de posiciones</h4>
        <div id="liga-tabla"><div class="loading-state">Cargando tabla...</div></div>

        ${puedeGenerar ? `
            <h4 class="torneo-seccion-titulo">Calendario</h4>
            <div class="torneo-calendario-vacio" data-requiere-admin="true">
                <p class="torneo-ayuda">
                    La liga todavía no tiene partidos. Genera el calendario automático (todos contra
                    todos, una vuelta) o crea los partidos a mano con "Crear partido".
                </p>
                <button class="btn" id="btn-generar-calendario">Generar calendario</button>
            </div>` : ""}
    `;

    const tabla = contenedor.querySelector("#liga-tabla");
    try {
        tabla.innerHTML = htmlTablaPosiciones(await TournamentService.obtenerTabla(torneo.id));
    } catch (error) {
        tabla.innerHTML = `<div class="empty-state">No se pudo cargar la tabla.<br>${escaparHtml(error.message)}</div>`;
    }

    contenedor.querySelector("#btn-generar-calendario")?.addEventListener("click", () => {
        abrirFormulario({
            titulo: "Generar calendario",
            ayuda: "Todos contra todos, una sola vuelta. Cada jornada cae el intervalo indicado después de la anterior y todos los partidos usan la misma hora. Si algún equipo ya juega en una de esas fechas, no se crea ninguno.",
            textoEnviar: "Generar",
            campos: [
                { name: "startDate", label: "Fecha de inicio", type: "date", required: true, min: new Date().toISOString().slice(0, 10) },
                { name: "time", label: "Hora de los partidos", type: "time", required: true },
                { name: "intervalDays", label: "Días entre jornadas (opcional)", type: "number", min: 1, max: 30, step: 1, placeholder: "7" }
            ],
            alEnviar: async (valores) => {
                const creados = await TournamentService.generarCalendario(torneo.id, valores);
                mostrarToast(`Calendario generado: ${creados.length} partido(s).`, "success");
                await recargar();
            }
        });
    });
}
