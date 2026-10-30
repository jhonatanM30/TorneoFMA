// Modo oscuro (bonus): se aplica apenas carga este script (antes incluso
// del DOMContentLoaded) para minimizar el parpadeo de tema claro->oscuro.
// Preferencia guardada en localStorage, por eso persiste entre visitas Y
// entre las 6 páginas del sitio (cada una es una carga de documento nueva).
aplicarTemaGuardado();

document.addEventListener("DOMContentLoaded", function() {
    loadComponent("components/menu.html", "menu-container", function () {
        marcarPaginaActiva();
        inicializarInterruptorTema();
        inicializarSesion();
    });
    loadComponent("components/footer.html", "footer-container");

    const contenedorLogin = document.createElement("div");
    contenedorLogin.id = "login-container";
    document.body.appendChild(contenedorLogin);
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

// Sesión y roles (add-authentication-roles.md). El estado vive en js/auth.js
// (módulo, token en memoria); acá solo se refleja en la interfaz: botón
// flotante, modal de login y visibilidad de las acciones según el rol. El
// backend es la autoridad; esto es solo comodidad.
//
// Atributos que marcan los controles en cada pantalla:
//   data-requiere-admin      -> solo ADMIN (crear, editar, borrar, confirmar...)
//   data-requiere-traspaso   -> ADMIN, o DT con equipo asignado
//   data-solo-admin          -> bloques que solo ve el ADMIN (p. ej. usuarios)
//   data-aviso-dt-sin-equipo -> aviso visible solo para un DT sin equipo
const ETIQUETAS_ROL = { ADMIN: "Administrador", DT: "Director Técnico" };

let Auth = null;

async function inicializarSesion() {
    ({ Auth } = await import("./auth.js"));
    const { mostrarToast } = await import("./toast.js");

    window.MQA_abrirLogin = (mensaje) => abrirLogin(mensaje);

    Auth.alCambiar((evento) => {
        actualizarInterfazSesion();
        if (evento.tipo === "expirada" || evento.tipo === "no-autorizado") {
            mostrarToast(evento.mensaje, "error");
            abrirLogin(evento.mensaje);
        }
    });

    loadComponent("components/modal-login.html", "login-container", inicializarModalLogin);
    inicializarBotonRol();
}

function inicializarBotonRol() {
    const boton = document.getElementById("btn-rol-flotante");
    if (!boton) return;

    actualizarInterfazSesion();

    // Muchos controles se generan después de cargar los datos de cada
    // pantalla; el observador reaplica la visibilidad cuando aparece
    // contenido nuevo.
    new MutationObserver(aplicarVisibilidadPorRol)
        .observe(document.body, { childList: true, subtree: true });

    boton.addEventListener("click", () => {
        if (!Auth.haySesion()) {
            abrirLogin();
            return;
        }

        const usuario = Auth.obtenerUsuario();
        const equipo = usuario.teamName ? `\nEquipo: ${usuario.teamName}` : "";
        const confirmarCierre = window.confirm(
            `Sesión iniciada como ${usuario.username} (${ETIQUETAS_ROL[usuario.role] || usuario.role}).${equipo}\n\n¿Cerrar sesión?`
        );
        if (confirmarCierre) {
            Auth.cerrarSesion();
        }
    });
}

function actualizarInterfazSesion() {
    const boton = document.getElementById("btn-rol-flotante");
    const texto = document.getElementById("btn-rol-flotante-texto");
    const usuario = Auth.obtenerUsuario();

    if (boton) {
        if (texto) {
            const rol = usuario?.role === "ADMIN" ? "Admin" : `DT${usuario?.teamName ? ` ${usuario.teamName}` : ""}`;
            texto.textContent = usuario ? `${usuario.username} · ${rol}` : "Iniciar sesión";
        }
        boton.classList.toggle("es-director-tecnico", Boolean(usuario));
        boton.querySelector("i").className = usuario ? "fas fa-user-check" : "fas fa-right-to-bracket";
        boton.title = usuario
            ? `${ETIQUETAS_ROL[usuario.role] || usuario.role}${usuario.teamName ? ` de ${usuario.teamName}` : ""}. Click para cerrar sesión.`
            : "Estás como visitante (solo consulta). Click para iniciar sesión.";
    }

    aplicarVisibilidadPorRol();
}

function aplicarVisibilidadPorRol() {
    if (!Auth) return;
    const esAdmin = Auth.esAdmin();
    const puedeTraspaso = Auth.puedeSolicitarTraspaso();
    const dtSinEquipo = Auth.dtSinEquipo();

    document.querySelectorAll("[data-requiere-admin], [data-solo-admin]").forEach((el) => {
        el.style.display = esAdmin ? "" : "none";
    });
    document.querySelectorAll("[data-requiere-traspaso]").forEach((el) => {
        el.style.display = puedeTraspaso ? "" : "none";
    });
    document.querySelectorAll("[data-aviso-dt-sin-equipo]").forEach((el) => {
        el.hidden = !dtSinEquipo;
    });

    // Configuración (registros, galería, bandeja de traspasos, usuarios) es
    // solo para el administrador.
    const enlace = document.querySelector('#sidebar a[data-page="configuracion"]');
    if (enlace) {
        (enlace.closest("li") || enlace).style.display = esAdmin ? "" : "none";
    }
}

let modalLogin = null;
let mensajePendienteLogin = "";

function abrirLogin(mensaje) {
    if (!modalLogin) {
        // El componente todavía se está cargando.
        mensajePendienteLogin = mensaje || "";
        return;
    }
    modalLogin.mostrar(mensaje);
}

function inicializarModalLogin() {
    const modal = document.getElementById("modal-login");
    const form = document.getElementById("form-login");
    const estado = document.getElementById("login-form-status");
    const inputUsuario = document.getElementById("login-usuario");
    const inputClave = document.getElementById("login-clave");
    const submit = document.getElementById("login-submit-btn");
    const submitTexto = document.getElementById("login-submit-text");
    if (!modal || !form) return;

    modal.style.display = "none";

    const setEstado = (mensaje, tipo = "info") => {
        estado.textContent = mensaje || "";
        estado.className = `form-status ${tipo}`;
    };

    const cerrar = () => {
        modal.style.display = "none";
        form.reset();
        setEstado("");
    };

    modalLogin = {
        mostrar(mensaje) {
            form.reset();
            setEstado(mensaje || "", mensaje ? "error" : "info");
            modal.style.display = "flex";
            inputUsuario.focus();
        }
    };

    modal.querySelector(".close").addEventListener("click", cerrar);
    document.getElementById("login-cancelar-btn").addEventListener("click", cerrar);
    window.addEventListener("click", (evento) => {
        if (evento.target === modal) cerrar();
    });

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const username = inputUsuario.value.trim();
        const password = inputClave.value;
        if (!username || !password) {
            setEstado("Ingresa tu usuario y tu contraseña.", "error");
            return;
        }

        submit.disabled = true;
        submitTexto.textContent = "Entrando...";
        setEstado("");
        try {
            await Auth.iniciarSesion(username, password);
            cerrar();
        } catch (error) {
            // Mensaje del servidor (401 sin redirigir) o de conexión.
            const sinConexion = error instanceof TypeError;
            setEstado(sinConexion ? "No hay conexión con el servidor. Intenta de nuevo." : error.message, "error");
            inputClave.value = "";
            inputClave.focus();
        } finally {
            submit.disabled = false;
            submitTexto.textContent = "Entrar";
        }
    });

    if (mensajePendienteLogin) {
        modalLogin.mostrar(mensajePendienteLogin);
        mensajePendienteLogin = "";
    }
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
