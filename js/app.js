// Modo oscuro (bonus): se aplica apenas carga este script (antes incluso
// del DOMContentLoaded) para minimizar el parpadeo de tema claro->oscuro.
// Preferencia guardada en localStorage, por eso persiste entre visitas Y
// entre las 6 páginas del sitio (cada una es una carga de documento nueva).
aplicarTemaGuardado();

document.addEventListener("DOMContentLoaded", function() {
    loadComponent("components/menu.html", "menu-container", function () {
        marcarPaginaActiva();
        inicializarInterruptorTema();
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

// Función para cargar un componente HTML en un contenedor. callback (opcional)
// se ejecuta una vez insertado el HTML, útil para inicializar cosas dentro
// del componente recién cargado (por ejemplo, resaltar el enlace activo).
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
