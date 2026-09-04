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
    // Usa GET /api/partidos/buscar?nombre=... (coincidencia parcial), no
    // GET /api/partidos/{nombre} (match exacto): mismo ajuste que
    // EquipoService.buscarEquiposPorNombre (FRONTEND_VISION.md Fase3).
    static async buscarPartidosPorEquipo(nombre) {
        try {
            const query = encodeURIComponent(nombre.trim());
            const response = await fetch(`${API_URL}/buscar?nombre=${query}`, {
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

    // FRONTEND_VISION.md Fase3: "un partido se deberia permitir Editar".
    static async editarPartido(partidoDTO) {
        try {
            const response = await fetch(API_URL, {
                method: "PUT",
                headers: construirHeaders(),
                body: JSON.stringify(partidoDTO)
            });

            return await parsearRespuesta(response, "Actualizar partido");
        } catch (error) {
            console.error("Error al actualizar partido:", error);
            throw error;
        }
    }

    // FRONTEND_VISION.md Fase3-09: marca el partido como en curso (habilita
    // registrar cambios de jugador y minuto en las estadisticas).
    static async iniciarPartido(id) {
        try {
            const response = await fetch(`${API_URL}/${id}/iniciar`, {
                method: "PUT",
                headers: construirHeaders()
            });

            return await parsearRespuesta(response, "Iniciar partido");
        } catch (error) {
            console.error("Error al iniciar el partido:", error);
            throw error;
        }
    }

    static async finalizarPartido(id) {
        try {
            const response = await fetch(`${API_URL}/${id}/finalizar`, {
                method: "PUT",
                headers: construirHeaders()
            });

            return await parsearRespuesta(response, "Finalizar partido");
        } catch (error) {
            console.error("Error al finalizar el partido:", error);
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
