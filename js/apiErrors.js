// Utilidad compartida para interpretar los errores que devuelve el backend.
//
// El backend (GlobalExceptionHandler) no siempre responde con la misma
// forma de error, según qué excepción se dispare:
//   - BusinessException / errores 500 genéricos -> ErrorResponseDTO:
//         { "indicadorRespuesta": "Error", "mensaje": "..." }
//   - NotFoundException (equipo no encontrado) -> EquipoDTO parcial:
//         { "indicadorRespuesta": "Sin Registros", "mensaje": "..." }
//   - JugadorNotFoundException ->
//         { "error": "..." }
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
// vez de repetido en cada Service) para que agregar autenticación en el
// futuro sea un cambio en un solo lugar: ver AUTH_TOKEN en js/config.js.
export function construirHeaders() {
    const headers = {
        "Content-Type": "application/json",
        Accept: "application/json"
    };

    if (window.APP_CONFIG?.AUTH_TOKEN) {
        headers.Authorization = `Bearer ${window.APP_CONFIG.AUTH_TOKEN}`;
    }

    return headers;
}

// Variante para subir archivos (multipart/form-data): el navegador debe
// fijar el Content-Type con el boundary automáticamente, así que acá NO
// se agrega (a diferencia de construirHeaders()). Usada por la subida del
// escudo del equipo (FRONTEND_VISION.md Fase1).
export function construirHeadersMultipart() {
    const headers = { Accept: "application/json" };

    if (window.APP_CONFIG?.AUTH_TOKEN) {
        headers.Authorization = `Bearer ${window.APP_CONFIG.AUTH_TOKEN}`;
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
        const mensaje = payload
            ? extraerMensajeError(payload, `${etiquetaAccion} falló`)
            : (texto || `${etiquetaAccion} falló`);
        throw new Error(mensaje);
    }

    return payload;
}
