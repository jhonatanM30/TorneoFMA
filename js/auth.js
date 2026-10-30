// Sesión del usuario (add-authentication-roles.md): login, token,
// renovación por actividad y cierre de sesión.
//
// Cada página del sitio es un documento HTML distinto, así que la memoria se
// reinicia al navegar. Para no obligar a iniciar sesión en cada página, la
// sesión (token de 3 minutos, usuario y vencimiento) se respalda en
// sessionStorage: sobrevive a recargas y cambios de página en la misma
// pestaña y se pierde al cerrarla. Nunca va a localStorage, a la URL ni a la
// consola, y el token no se expone en window.
//
// Pendiente ideal (requiere backend): refresh token en cookie HttpOnly.
//
// Este módulo no importa nada de apiErrors.js a propósito (apiErrors.js sí
// lo importa a él), para no crear una dependencia circular.

const ANTICIPO_RENOVACION_MS = 60 * 1000;
const INTERVALO_REVISION_MS = 5 * 1000;
const ESPERA_TRAS_FALLO_RED_MS = 15 * 1000;
const EVENTOS_ACTIVIDAD = ["click", "keydown", "mousemove", "touchstart", "scroll"];

const MENSAJE_SESION_EXPIRADA = "Tu sesión expiró. Inicia sesión de nuevo.";
const MENSAJE_SIN_SESION = "Debes iniciar sesión para realizar esta acción.";

let token = null;
let usuario = null;
let venceEn = 0;
let emitidoEn = 0;
let ultimaActividad = 0;
let renovando = null;
let noRenovarAntesDe = 0;
let temporizador = null;
const oyentes = new Set();

const CLAVE_STORAGE = "mqa-sesion";

function respaldarSesion() {
    try {
        sessionStorage.setItem(CLAVE_STORAGE, JSON.stringify({ token, usuario, venceEn, emitidoEn }));
    } catch (error) {
        // Almacenamiento bloqueado o lleno: la sesión sigue en memoria.
    }
}

function borrarRespaldo() {
    try {
        sessionStorage.removeItem(CLAVE_STORAGE);
    } catch (error) {
        // Nada que hacer.
    }
}

// Se ejecuta al cargar el módulo, antes de que cualquier página pida datos.
function restaurarSesion() {
    try {
        const guardado = JSON.parse(sessionStorage.getItem(CLAVE_STORAGE) || "null");
        if (guardado?.token && guardado.usuario && guardado.venceEn > Date.now()) {
            ({ token, usuario, venceEn, emitidoEn } = guardado);
            iniciarVigilancia();
        } else if (guardado) {
            borrarRespaldo();
        }
    } catch (error) {
        borrarRespaldo();
    }
}

function apiUrl(ruta) {
    return `${window.APP_CONFIG.API_BASE_URL}${ruta}`;
}

function notificar(evento) {
    oyentes.forEach((oyente) => {
        try {
            oyente(evento);
        } catch (error) {
            console.error("Error en un oyente de sesión:", error.message);
        }
    });
}

async function leerJson(response) {
    const texto = await response.text();
    try {
        return texto ? JSON.parse(texto) : null;
    } catch (error) {
        return null;
    }
}

function mensajeDe(payload, respaldo) {
    if (payload && typeof payload === "object") {
        if (payload.mensaje) return payload.mensaje;
        if (payload.error) return payload.error;
        // Validación de campos: mapa campo -> mensaje.
        const campos = Object.values(payload).filter((valor) => typeof valor === "string");
        if (campos.length > 0) return campos.join(" ");
    }
    return respaldo;
}

function aplicarSesion(datos) {
    token = datos.token;
    usuario = datos.user;
    emitidoEn = Date.now();
    venceEn = emitidoEn + Number(datos.expiresInSeconds) * 1000;
    noRenovarAntesDe = 0;
    respaldarSesion();
    iniciarVigilancia();
}

function limpiarSesion() {
    token = null;
    usuario = null;
    venceEn = 0;
    emitidoEn = 0;
    renovando = null;
    borrarRespaldo();
    detenerVigilancia();
}

function registrarActividad() {
    ultimaActividad = Date.now();
    // Si ya estamos en la ventana de renovación, no esperar al próximo
    // chequeo periódico.
    if (token) revisarSesion();
}

function iniciarVigilancia() {
    if (temporizador) return;
    EVENTOS_ACTIVIDAD.forEach((nombre) =>
        window.addEventListener(nombre, registrarActividad, { passive: true }));
    window.addEventListener("focus", registrarActividad);
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    temporizador = window.setInterval(revisarSesion, INTERVALO_REVISION_MS);
}

function detenerVigilancia() {
    if (!temporizador) return;
    window.clearInterval(temporizador);
    temporizador = null;
    EVENTOS_ACTIVIDAD.forEach((nombre) => window.removeEventListener(nombre, registrarActividad));
    window.removeEventListener("focus", registrarActividad);
    document.removeEventListener("visibilitychange", alCambiarVisibilidad);
}

function alCambiarVisibilidad() {
    if (!document.hidden) registrarActividad();
}

// Corre cada pocos segundos y ante cada actividad. La renovación solo se
// dispara si hubo actividad del usuario desde que se emitió el token actual:
// sin actividad el token vence y la sesión se cierra sola.
function revisarSesion() {
    if (!token) return;
    const ahora = Date.now();

    if (ahora >= venceEn) {
        cerrarPorExpiracion(MENSAJE_SESION_EXPIRADA);
        return;
    }

    const hayActividadReciente = ultimaActividad > emitidoEn;
    if (venceEn - ahora <= ANTICIPO_RENOVACION_MS && hayActividadReciente && ahora >= noRenovarAntesDe) {
        renovar();
    }
}

function cerrarPorExpiracion(mensaje) {
    limpiarSesion();
    notificar({ tipo: "expirada", mensaje });
}

async function renovar() {
    if (renovando) return renovando;
    const tokenEnviado = token;

    renovando = (async () => {
        try {
            const response = await fetch(apiUrl("/auth/refresh"), {
                method: "POST",
                headers: { Accept: "application/json", Authorization: `Bearer ${tokenEnviado}` }
            });
            const payload = await leerJson(response);

            if (tokenEnviado !== token) return; // la sesión cambió mientras tanto

            if (response.status === 401) {
                // No se reintenta un refresh que respondió 401.
                cerrarPorExpiracion(mensajeDe(payload, MENSAJE_SESION_EXPIRADA));
                return;
            }
            if (!response.ok) {
                noRenovarAntesDe = Date.now() + ESPERA_TRAS_FALLO_RED_MS;
                return;
            }
            aplicarSesion(payload);
            notificar({ tipo: "renovada", usuario });
        } catch (error) {
            // Sin conexión: se reintenta pasado un rato, mientras el token
            // siga vigente.
            noRenovarAntesDe = Date.now() + ESPERA_TRAS_FALLO_RED_MS;
        } finally {
            renovando = null;
        }
    })();

    return renovando;
}

export const Auth = {
    obtenerToken: () => token,
    obtenerUsuario: () => usuario,
    haySesion: () => Boolean(token),
    esAdmin: () => usuario?.role === "ADMIN",
    esDT: () => usuario?.role === "DT",
    // DT con equipo asignado puede solicitar traspasos hacia ese equipo.
    puedeSolicitarTraspaso: () =>
        usuario?.role === "ADMIN" || (usuario?.role === "DT" && usuario.teamId != null),
    dtSinEquipo: () => usuario?.role === "DT" && usuario.teamId == null,

    // Devuelve una función para dejar de escuchar. Eventos:
    // { tipo: "login" | "logout" | "renovada" | "expirada" | "no-autorizado", ... }
    alCambiar(oyente) {
        oyentes.add(oyente);
        return () => oyentes.delete(oyente);
    },

    async iniciarSesion(username, password) {
        const response = await fetch(apiUrl("/auth/login"), {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ username, password })
        });
        const payload = await leerJson(response);

        if (!response.ok) {
            throw new Error(mensajeDe(payload, "No se pudo iniciar sesión. Intenta de nuevo."));
        }

        aplicarSesion(payload);
        ultimaActividad = Date.now();
        notificar({ tipo: "login", usuario });
        return usuario;
    },

    cerrarSesion() {
        limpiarSesion();
        notificar({ tipo: "logout" });
    },

    // Lo invoca parsearRespuesta() ante un 401 fuera del login: borra token y
    // usuario, y avisa para que la interfaz lleve al login con el mensaje del
    // servidor.
    manejarNoAutorizado(mensajeServidor) {
        const habiaSesion = Boolean(token);
        const mensaje = mensajeServidor || (habiaSesion ? MENSAJE_SESION_EXPIRADA : MENSAJE_SIN_SESION);
        limpiarSesion();
        notificar({ tipo: habiaSesion ? "expirada" : "no-autorizado", mensaje });
        return mensaje;
    },

    // Recupera al usuario a partir del token actual (GET /api/auth/me).
    async recuperarUsuario() {
        if (!token) return null;
        const response = await fetch(apiUrl("/auth/me"), {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
        });
        if (!response.ok) return null;
        usuario = await leerJson(response);
        respaldarSesion();
        notificar({ tipo: "renovada", usuario });
        return usuario;
    }
};

restaurarSesion();
