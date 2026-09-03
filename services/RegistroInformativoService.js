import { parsearRespuesta, construirHeaders } from "../js/apiErrors.js";

const API_URL = `${window.APP_CONFIG.API_BASE_URL}/registros-informativos`;

// El backend (RegistroInformativoController) solo expone listar, crear y
// eliminar: no hay edición (PUT), tal como pide FRONTEND_VISION.md Fase6
// ("Deberia permitir crear y eliminar especies de blog").
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
