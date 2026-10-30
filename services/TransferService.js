import { parsearRespuesta, construirHeaders } from "../js/apiErrors.js";

const API_URL = `${window.APP_CONFIG.API_BASE_URL}/transfers`;

// Traspasos de jugadores (/api/transfers). Un traspaso se solicita
// (PENDING) y un organizador lo confirma o rechaza; el jugador solo
// cambia de equipo al confirmar. Los mensajes de error ya vienen en
// español desde el backend y los normaliza parsearRespuesta().
export class TransferService {
    // filtros: { status?: "PENDING"|"CONFIRMED"|"REJECTED", playerId?: number }
    static async obtenerTraspasos({ status, playerId } = {}) {
        try {
            const params = new URLSearchParams();
            if (status) params.set("status", status);
            if (playerId) params.set("playerId", playerId);
            const query = params.toString();

            const response = await fetch(query ? `${API_URL}?${query}` : API_URL, {
                method: "GET",
                headers: construirHeaders()
            });

            const payload = await parsearRespuesta(response, "Obtener traspasos");
            return Array.isArray(payload) ? payload : [];
        } catch (error) {
            console.error("Error al obtener traspasos:", error);
            throw error;
        }
    }

    // transferencia: { playerId, destinationTeamId, destinationDorsal? }
    static async solicitarTraspaso(transferencia) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: construirHeaders(),
                body: JSON.stringify(transferencia)
            });

            return await parsearRespuesta(response, "Solicitar traspaso");
        } catch (error) {
            console.error("Error al solicitar traspaso:", error);
            throw error;
        }
    }

    static async confirmarTraspaso(id) {
        return TransferService.#resolver(id, "confirm", "Confirmar traspaso");
    }

    static async rechazarTraspaso(id) {
        return TransferService.#resolver(id, "reject", "Rechazar traspaso");
    }

    static async #resolver(id, accion, etiqueta) {
        try {
            const response = await fetch(`${API_URL}/${id}/${accion}`, {
                method: "POST",
                headers: construirHeaders()
            });

            return await parsearRespuesta(response, etiqueta);
        } catch (error) {
            console.error(`Error en "${etiqueta}":`, error);
            throw error;
        }
    }
}
