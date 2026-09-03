// Notificaciones toast compartidas por todas las páginas (bonus pedido en
// FRONTEND_API_PROMPT.md: "Notificaciones: Toast notifications para
// acciones"). Reemplazan los alert() que se usaban para avisar
// éxito/error de crear/editar/eliminar. Los confirm() de "¿estás
// seguro?" se mantienen tal cual: son un gate bloqueante antes de una
// acción destructiva, no una notificación de resultado.
const DURACION_MS = 4000;

function obtenerContenedor() {
    let contenedor = document.getElementById("toast-container");
    if (!contenedor) {
        contenedor = document.createElement("div");
        contenedor.id = "toast-container";
        contenedor.setAttribute("aria-live", "polite");
        document.body.appendChild(contenedor);
    }
    return contenedor;
}

const ICONOS = {
    success: "✅",
    error: "⚠️",
    info: "ℹ️"
};

// tipo: "success" | "error" | "info"
export function mostrarToast(mensaje, tipo = "info") {
    if (!mensaje) return;

    const contenedor = obtenerContenedor();

    const toast = document.createElement("div");
    toast.className = `toast toast--${tipo}`;
    toast.innerHTML = `<span class="toast-icono">${ICONOS[tipo] || ICONOS.info}</span><span class="toast-texto"></span>`;
    toast.querySelector(".toast-texto").textContent = mensaje;

    contenedor.appendChild(toast);

    const quitar = () => {
        toast.classList.add("toast--saliendo");
        toast.addEventListener("animationend", () => toast.remove(), { once: true });
    };

    const temporizador = setTimeout(quitar, DURACION_MS);
    toast.addEventListener("click", () => {
        clearTimeout(temporizador);
        quitar();
    });
}
