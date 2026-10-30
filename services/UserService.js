import { parsearRespuesta, construirHeaders } from "../js/apiErrors.js";

const API_URL = `${window.APP_CONFIG.API_BASE_URL}/users`;

// Usuarios del sistema (/api/users). Solo el ADMIN puede usarlo; el backend
// nunca devuelve contraseña ni hash.
export class UserService {
    static async obtenerUsuarios() {
        try {
            const response = await fetch(API_URL, { method: "GET", headers: construirHeaders() });
            const payload = await parsearRespuesta(response, "Obtener usuarios");
            return Array.isArray(payload) ? payload : [];
        } catch (error) {
            console.error("Error al obtener usuarios:", error.message);
            throw error;
        }
    }

    // usuario: { username, password, role?: "DT"|"ADMIN", teamId? }
    static async crearUsuario(usuario) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: construirHeaders(),
                body: JSON.stringify(usuario)
            });
            return await parsearRespuesta(response, "Crear usuario");
        } catch (error) {
            console.error("Error al crear usuario:", error.message);
            throw error;
        }
    }

    // teamId null quita el equipo del DT.
    static async asignarEquipo(id, teamId) {
        try {
            const response = await fetch(`${API_URL}/${id}/team`, {
                method: "PUT",
                headers: construirHeaders(),
                body: JSON.stringify({ teamId })
            });
            return await parsearRespuesta(response, "Asignar equipo");
        } catch (error) {
            console.error("Error al asignar equipo:", error.message);
            throw error;
        }
    }
}
