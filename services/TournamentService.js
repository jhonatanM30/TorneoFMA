import { parsearRespuesta, construirHeaders } from "../js/apiErrors.js";

const API_URL = `${window.APP_CONFIG.API_BASE_URL}/tournaments`;

// Torneos (/api/tournaments). Las consultas son públicas; las escrituras
// exigen un ADMIN. Los mensajes de error ya vienen en español desde el
// backend y los normaliza parsearRespuesta().
export class TournamentService {
    static async #pedir(ruta, etiqueta, { method = "GET", body } = {}) {
        try {
            const response = await fetch(`${API_URL}${ruta}`, {
                method,
                headers: construirHeaders(),
                ...(body !== undefined ? { body: JSON.stringify(body) } : {})
            });
            return await parsearRespuesta(response, etiqueta);
        } catch (error) {
            console.error(`Error en "${etiqueta}":`, error.message);
            throw error;
        }
    }

    static async #lista(ruta, etiqueta) {
        const payload = await TournamentService.#pedir(ruta, etiqueta);
        return Array.isArray(payload) ? payload : [];
    }

    // --- Consultas ---------------------------------------------------------
    static obtenerTorneos() {
        return TournamentService.#lista("", "Obtener torneos");
    }

    static obtenerTorneo(id) {
        return TournamentService.#pedir(`/${id}`, "Obtener torneo");
    }

    static obtenerEquipos(id) {
        return TournamentService.#lista(`/${id}/teams`, "Obtener equipos del torneo");
    }

    static obtenerPartidos(id) {
        return TournamentService.#lista(`/${id}/matches`, "Obtener partidos del torneo");
    }

    // Tabla de posiciones de una liga (el servidor ya la devuelve ordenada).
    static obtenerTabla(id) {
        return TournamentService.#lista(`/${id}/standings`, "Obtener tabla de posiciones");
    }

    // --- Escrituras (ADMIN) -------------------------------------------------
    // torneo: { name, format }
    static crearTorneo(torneo) {
        return TournamentService.#pedir("", "Crear torneo", { method: "POST", body: torneo });
    }

    static editarTorneo(id, torneo) {
        return TournamentService.#pedir(`/${id}`, "Actualizar torneo", { method: "PUT", body: torneo });
    }

    static async eliminarTorneo(id) {
        await TournamentService.#pedir(`/${id}`, "Eliminar torneo", { method: "DELETE" });
        return true;
    }

    static inscribirEquipo(id, teamId) {
        return TournamentService.#pedir(`/${id}/teams`, "Inscribir equipo", { method: "POST", body: { teamId } });
    }

    static async retirarEquipo(id, teamId) {
        await TournamentService.#pedir(`/${id}/teams/${teamId}`, "Retirar equipo", { method: "DELETE" });
        return true;
    }

    // Calendario automático de una liga: { startDate, time, intervalDays? }
    static async generarCalendario(id, datos) {
        const payload = await TournamentService.#pedir(`/${id}/schedule`, "Generar calendario", { method: "POST", body: datos });
        return Array.isArray(payload) ? payload : [];
    }

    static iniciarTorneo(id) {
        return TournamentService.#pedir(`/${id}/start`, "Iniciar torneo", { method: "POST" });
    }

    static finalizarTorneo(id) {
        return TournamentService.#pedir(`/${id}/finish`, "Finalizar torneo", { method: "POST" });
    }
}
