import { parsearRespuesta, construirHeaders } from "../js/apiErrors.js";

const API_URL = `${window.APP_CONFIG.API_BASE_URL}/alineaciones`;

// Hallazgo post-despliegue (fase9): el backend ahora también expone PUT y
// DELETE /{idPartido}/{idJugador} (editar titular/suplente y quitar de la
// alineación), restringidos a partidos que aún no iniciaron. Antes solo
// existían crear y listar por partido.
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

    // Hallazgo post-despliegue (fase9): "se deberia permitir editar la
    // alineacion un suplente pase a titular y viceversa".
    static async actualizarAlineacion(idPartido, idJugador, titular) {
        try {
            const response = await fetch(`${API_URL}/${idPartido}/${idJugador}`, {
                method: "PUT",
                headers: construirHeaders(),
                body: JSON.stringify({ idPartido: Number(idPartido), idJugador: Number(idJugador), titular })
            });

            return await parsearRespuesta(response, "Editar alineación");
        } catch (error) {
            console.error("Error al editar la alineación:", error);
            throw error;
        }
    }

    // Hallazgo post-despliegue (fase9): "eliminar un jugador de la
    // alineación si el partido no ha iniciado".
    static async eliminarAlineacion(idPartido, idJugador) {
        try {
            const response = await fetch(`${API_URL}/${idPartido}/${idJugador}`, {
                method: "DELETE",
                headers: construirHeaders()
            });

            await parsearRespuesta(response, "Eliminar jugador de la alineación");
            return true;
        } catch (error) {
            console.error("Error al eliminar el jugador de la alineación:", error);
            throw error;
        }
    }
}
