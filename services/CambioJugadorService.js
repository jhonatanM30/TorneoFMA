import { parsearRespuesta, construirHeaders } from "../js/apiErrors.js";

const API_URL = `${window.APP_CONFIG.API_BASE_URL}/partidos`;

// El backend (CambioJugadorController) anida estos endpoints bajo
// /api/partidos/{idPartido}/cambios: un cambio no tiene sentido fuera del
// contexto de un partido. Solo expone listar y crear (no editar/eliminar).
export class CambioJugadorService {
    static async obtenerPorPartido(idPartido) {
        try {
            const response = await fetch(`${API_URL}/${idPartido}/cambios`, {
                method: "GET",
                headers: construirHeaders()
            });

            return await parsearRespuesta(response, "Obtener cambios del partido");
        } catch (error) {
            console.error("Error al obtener cambios del partido:", error);
            throw error;
        }
    }

    static async registrarCambio(idPartido, cambioDTO) {
        try {
            const response = await fetch(`${API_URL}/${idPartido}/cambios`, {
                method: "POST",
                headers: construirHeaders(),
                body: JSON.stringify(cambioDTO)
            });

            return await parsearRespuesta(response, "Registrar cambio de jugador");
        } catch (error) {
            console.error("Error al registrar cambio de jugador:", error);
            throw error;
        }
    }
}
