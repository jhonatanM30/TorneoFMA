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
// módulos leen window.APP_CONFIG al importarse, y porque la clave de
// Director Técnico de más abajo debe quedar restaurada antes de que
// cualquier llamada al backend arme sus headers.
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

// FRONTEND_VISION.md Fase7 + hallazgo post-despliegue: mientras no exista
// un login real que distinga Director Técnico de usuarios consultivos, el
// rol se maneja con esta clave guardada en sessionStorage (no localStorage:
// se pierde si cierran el navegador, a propósito, para no dejar la sesión
// de Director Técnico abierta indefinidamente en un equipo compartido).
//
// Versión anterior: se preguntaba automáticamente con un prompt() apenas
// cargaba la página, la primera vez de la sesión. Hallazgo del usuario:
// eso interrumpe a cualquiera que solo entra a mirar (la mayoría de las
// visitas), y en vez de eso la aplicación debería entrar directo
// mostrando "Espectador" y dejar el botón de Rol (ver components/menu.html
// / js/app.js) siempre disponible para quien SÍ quiera identificarse como
// Director Técnico cuando lo necesite. Por eso acá solo se restaura la
// clave ya guardada (si la hay); nunca se pregunta sola.
const CLAVE_DIRECTOR_STORAGE_KEY = "mqa-director-tecnico-clave";

function leerClaveDirectorGuardada() {
    try {
        return sessionStorage.getItem(CLAVE_DIRECTOR_STORAGE_KEY) || null;
    } catch (error) {
        return null;
    }
}

function guardarClaveDirector(clave) {
    try {
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

// Pide la clave para ENTRAR como Director Técnico y la valida contra el
// backend antes de aceptarla. Solo debe invocarse mientras se está en
// modo Espectador (el botón de Rol en js/app.js decide cuándo llamar esto
// vs. cuándo cerrar sesión) para no dejar que un typo pise en silencio
// una clave que ya funcionaba.
//
// Hallazgo post-despliegue (tercera ronda): antes se aceptaba cualquier
// texto que el usuario escribiera como si fuera la clave correcta, sin
// comprobar nada contra el backend -recién se descubría que estaba mal
// al intentar guardar algo real (ver el 401 reactivo más abajo en
// MQA_cerrarSesionDirectorTecnico / js/apiErrors.js). El usuario pidió,
// con razón, que la app no "deje pasar" a Director Técnico con una clave
// incorrecta desde el primer momento. Para eso se agregó en el backend
// un endpoint dedicado (POST /api/director-tecnico/validar,
// DirectorTecnicoController) que no valida nada por sí mismo: al ser un
// método POST, DirectorTecnicoInterceptor ya exige y compara el header
// X-Director-Tecnico-Key antes de que la petición lo alcance, así que si
// el backend responde 200 la clave es correcta, y si responde 401 no lo
// es -sin duplicar la lógica de comparación acá en el frontend.
window.MQA_preguntarRolDirectorTecnico = async function preguntarRolDirectorTecnico() {
    const respuesta = window.prompt(
        "¿Eres Director Técnico?\n\nIngresa la clave para poder crear, editar o eliminar información. " +
        "Si solo vas a ver el torneo (Espectador), deja este campo vacío y presiona Aceptar.",
        ""
    );

    // Cancelar el prompt (null) se trata igual que dejarlo vacío: rol de
    // Espectador, sin necesidad de validar nada contra el backend.
    const clave = respuesta && respuesta.trim() ? respuesta.trim() : null;
    if (!clave) {
        guardarClaveDirector(null);
        window.APP_CONFIG.DIRECTOR_TECNICO_KEY = null;
        return null;
    }

    let esValida = false;
    try {
        const respuestaValidacion = await fetch(`${window.APP_CONFIG.API_BASE_URL}/director-tecnico/validar`, {
            method: "POST",
            headers: { "X-Director-Tecnico-Key": clave }
        });
        esValida = respuestaValidacion.ok;
    } catch (error) {
        // No hay conexión con el backend: no se puede confirmar si la
        // clave es correcta o no, así que -por seguridad- no se deja
        // pasar a Director Técnico. Es un caso distinto de una clave
        // incorrecta (acá no se sabe cuál de las dos cosas pasó), por eso
        // el mensaje es otro.
        window.alert(
            "No se pudo validar la clave porque no hay conexión con el servidor. " +
            "Intenta de nuevo cuando el servidor esté disponible; por ahora seguís en modo Espectador."
        );
        return null;
    }

    if (!esValida) {
        window.alert("La clave ingresada no es correcta. Seguís en modo Espectador (solo lectura).");
        return null;
    }

    guardarClaveDirector(clave);
    window.APP_CONFIG.DIRECTOR_TECNICO_KEY = clave;
    return clave;
};

// Cierra la sesión de Director Técnico y vuelve a modo Espectador. La
// invoca el botón de Rol cuando el usuario confirma que quiere salir (ver
// js/app.js), y también el manejo global de errores (js/apiErrors.js)
// cuando el backend responde 401: si la clave guardada ya no es válida
// (se reingresó mal, o cambió), no tiene sentido seguir mandándola en
// cada request como si nada — eso es lo que antes se veía como "la app
// no sirve", porque nunca se avisaba ni se corregía el estado.
window.MQA_cerrarSesionDirectorTecnico = function cerrarSesionDirectorTecnico() {
    guardarClaveDirector(null);
    window.APP_CONFIG.DIRECTOR_TECNICO_KEY = null;
    if (typeof window.MQA_actualizarBotonRol === "function") {
        window.MQA_actualizarBotonRol();
    }
};

// Al cargar cada página: restaurar la clave si ya la había (sessionStorage
// persiste entre las páginas de esta misma pestaña de navegador), sin
// preguntar nunca nada de forma automática.
window.APP_CONFIG.DIRECTOR_TECNICO_KEY = leerClaveDirectorGuardada();
