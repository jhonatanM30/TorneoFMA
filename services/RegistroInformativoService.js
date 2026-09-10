import { parsearRespuesta, construirHeaders } from "../js/apiErrors.js";

const API_URL = `${window.APP_CONFIG.API_BASE_URL}/registros-informativos`;

// Hallazgo post-despliegue (fase9): "deberia permitir editar" - el
// backend ahora expone PUT /{id} además de listar, crear y eliminar.
export class RegistroInformativoService {
    static async obtenerRegistros() {
        try {
            const response = await fetch(API_URL, {
                method: "GET",
                headers: construirHeaders()
            });

            return await parsearRespuesta(response, "Obtener registros informativos");
        } catch (error) {
            console.error("Error al obtener registros informativos:", error);
            throw error;
        }
    }

    static async crearRegistro(registroDTO) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: construirHeaders(),
                body: JSON.stringify(registroDTO)
            });

            return await parsearRespuesta(response, "Crear registro informativo");
        } catch (error) {
            console.error("Error al crear registro informativo:", error);
            throw error;
        }
    }

    static async editarRegistro(id, registroDTO) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: "PUT",
                headers: construirHeaders(),
                body: JSON.stringify(registroDTO)
            });

            return await parsearRespuesta(response, "Editar registro informativo");
        } catch (error) {
            console.error("Error al editar registro informativo:", error);
            throw error;
        }
    }

    static async eliminarRegistro(id) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: "DELETE",
                headers: construirHeaders()
            });

            await parsearRespuesta(response, "Eliminar registro informativo");
            return true;
        } catch (error) {
            console.error("Error al eliminar registro informativo:", error);
            throw error;
        }
    }
}
