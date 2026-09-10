import { parsearRespuesta, construirHeaders, construirHeadersMultipart } from "../js/apiErrors.js";

const API_URL = `${window.APP_CONFIG.API_BASE_URL}/galeria`;

// Hallazgo post-despliegue (fase9): "Poder desde configuraciones subir
// fotos y que aparezcan alli y se guarden donde estan las actuales que se
// muestran y que sea en especie de carrusel". Nuevo servicio para el
// backend nuevo (ImagenGaleriaController): listar/subir/eliminar fotos
// del carrusel de Inicio. Mismo patrón de subida que
// EquipoService.subirImagenEquipo (multipart/form-data).
export class GaleriaService {
    static async obtenerGaleria() {
        try {
            const response = await fetch(API_URL, {
                method: "GET",
                headers: construirHeaders()
            });

            const payload = await parsearRespuesta(response, "Obtener galería");
            return Array.isArray(payload) ? payload : [];
        } catch (error) {
            console.error("Error al obtener la galería:", error);
            throw error;
        }
    }

    static async subirImagen(archivo) {
        try {
            const formData = new FormData();
            formData.append("imagen", archivo);

            const response = await fetch(API_URL, {
                method: "POST",
                headers: construirHeadersMultipart(),
                body: formData
            });

            return await parsearRespuesta(response, "Subir imagen a la galería");
        } catch (error) {
            console.error("Error al subir la imagen a la galería:", error);
            throw error;
        }
    }

    static async eliminarImagen(id) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: "DELETE",
                headers: construirHeaders()
            });

            await parsearRespuesta(response, "Eliminar imagen de la galería");
            return true;
        } catch (error) {
            console.error("Error al eliminar la imagen de la galería:", error);
            throw error;
        }
    }
}
