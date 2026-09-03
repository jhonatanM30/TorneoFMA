import { parsearRespuesta, construirHeaders } from "../js/apiErrors.js";

const API_URL = `${window.APP_CONFIG.API_BASE_URL}/partidos`;

export class PartidoService {
    static async obtenerPartidos() {
        try {
            const response = await fetch(API_URL, {
                method: "GET",
                headers: construirHeaders()
            });

            return await parsearRespuesta(response, "Obtener partidos");
        } catch (error) {
            console.error("Error al obtener partidos:", error);
            throw error;
        }
    }

    // GET /api/partidos/{nombre}: partidos (local o visitante) de un equipo.
    static async buscarPartidosPorEquipo(nombre) {
        try {
            const query = encodeURIComponent(nombre.trim());
            const response = await fetch(`${API_URL}/${query}`, {
                method: "GET",
                headers: construirHeaders()
            });

            const payload = await parsearRespuesta(response, "Buscar partidos por equipo");
            return Array.isArray(payload) ? payload : payload ? [payload] : [];
        } catch (error) {
            console.error("Error al buscar partidos:", error);
            throw error;
        }
    }

    static async crearPartido(partidoDTO) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: construirHeaders(),
                body: JSON.stringify(partidoDTO)
            });

            return await parsearRespuesta(response, "Crear partido");
        } catch (error) {
            console.error("Error al crear partido:", error);
            throw error;
        }
    }

    static async eliminarPartido(id) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: "DELETE",
                headers: construirHeaders()
            });

            await parsearRespuesta(response, "Eliminar partido");
            return true;
        } catch (error) {
            console.error("Error al eliminar partido:", error);
            throw error;
        }
    }
}
