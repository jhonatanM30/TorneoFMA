import { escaparHtml } from "./formatos.js";

// Modal de formulario genérico (reutiliza los estilos de css/modales.css).
// Sirve para las acciones del módulo de torneos que piden pocos datos:
// generar calendario, llaves, grupos y registrar penales.
//
// abrirFormulario({
//   titulo, ayuda?, textoEnviar?,
//   campos: [{ name, label, type, value?, required?, min?, max?, step?, placeholder?, help? }],
//   extra?: { render(contenedor), leer() },   // contenido propio (cruces o grupos a mano)
//   alEnviar(valores)                         // async; si lanza, se muestra el mensaje y el modal sigue abierto
// })
//
// Tipos de campo: date, time, number, text, checkbox. En un checkbox el valor
// es booleano. Un number vacío se omite del objeto. extra.leer() devuelve un
// objeto que se mezcla con los valores (o lanza Error con el motivo).
export function abrirFormulario({ titulo, ayuda = "", textoEnviar = "Guardar", campos = [], extra = null, alEnviar }) {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    const filas = campos.map((campo, i) => {
        const id = `form-gen-${i}`;
        if (campo.type === "checkbox") {
            return `
                <label class="check-label" for="${id}">
                    <input type="checkbox" id="${id}" name="${campo.name}" ${campo.value ? "checked" : ""}>
                    ${escaparHtml(campo.label)}
                </label>
                ${campo.help ? `<p class="modal-help">${escaparHtml(campo.help)}</p>` : ""}`;
        }
        const atributos = ["min", "max", "step", "placeholder"]
            .filter((a) => campo[a] !== undefined)
            .map((a) => `${a}="${escaparHtml(campo[a])}"`).join(" ");
        return `
            <label for="${id}">${escaparHtml(campo.label)}</label>
            <input type="${campo.type || "text"}" id="${id}" name="${campo.name}"
                   value="${escaparHtml(campo.value ?? "")}" ${atributos} ${campo.required ? "required" : ""}>
            ${campo.help ? `<p class="modal-help">${escaparHtml(campo.help)}</p>` : ""}`;
    }).join("");

    modal.innerHTML = `
        <div class="modal-content modal-content--ancho">
            <span class="close" aria-label="Cerrar modal">&times;</span>
            <h2>${escaparHtml(titulo)}</h2>
            <form novalidate>
                ${ayuda ? `<p class="modal-help">${escaparHtml(ayuda)}</p>` : ""}
                ${filas}
                <div class="form-gen-extra"></div>
                <div class="form-status" aria-live="polite"></div>
                <div class="modal-buttons">
                    <button type="button" class="btn-secundario form-gen-cancelar">Cancelar</button>
                    <button type="submit"><span>${escaparHtml(textoEnviar)}</span></button>
                </div>
            </form>
        </div>`;

    const form = modal.querySelector("form");
    const estado = modal.querySelector(".form-status");
    const enviar = modal.querySelector("button[type=submit]");
    const textoBoton = enviar.querySelector("span");

    const setEstado = (mensaje) => {
        estado.textContent = mensaje || "";
        estado.className = `form-status ${mensaje ? "error" : ""}`;
    };
    const cerrar = () => modal.remove();

    if (extra) extra.render(modal.querySelector(".form-gen-extra"));

    modal.querySelector(".close").addEventListener("click", cerrar);
    modal.querySelector(".form-gen-cancelar").addEventListener("click", cerrar);
    modal.addEventListener("click", (evento) => {
        if (evento.target === modal) cerrar();
    });

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const valores = {};
        for (const campo of campos) {
            const input = form.elements[campo.name];
            if (campo.type === "checkbox") {
                valores[campo.name] = input.checked;
                continue;
            }
            const texto = input.value.trim();
            if (texto === "") {
                if (campo.required) {
                    setEstado(`Completa el campo "${campo.label}".`);
                    input.focus();
                    return;
                }
                continue;
            }
            valores[campo.name] = campo.type === "number" ? Number(texto) : texto;
        }

        try {
            if (extra) Object.assign(valores, extra.leer());
        } catch (error) {
            setEstado(error.message);
            return;
        }

        enviar.disabled = true;
        textoBoton.textContent = "Procesando...";
        setEstado("");
        try {
            await alEnviar(valores);
            cerrar();
        } catch (error) {
            setEstado(error.message || "No se pudo completar la acción.");
            enviar.disabled = false;
            textoBoton.textContent = textoEnviar;
        }
    });

    document.body.appendChild(modal);
    modal.style.display = "flex";
    form.querySelector("input")?.focus();
    return { cerrar };
}
