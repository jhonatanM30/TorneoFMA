import { parsearRespuesta, construirHeaders } from "../js/apiErrors.js";

const API_URL = `${window.APP_CONFIG.API_BASE_URL}/estadisticas`;

// El backend (EstadisticaController) solo expone listar, obtener por id,
// crear y eliminar: no hay PUT, así que este servicio (y el modal) no
// ofrecen edición, a diferencia de Equipo/Jugador.
export class EstadisticaService {
    static async obtenerEstadisticas() {
        try {
            const response = await fetch(API_URL, {
                method: "GET",
                headers: construirHeaders()
            });

            return await parsearRespuesta(response, "Obtener estadísticas");
        } catch (error) {
            console.error("Error al obtener estadísticas:", error);
            throw error;
        }
    }

    static async crearEstadistica(estadisticaDTO) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: construirHeaders(),
                body: JSON.stringify(estadisticaDTO)
            });

            return await parsearRespuesta(response, "Registrar estadística");
        } catch (error) {
            console.error("Error al registrar estadística:", error);
            throw error;
        }
    }

    static async eliminarEstadistica(id) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: "DELETE",
                headers: construirHeaders()
            });

            await parsearRespuesta(response, "Eliminar estadística");
            return true;
        } catch (error) {
            console.error("Error al eliminar estadística:", error);
            throw error;
        }
    }
}
