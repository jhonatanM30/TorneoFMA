import { EquipoDTO } from "../dto/EquipoDTO.js";

const API_URL = "http://localhost:8080/equipos";

export class EquipoService {
    static async obtenerEquipos() {
        try {
            const response = await fetch(API_URL);
            return await response.json();
        } catch (error) {
            console.error("Error al obtener equipos:", error);
            return [];
        }
    }

    static async crearEquipo(equipoDTO) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(equipoDTO)
            });

            if (!response.ok) throw new Error("Error al crear equipo");
            return await response.json();
        } catch (error) {
            console.error("Error al crear equipo:", error);
            return null;
        }
    }
}
