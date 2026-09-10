import { RegistroInformativoService } from "../services/RegistroInformativoService.js";
import { GaleriaService } from "../services/GaleriaService.js";
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

        // Hallazgo post-despliegue (fase9): "deberia permitir editar".
        registrosContainer.querySelectorAll(".btn-editar").forEach((button) => {
            button.addEventListener("click", () => {
                const registro = registros.find((item) => String(item.id) === String(button.dataset.id));
                if (registro && window.abrirModalRegistroInformativo) {
                    window.abrirModalRegistroInformativo(registro);
                }
            });
        });

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
                    <span class="registro-card-acciones">
                        <button class="btn btn-small btn-editar" data-requiere-dt="true" data-id="${registro.id}">Editar</button>
                        <button class="btn btn-small btn-eliminar" data-requiere-dt="true" data-id="${registro.id}">Eliminar</button>
                    </span>
                </div>
                <p class="registro-fecha">${formatearFecha(registro.fechaPublicacion)}</p>
                <p class="registro-contenido">${registro.contenido}</p>
            </article>
        `;
    }

    await cargarRegistros();
    await inicializarGaleria();
});

// Hallazgo post-despliegue (fase9): "Poder desde configuraciones subir
// fotos y que aparezcan alli y se guarden donde estan las actuales que se
// muestran y que sea en especie de carrusel algo diferente a las card,
// mas dinamico". La subida/listado/eliminación se administran acá; el
// carrusel en sí (lo "diferente a las cards") vive en la página de
// Inicio (ver js/dashboard.js).
async function inicializarGaleria() {
    const galeriaContainer = document.querySelector(".galeria-config-container");
    const inputImagen = document.getElementById("galeria-input-imagen");
    const galeriaFormStatus = document.getElementById("galeria-form-status");

    if (!galeriaContainer || !inputImagen) {
        return;
    }

    const setGaleriaStatus = (message, type = "info") => {
        galeriaFormStatus.textContent = message || "";
        galeriaFormStatus.className = `form-status ${type}`;
    };

    async function cargarGaleria() {
        galeriaContainer.innerHTML = "<div class='loading-state'>Cargando galería...</div>";
        try {
            const imagenes = await GaleriaService.obtenerGaleria();
            renderGaleria(Array.isArray(imagenes) ? imagenes : []);
        } catch (error) {
            galeriaContainer.innerHTML = `
                <div class="empty-state">
                    No se pudo cargar la galería.<br>
                    ${error.message || "Intenta nuevamente más tarde."}
                </div>
            `;
        }
    }

    function renderGaleria(imagenes) {
        if (imagenes.length === 0) {
            galeriaContainer.innerHTML = `
                <div class="empty-state">
                    Todavía no hay fotos en la galería. Sube la primera con el botón de arriba.
                </div>
            `;
            return;
        }

        galeriaContainer.innerHTML = `
            <div class="galeria-config-grid">
                ${imagenes.map((imagen) => `
                    <figure class="galeria-config-item">
                        <img src="${imagen.imagenUrl}" alt="Foto de la galería">
                        <button class="btn btn-small btn-eliminar" data-requiere-dt="true" data-id="${imagen.id}">Eliminar</button>
                    </figure>
                `).join("")}
            </div>
        `;

        galeriaContainer.querySelectorAll(".btn-eliminar").forEach((button) => {
            button.addEventListener("click", async () => {
                const confirmar = window.confirm("¿Eliminar esta foto de la galería?");
                if (!confirmar) return;

                try {
                    await GaleriaService.eliminarImagen(button.dataset.id);
                    mostrarToast("Foto eliminada de la galería.", "success");
                    await cargarGaleria();
                } catch (error) {
                    mostrarToast(error.message || "No se pudo eliminar la foto", "error");
                }
            });
        });
    }

    inputImagen.addEventListener("change", async () => {
        const archivo = inputImagen.files?.[0];
        if (!archivo) return;

        setGaleriaStatus("Subiendo foto...", "info");

        try {
            await GaleriaService.subirImagen(archivo);
            setGaleriaStatus("");
            mostrarToast("Foto agregada a la galería correctamente.", "success");
            await cargarGaleria();
        } catch (error) {
            setGaleriaStatus(error.message || "No se pudo subir la foto.", "error");
        } finally {
            inputImagen.value = "";
        }
    });

    await cargarGaleria();
}
