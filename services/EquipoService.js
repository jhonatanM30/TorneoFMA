import { parsearRespuesta, construirHeaders } from "../js/apiErrors.js";

// La URL base viene de js/config.js (window.APP_CONFIG), cargado antes que
// este módulo en cada página. Nunca se hardcodea aquí.
const API_URL = `${window.APP_CONFIG.API_BASE_URL}/equipos`;

export class EquipoService {
    static async obtenerEquipos() {
        try {
            const response = await fetch(API_URL, {
                method: "GET",
                headers: construirHeaders()
            });

            return await parsearRespuesta(response, "Obtener equipos");
        } catch (error) {
            console.error("Error al obtener equipos:", error);
            throw error;
        }
    }

    static async buscarEquiposPorNombre(nombre) {
        try {
            const query = encodeURIComponent(nombre.trim());
            const response = await fetch(`${API_URL}/${query}`, {
                method: "GET",
                headers: construirHeaders()
            });

            if (response.status === 404) {
                return [];
            }

            const payload = await parsearRespuesta(response, "Buscar equipo por nombre");
            return Array.isArray(payload) ? payload : payload ? [payload] : [];
        } catch (error) {
            console.error("Error al buscar equipos:", error);
            throw error;
        }
    }

    static async crearEquipo(equipoDTO) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: construirHeaders(),
                body: JSON.stringify(equipoDTO)
            });

            return await parsearRespuesta(response, "Crear equipo");
        } catch (error) {
            console.error("Error al crear equipo:", error);
            throw error;
        }
    }

    static async editarEquipo(equipoDTO) {
        try {
            const response = await fetch(API_URL, {
                method: "PUT",
                headers: construirHeaders(),
                body: JSON.stringify(equipoDTO)
            });

            return await parsearRespuesta(response, "Actualizar equipo");
        } catch (error) {
            console.error("Error al actualizar equipo:", error);
            throw error;
        }
    }

    static async eliminarEquipo(id) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: "DELETE",
                headers: construirHeaders()
            });

            await parsearRespuesta(response, "Eliminar equipo");
            return true;
        } catch (error) {
            console.error("Error al eliminar equipo:", error);
            throw error;
        }
    }
}
