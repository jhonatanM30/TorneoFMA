import { parsearRespuesta, construirHeaders } from "../js/apiErrors.js";

const API_URL = `${window.APP_CONFIG.API_BASE_URL}/jugadores`;

export class JugadorService {
    static async obtenerJugadores() {
        try {
            const response = await fetch(API_URL, {
                method: "GET",
                headers: construirHeaders()
            });

            return await parsearRespuesta(response, "Obtener jugadores");
        } catch (error) {
            console.error("Error al obtener jugadores:", error);
            throw error;
        }
    }

    // El backend responde 400 (no 404) cuando no encuentra jugadores con ese
    // nombre (ver JugadorService.obtenerJugadorPorNombre en el backend, que
    // lanza BusinessException). Se interpreta igual que "sin resultados".
    static async buscarJugadoresPorNombre(nombre) {
        try {
            const query = encodeURIComponent(nombre.trim());
            const response = await fetch(`${API_URL}/${query}`, {
                method: "GET",
                headers: construirHeaders()
            });

            if (response.status === 400) {
                return [];
            }

            const payload = await parsearRespuesta(response, "Buscar jugador por nombre");
            return Array.isArray(payload) ? payload : payload ? [payload] : [];
        } catch (error) {
            console.error("Error al buscar jugadores:", error);
            throw error;
        }
    }

    static async crearJugador(jugadorDTO) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: construirHeaders(),
                body: JSON.stringify(jugadorDTO)
            });

            return await parsearRespuesta(response, "Crear jugador");
        } catch (error) {
            console.error("Error al crear jugador:", error);
            throw error;
        }
    }

    // Creación en lote (POST /api/jugadores/batch, Fase "batch" ya
    // implementada en el backend): procesamiento optimista jugador por
    // jugador, útil para cargar la plantilla completa de un equipo de una
    // sola vez. Devuelve JugadorBatchResponseDTO {total, exitosos, fallidos,
    // resultados: [{indice, exito, jugador?, error?}]}.
    static async crearJugadoresEnLote(jugadoresDTO) {
        try {
            const response = await fetch(`${API_URL}/batch`, {
                method: "POST",
                headers: construirHeaders(),
                body: JSON.stringify(jugadoresDTO)
            });

            return await parsearRespuesta(response, "Crear jugadores en lote");
        } catch (error) {
            console.error("Error al crear jugadores en lote:", error);
            throw error;
        }
    }

    static async editarJugador(jugadorDTO) {
        try {
            const response = await fetch(API_URL, {
                method: "PUT",
                headers: construirHeaders(),
                body: JSON.stringify(jugadorDTO)
            });

            return await parsearRespuesta(response, "Actualizar jugador");
        } catch (error) {
            console.error("Error al actualizar jugador:", error);
            throw error;
        }
    }

    static async eliminarJugador(id) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: "DELETE",
                headers: construirHeaders()
            });

            await parsearRespuesta(response, "Eliminar jugador");
            return true;
        } catch (error) {
            console.error("Error al eliminar jugador:", error);
            throw error;
        }
    }
}
