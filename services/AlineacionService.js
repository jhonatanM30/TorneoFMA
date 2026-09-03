import { parsearRespuesta, construirHeaders } from "../js/apiErrors.js";

const API_URL = `${window.APP_CONFIG.API_BASE_URL}/alineaciones`;

// El backend (AlineacionController) solo expone crear y listar por partido:
// no hay editar, ni eliminar, ni "listar todas". Por eso el módulo de
// Alineaciones en el frontend siempre trabaja sobre un partido concreto.
export class AlineacionService {
    static async obtenerPorPartido(idPartido) {
        try {
            const response = await fetch(`${API_URL}/partido/${idPartido}`, {
                method: "GET",
                headers: construirHeaders()
            });

            const payload = await parsearRespuesta(response, "Obtener alineación del partido");
            return Array.isArray(payload) ? payload : [];
        } catch (error) {
            console.error("Error al obtener la alineación del partido:", error);
            throw error;
        }
    }

    static async crearAlineacion(alineacionDTO) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: construirHeaders(),
                body: JSON.stringify(alineacionDTO)
            });

            return await parsearRespuesta(response, "Registrar alineación");
        } catch (error) {
            console.error("Error al registrar la alineación:", error);
            throw error;
        }
    }
}
