// Configuración del frontend (Fase 5).
//
// La URL base de la API NUNCA se hardcodea dentro de los servicios: se
// declara en este único archivo, igual que el backend externaliza su
// configuración de conexión a MySQL en variables de entorno (ver
// ../mas-que-amigos/DEPLOYMENT.md). Este es el archivo que se ajusta según
// el entorno donde corra el frontend (desarrollo local, otro servidor,
// etc.) sin tocar ningún otro archivo.
//
// IMPORTANTE: este script debe cargarse ANTES que cualquier otro <script>
// en cada página HTML (index.html, equipos.html, jugadores.html,
// partidos.html, estadisticas.html, configuracion.html), porque los demás
// módulos leen window.APP_CONFIG al importarse, y porque el prompt de
// Director Técnico de más abajo debe correr antes de que cualquier
// llamada al backend arme sus headers.
window.APP_CONFIG = {
    API_BASE_URL: "http://localhost:57075/api",

    // Estructura preparada para autenticación futura (FRONTEND_API_PROMPT.md,
    // requisito general 9: "preparar la estructura para agregar
    // autenticación"). Todavía no hay login real, así que queda en null.
    // Cuando se implemente, guardar aquí el token obtenido en el login
    // (o leerlo de sessionStorage al cargar la página) alcanza para que
    // construirHeaders() (js/apiErrors.js) lo mande en TODAS las llamadas al
    // backend automáticamente, sin tocar ningún Service.
    AUTH_TOKEN: null,

    // FRONTEND_VISION.md Fase7: clave de Director Técnico que el backend
    // exige (DirectorTecnicoInterceptor, header X-Director-Tecnico-Key) en
    // todo método que no sea de consulta. Se completa más abajo, nunca a
    // mano acá.
    DIRECTOR_TECNICO_KEY: null
};

// FRONTEND_VISION.md Fase7 ("#CONSTANTE INTENCIONAL#"): mientras no exista
// un login real que distinga Director Técnico de usuarios consultivos, se
// pregunta la clave una sola vez por sesión de navegador (sessionStorage,
// no localStorage: se vuelve a preguntar si cierran el navegador, a
// propósito, para no dejar la sesión de Director Técnico abierta
// indefinidamente en un equipo compartido). Si la persona solo va a
// consultar, puede dejar el campo vacío: seguirá pudiendo ver todo, y el
// backend le devolverá "no autorizado" (con mensaje, mostrado por el
// manejo de errores ya existente en cada pantalla) si intenta crear,
// editar o eliminar algo.
//
// Se expone como función global (no solo se ejecuta una vez) para que el
// botón "Rol" del menú (ver components/menu.html / js/app.js) pueda
// volver a preguntar si la persona se equivocó o si cambia quién está
// usando el equipo.
const CLAVE_DIRECTOR_STORAGE_KEY = "mqa-director-tecnico-clave";
const CLAVE_DIRECTOR_PREGUNTADO_KEY = "mqa-director-tecnico-preguntado";

function leerClaveDirectorGuardada() {
    try {
        return sessionStorage.getItem(CLAVE_DIRECTOR_STORAGE_KEY) || null;
    } catch (error) {
        return null;
    }
}

function guardarClaveDirector(clave) {
    try {
        sessionStorage.setItem(CLAVE_DIRECTOR_PREGUNTADO_KEY, "1");
        if (clave) {
            sessionStorage.setItem(CLAVE_DIRECTOR_STORAGE_KEY, clave);
        } else {
            sessionStorage.removeItem(CLAVE_DIRECTOR_STORAGE_KEY);
        }
    } catch (error) {
        // sessionStorage puede fallar (modo privado, cuota, etc.); la clave
        // igual queda disponible para esta carga de página en APP_CONFIG,
        // solo no persiste entre páginas.
    }
}

window.MQA_preguntarRolDirectorTecnico = function preguntarRolDirectorTecnico() {
    const respuesta = window.prompt(
        "¿Eres Director Técnico?\n\nIngresa la clave para poder crear, editar o eliminar información. " +
        "Si solo vas a consultar, deja este campo vacío y presiona Aceptar.",
        ""
    );

    // Cancelar el prompt (null) se trata igual que dejarlo vacío: rol de
    // solo consulta, no se vuelve a preguntar en esta misma sesión de
    // navegador salvo que usen el botón "Rol" del menú.
    const clave = respuesta && respuesta.trim() ? respuesta.trim() : null;
    guardarClaveDirector(clave);
    window.APP_CONFIG.DIRECTOR_TECNICO_KEY = clave;
    return clave;
};

(function inicializarClaveDirectorTecnico() {
    let yaPreguntado = null;
    try {
        yaPreguntado = sessionStorage.getItem(CLAVE_DIRECTOR_PREGUNTADO_KEY);
    } catch (error) {
        yaPreguntado = null;
    }

    if (!yaPreguntado) {
        window.MQA_preguntarRolDirectorTecnico();
    } else {
        window.APP_CONFIG.DIRECTOR_TECNICO_KEY = leerClaveDirectorGuardada();
    }
})();
