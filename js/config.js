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
// partidos.html, estadisticas.html), porque los demás módulos leen
// window.APP_CONFIG al importarse.
window.APP_CONFIG = {
    API_BASE_URL: "http://localhost:57075/api",

    // Estructura preparada para autenticación futura (FRONTEND_API_PROMPT.md,
    // requisito general 9: "preparar la estructura para agregar
    // autenticación"). Todavía no hay login real, así que queda en null.
    // Cuando se implemente, guardar aquí el token obtenido en el login
    // (o leerlo de sessionStorage al cargar la página) alcanza para que
    // construirHeaders() (js/apiErrors.js) lo mande en TODAS las llamadas al
    // backend automáticamente, sin tocar ningún Service.
    AUTH_TOKEN: null
};
