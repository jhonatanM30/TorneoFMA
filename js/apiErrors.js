import { Auth } from "./auth.js";

// Utilidad compartida para interpretar los errores que devuelve el backend.
//
// El backend (GlobalExceptionHandler) no siempre responde con la misma
// forma de error, según qué excepción se dispare:
//   - BusinessException / errores 500 genéricos -> ErrorResponseDTO:
//         { "indicadorRespuesta": "Error", "mensaje": "..." }
//   - NotFoundException (equipo no encontrado) -> EquipoDTO parcial:
//         { "indicadorRespuesta": "Sin Registros", "mensaje": "..." }
//   - 404 de recurso inexistente -> { "error": "..." }
//   - 401 / 403 -> { "indicadorRespuesta": "No autorizado" | "Prohibido", "mensaje": "..." }
//   - Validaciones @Valid fallidas (MethodArgumentNotValidException) ->
//         mapa campo -> mensaje, por ejemplo:
//         { "nombre": "El nombre del jugador es obligatorio." }
//
// Esta función normaliza cualquiera de esas formas a un solo mensaje de
// texto legible para mostrar al usuario, para no repetir esta lógica en
// cada Service.
export function extraerMensajeError(payload, fallback = "Ocurrió un error. Por favor intenta de nuevo.") {
    if (!payload || typeof payload !== "object") {
        return fallback;
    }

    if (payload.mensaje) {
        return payload.mensaje;
    }

    if (payload.message) {
        return payload.message;
    }

    if (payload.error) {
        return payload.error;
    }

    // Mapa de validaciones campo -> mensaje: se listan todos los campos con
    // error, no solo el primero, para que el usuario los corrija de una vez.
    const camposConError = Object.keys(payload).filter((clave) => typeof payload[clave] === "string");
    if (camposConError.length > 0) {
        return camposConError.map((campo) => payload[campo]).join(" ");
    }

    return fallback;
}

// Headers comunes para todas las llamadas al backend. Centralizado acá (en
// vez de repetido en cada Service): agrega Authorization: Bearer <token>
// cuando hay sesión (js/auth.js). Las consultas pueden ir con o sin token.
export function construirHeaders() {
    const headers = {
        "Content-Type": "application/json",
        Accept: "application/json"
    };

    const token = Auth.obtenerToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}

// Variante para subir archivos (multipart/form-data): el navegador debe
// fijar el Content-Type con el boundary automáticamente, así que acá NO
// se agrega (a diferencia de construirHeaders()). Usada por la subida del
// escudo del equipo y de las fotos de la galería.
export function construirHeadersMultipart() {
    const headers = { Accept: "application/json" };

    const token = Auth.obtenerToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}

// Lee y parsea la respuesta de un fetch, lanzando un Error con el mensaje
// ya normalizado cuando la respuesta no fue exitosa. Centraliza el patrón
// que antes estaba duplicado en cada método de EquipoService.
export async function parsearRespuesta(response, etiquetaAccion) {
    if (response.status === 204) {
        return null;
    }

    const texto = await response.text();
    let payload = null;
    try {
        payload = texto ? JSON.parse(texto) : null;
    } catch (error) {
        payload = null;
    }

    if (!response.ok) {
        // 401: falta, venció o es inválido el token. Se cierra la sesión local
        // y se lleva al login con el mensaje del propio servidor.
        // 403: sesión válida pero el rol no alcanza; no se cierra la sesión,
        // el mensaje del servidor sube tal cual (ver más abajo).
        if (response.status === 401) {
            const mensajeServidor = payload ? extraerMensajeError(payload, "") : "";
            throw new Error(Auth.manejarNoAutorizado(mensajeServidor));
        }

        const mensaje = payload
            ? extraerMensajeError(payload, `${etiquetaAccion} falló`)
            : (texto || `${etiquetaAccion} falló`);
        throw new Error(mensaje);
    }

    return payload;
}
