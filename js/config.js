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
// en cada página HTML, porque los demás módulos leen window.APP_CONFIG al
// importarse.
//
// La sesión (login con roles ADMIN / DT, token Bearer en memoria) vive en
// js/auth.js; acá NO se guarda ningún token ni credencial.
window.APP_CONFIG = {
    API_BASE_URL: "http://localhost:57075/api"
};
