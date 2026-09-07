// Modo oscuro (bonus): se aplica apenas carga este script (antes incluso
// del DOMContentLoaded) para minimizar el parpadeo de tema claro->oscuro.
// Preferencia guardada en localStorage, por eso persiste entre visitas Y
// entre las 6 páginas del sitio (cada una es una carga de documento nueva).
aplicarTemaGuardado();

document.addEventListener("DOMContentLoaded", function() {
    loadComponent("components/menu.html", "menu-container", function () {
        marcarPaginaActiva();
        inicializarInterruptorTema();
        inicializarBotonRol();
    });
    loadComponent("components/footer.html", "footer-container");
});

function aplicarTemaGuardado() {
    let tema = null;
    try {
        tema = localStorage.getItem("mqa-tema");
    } catch (error) {
        tema = null;
    }

    if (tema === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
    }
}

function inicializarInterruptorTema() {
    const boton = document.getElementById("btn-tema");
    const texto = document.getElementById("btn-tema-texto");
    if (!boton) return;

    const actualizarTexto = () => {
        const esOscuro = document.documentElement.getAttribute("data-theme") === "dark";
        if (texto) {
            texto.textContent = esOscuro ? "Modo claro" : "Modo oscuro";
        }
        boton.querySelector("i").className = esOscuro ? "fas fa-sun" : "fas fa-moon";
    };

    actualizarTexto();

    boton.addEventListener("click", () => {
        const esOscuro = document.documentElement.getAttribute("data-theme") === "dark";
        if (esOscuro) {
            document.documentElement.removeAttribute("data-theme");
        } else {
            document.documentElement.setAttribute("data-theme", "dark");
        }

        try {
            localStorage.setItem("mqa-tema", esOscuro ? "light" : "dark");
        } catch (error) {
            // localStorage puede fallar (modo privado, cuota, etc.); el tema
            // igual se aplica para esta carga de página, solo no persiste.
        }

        actualizarTexto();
    });
}

// FRONTEND_VISION.md Fase7 + hallazgo post-despliegue (segunda ronda): botón
// para (re)indicar el rol de Director Técnico. El prompt en sí vive en
// js/config.js (window.MQA_preguntarRolDirectorTecnico) porque ese archivo
// es el dueño de window.APP_CONFIG; acá se refleja el estado actual en el
// botón y se decide CUÁNDO permitir volver a pedir la clave.
//
// Antes este botón vivía DENTRO del menú lateral colapsable (había que
// abrir el menú, en móvil, para encontrarlo) y competía por espacio con
// el interruptor de modo oscuro. Ahora es un botón flotante fuera del
// menú (components/menu.html, clase .btn-rol-flotante), visible en toda
// página y en todo momento sin depender de abrir el menú ni de recargar;
// además cambia de color/ícono según el rol activo, para que el estado
// sea evidente de un vistazo (no solo el texto).
//
// Hallazgo (segunda ronda): tocar este botón mientras ya se era Director
// Técnico volvía a preguntar la clave sin más aviso; si se escribía mal
// (o se cancelaba el prompt sin querer), la app quedaba con una clave
// inválida y ningún guardado volvía a funcionar, sin que nada lo
// explicara ("parece que la app no sirve"). Ahora, mientras ya se es
// Director Técnico, el botón NO vuelve a preguntar la clave directamente:
// primero avisa y pide confirmar el cierre de sesión (se vuelve a modo
// Espectador), y recién desde ahí se puede indicar una clave nueva. El
// otro caso que podía "verse roto" -que la clave guardada deje de ser
// válida sin que el usuario haga nada- se resuelve aparte, de forma
// reactiva, en js/apiErrors.js (ante un 401 del backend).
function inicializarBotonRol() {
    const boton = document.getElementById("btn-rol-flotante");
    const texto = document.getElementById("btn-rol-flotante-texto");
    if (!boton) return;

    const actualizarEstado = () => {
        const esDirectorTecnico = Boolean(window.APP_CONFIG?.DIRECTOR_TECNICO_KEY);
        if (texto) {
            texto.textContent = esDirectorTecnico ? "Director Técnico" : "Espectador";
        }
        boton.classList.toggle("es-director-tecnico", esDirectorTecnico);
        boton.querySelector("i").className = esDirectorTecnico ? "fas fa-user-check" : "fas fa-user-shield";
        boton.title = esDirectorTecnico
            ? "Estás como Director Técnico. Click para cerrar sesión y volver a Espectador."
            : "Estás en modo Espectador (solo lectura). Click para ingresar como Director Técnico.";
        actualizarVisibilidadConfiguracion(esDirectorTecnico);
        actualizarVisibilidadAccionesDirectorTecnico();
    };

    // Expuesta para que js/config.js (cierre reactivo de sesión ante un
    // 401 del backend) pueda refrescar este botón y la visibilidad de
    // Configuración sin recargar la página.
    window.MQA_actualizarBotonRol = actualizarEstado;

    actualizarEstado();

    // Hallazgo post-despliegue (tercera ronda): antes, un Hincha podía
    // llenar por completo un formulario de creación/edición y recién al
    // guardar se enteraba (por el 401 reactivo de js/apiErrors.js) de que
    // no tenía permiso -mejor evitar que llegue a esa situación. Los
    // botones/formularios que disparan una escritura (crear, editar,
    // eliminar, sortear, iniciar/finalizar partido, registrar cambio,
    // etc.) se marcan en cada pantalla con el atributo data-requiere-dt, y
    // actualizarVisibilidadAccionesDirectorTecnico() los oculta o muestra
    // según el rol activo. El problema es que la mayoría de esos
    // elementos NO existen todavía en este punto -se generan recién
    // cuando cada pantalla termina de cargar sus datos, en su propio
    // script (equipos.js, jugadores.js, etc.), después de que este script
    // ya corrió una vez-. Un MutationObserver reaplica el mismo criterio
    // cada vez que aparece contenido nuevo en la página, para que ninguna
    // pantalla tenga que acordarse de llamarlo a mano.
    const observadorContenidoNuevo = new MutationObserver(() => {
        actualizarVisibilidadAccionesDirectorTecnico();
    });
    observadorContenidoNuevo.observe(document.body, { childList: true, subtree: true });

    boton.addEventListener("click", () => {
        const esDirectorTecnico = Boolean(window.APP_CONFIG?.DIRECTOR_TECNICO_KEY);

        if (esDirectorTecnico) {
            const confirmarCierre = window.confirm(
                "Ya estás identificado como Director Técnico.\n\n" +
                "Para cambiar la clave primero hay que cerrar esta sesión (vas a quedar en modo " +
                "Espectador, solo lectura, hasta que ingreses una clave de nuevo).\n\n" +
                "¿Cerrar sesión de Director Técnico ahora?"
            );
            if (confirmarCierre && typeof window.MQA_cerrarSesionDirectorTecnico === "function") {
                window.MQA_cerrarSesionDirectorTecnico();
            }
            // MQA_cerrarSesionDirectorTecnico ya llama a window.MQA_actualizarBotonRol
            // (definido arriba); si se canceló el confirm, no hay nada que actualizar.
            return;
        }

        if (typeof window.MQA_preguntarRolDirectorTecnico === "function") {
            window.MQA_preguntarRolDirectorTecnico();
        }
        actualizarEstado();
    });
}

// Oculta/muestra el enlace a Configuración del menú lateral según el rol
// activo (hallazgo post-despliegue: esa pantalla permite definir la clave
// de Director Técnico del próximo período, entre otras acciones de
// escritura -no tiene sentido mostrarsela a un Hincha que solo puede
// consultar). Se llama cada vez que cambia el rol (login, logout manual o
// reactivo ante un 401), no solo al cargar la página.
function actualizarVisibilidadConfiguracion(esDirectorTecnico) {
    const enlace = document.querySelector('#sidebar a[data-page="configuracion"]');
    if (!enlace) return;
    const item = enlace.closest("li") || enlace;
    item.style.display = esDirectorTecnico ? "" : "none";
}

// Función para cargar un componente HTML en un contenedor. callback (opcional)
// se ejecuta una vez insertado el HTML, útil para inicializar cosas dentro
// del componente recién cargado (por ejemplo, resaltar el enlace activo).
// Oculta/muestra cualquier control que dispare una escritura al backend
// (crear, editar, eliminar, sortear, iniciar/finalizar partido, registrar
// cambio, etc.) según el rol activo. Cada pantalla solo tiene que marcar
// el control con el atributo data-requiere-dt="true" -sea un botón fijo
// en el HTML (por ejemplo "Agregar equipo") o uno generado dinámicamente
// en su propio JS (por ejemplo "Editar"/"Eliminar" de cada fila)-, sin
// tener que reimplementar acá la lógica de mostrar/ocultar. Se llama al
// cargar la página, cada vez que cambia el rol (login, logout manual o
// reactivo ante un 401) y cada vez que aparece contenido nuevo en la
// página (ver el MutationObserver en inicializarBotonRol).
function actualizarVisibilidadAccionesDirectorTecnico() {
    const esDirectorTecnico = Boolean(window.APP_CONFIG?.DIRECTOR_TECNICO_KEY);
    document.querySelectorAll("[data-requiere-dt]").forEach((elemento) => {
        elemento.style.display = esDirectorTecnico ? "" : "none";
    });
}

function loadComponent(url, containerId, callback) {
    fetch(url)
        .then(response => response.text())
        .then(data => {
            document.getElementById(containerId).innerHTML = data;
            if (typeof callback === "function") {
                callback();
            }
        })
        .catch(error => console.error("Error al cargar el componente:", error));
}

// Resalta en el menú lateral el enlace correspondiente a la página actual.
// Cada página declara su identificador en <body data-page="...">, que se
// compara contra el data-page de cada <a> del menú.
function marcarPaginaActiva() {
    const paginaActual = document.body.dataset.page;
    if (!paginaActual) return;

    document.querySelectorAll('#sidebar a[data-page]').forEach((enlace) => {
        if (enlace.dataset.page === paginaActual) {
            enlace.classList.add("activo");
        }
    });
}

// Función para mostrar/ocultar el menú
function toggleMenu() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar.style.left === "0px") {
        sidebar.style.left = "-250px";
    } else {
        sidebar.style.left = "0px";
    }
}
