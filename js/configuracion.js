import { RegistroInformativoService } from "../services/RegistroInformativoService.js";
import { mostrarToast } from "./toast.js";
import { inicializarModalRegistroInformativo } from "./modalRegistroInformativo.js";

document.addEventListener("DOMContentLoaded", async function () {
    const registrosContainer = document.querySelector(".registros-container");
    const btnAgregarRegistro = document.getElementById("btn-agregar-registro");

    if (!registrosContainer) {
        console.error("No se encontró el contenedor de registros informativos.");
        return;
    }

    inicializarModalRegistroInformativo({
        onRegistroGuardado: cargarRegistros
    });

    btnAgregarRegistro.addEventListener("click", () => {
        if (window.abrirModalRegistroInformativo) {
            window.abrirModalRegistroInformativo();
        }
    });

    async function cargarRegistros() {
        registrosContainer.innerHTML = "<div class='loading-state'>Cargando registros informativos...</div>";
        try {
            const registros = await RegistroInformativoService.obtenerRegistros();
            render(Array.isArray(registros) ? registros : []);
        } catch (error) {
            registrosContainer.innerHTML = `
                <div class="empty-state">
                    No se pudieron cargar los registros informativos.<br>
                    ${error.message || "Intenta nuevamente más tarde."}
                </div>
            `;
        }
    }

    function formatearFecha(fechaISO) {
        if (!fechaISO) return "";
        const fecha = new Date(fechaISO);
        if (Number.isNaN(fecha.getTime())) return "";
        return fecha.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
    }

    function render(registros) {
        if (registros.length === 0) {
            registrosContainer.innerHTML = `
                <div class="empty-state">
                    No hay registros informativos creados todavía.
                </div>
            `;
            return;
        }

        registrosContainer.innerHTML = `
            <div class="registros-lista">
                ${registros.map((registro) => tarjetaRegistro(registro)).join("")}
            </div>
        `;

        registrosContainer.querySelectorAll(".btn-eliminar").forEach((button) => {
            button.addEventListener("click", async () => {
                const confirmar = window.confirm("¿Estás seguro de eliminar este registro informativo?");
                if (!confirmar) return;

                try {
                    await RegistroInformativoService.eliminarRegistro(button.dataset.id);
                    mostrarToast("Registro informativo eliminado correctamente.", "success");
                    await cargarRegistros();
                } catch (error) {
                    mostrarToast(error.message || "No se pudo eliminar el registro informativo", "error");
                }
            });
        });
    }

    function tarjetaRegistro(registro) {
        return `
            <article class="registro-card">
                <div class="registro-card-header">
                    <h3>${registro.titulo}</h3>
                    <button class="btn btn-small btn-eliminar" data-id="${registro.id}">Eliminar</button>
                </div>
                <p class="registro-fecha">${formatearFecha(registro.fechaPublicacion)}</p>
                <p class="registro-contenido">${registro.contenido}</p>
            </article>
        `;
    }

    await cargarRegistros();
});
