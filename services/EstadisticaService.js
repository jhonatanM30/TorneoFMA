import { parsearRespuesta, construirHeaders } from "../js/apiErrors.js";

const API_URL = `${window.APP_CONFIG.API_BASE_URL}/estadisticas`;

// Hallazgo post-despliegue (fase9): el backend ahora también expone PUT
// /{id} (editar) y GET /buscar (detectar un registro existente para un
// jugador+partido), además de listar/obtener/crear/eliminar.
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

    // Hallazgo post-despliegue (fase9): "una vez creado un registro de
    // estadisticas para un jugador en un partido, las siguientes... se
    // puede gestionar desde el mismo registro". Se usa antes de abrir el
    // modal de creación para saber si en realidad hay que abrirlo en modo
    // edición. Devuelve null si todavía no existe ningún registro (204).
    static async buscarExistente(idJugador, idPartido) {
        try {
            const response = await fetch(`${API_URL}/buscar?idJugador=${idJugador}&idPartido=${idPartido}`, {
                method: "GET",
                headers: construirHeaders()
            });

            return await parsearRespuesta(response, "Buscar estadística existente");
        } catch (error) {
            console.error("Error al buscar estadística existente:", error);
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

    // Hallazgo post-despliegue (fase9): "se puede editar... un registro de
    // estadistica y verse reflejado en el partido".
    static async editarEstadistica(id, estadisticaDTO) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: "PUT",
                headers: construirHeaders(),
                body: JSON.stringify(estadisticaDTO)
            });

            return await parsearRespuesta(response, "Editar estadística");
        } catch (error) {
            console.error("Error al editar estadística:", error);
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
