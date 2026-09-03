import { EquipoService } from "../services/EquipoService.js";
import { mostrarToast } from "./toast.js";
import { inicializarModalEquipo } from "./modalEquipo.js";

let equiposCache = [];

const DEFAULT_TEAM_IMAGE = "assets/comark.jpg";

document.addEventListener("DOMContentLoaded", async function () {
    const equiposContainer = document.querySelector(".equipos-container");
    const searchInput = document.getElementById("buscar-equipo");
    const filtroClasificacion = document.getElementById("filtro-clasificacion");
    const btnListarTodo = document.getElementById("btn-listar-todo");
    const btnAgregarEquipo = document.querySelector(".botones .btn:last-child");

    if (!equiposContainer) {
        console.error("No se encontró el contenedor de equipos. Verifica que el ID 'equipos-container' esté en equipos.html");
        return;
    }

    inicializarModalEquipo({
        onEquipoGuardado: async () => {
            await cargarEquipos(equiposContainer);
        }
    });

    if (btnAgregarEquipo) {
        btnAgregarEquipo.addEventListener("click", () => {
            if (window.abrirModalEquipo) {
                window.abrirModalEquipo();
            }
        });
    }

    // Aplica el filtro de tipo de clasificación (Eliminatoria/Repechaje) de
    // forma local: el listado completo ya viene del backend, no se necesita
    // un endpoint aparte para esto (FRONTEND_VISION.md Fase1: "ver equipos
    // en repechaje / eliminatoria").
    const filtrarPorClasificacion = (lista) => {
        const tipo = filtroClasificacion ? filtroClasificacion.value : "";
        if (!tipo) return lista;
        return lista.filter((equipo) => (equipo.tipoClasificacion || "").toLowerCase() === tipo.toLowerCase());
    };

    const refrescar = async () => {
        const query = searchInput ? searchInput.value.trim() : "";

        if (query) {
            await buscarEquiposPorNombre(equiposContainer, query, filtrarPorClasificacion);
            return;
        }

        await cargarEquipos(equiposContainer, filtrarPorClasificacion);
    };

    if (searchInput) {
        searchInput.addEventListener("input", refrescar);
    }

    if (filtroClasificacion) {
        filtroClasificacion.addEventListener("change", refrescar);
    }

    if (btnListarTodo) {
        btnListarTodo.addEventListener("click", async () => {
            if (searchInput) searchInput.value = "";
            if (filtroClasificacion) filtroClasificacion.value = "";
            await cargarEquipos(equiposContainer);
        });
    }

    await cargarEquipos(equiposContainer, filtrarPorClasificacion);
});

async function cargarEquipos(equiposContainer, filtrar = (lista) => lista) {
    equiposContainer.innerHTML = "<div class='loading-state'>Cargando equipos...</div>";

    try {
        const equipos = await EquipoService.obtenerEquipos();
        equiposCache = Array.isArray(equipos) ? equipos : [];
        renderEquipos(equiposContainer, filtrar(equiposCache));
    } catch (error) {
        equiposContainer.innerHTML = `
            <div class="empty-state">
                No se pudieron cargar los equipos.<br>
                ${error.message || "Intenta nuevamente más tarde."}
            </div>
        `;
    }
}

async function buscarEquiposPorNombre(equiposContainer, nombre, filtrar = (lista) => lista) {
    try {
        const equipos = await EquipoService.buscarEquiposPorNombre(nombre);
        renderEquipos(equiposContainer, filtrar(Array.isArray(equipos) ? equipos : []));
    } catch (error) {
        equiposContainer.innerHTML = `
            <div class="empty-state">
                No se encontraron equipos para la búsqueda indicada.
            </div>
        `;
    }
}

function renderEquipos(equiposContainer, equipos) {
    if (!Array.isArray(equipos) || equipos.length === 0) {
        equiposContainer.innerHTML = `
            <div class="empty-state">
                No hay equipos registrados.
            </div>
        `;
        return;
    }

    equiposContainer.innerHTML = equipos.map((equipo) => {
        const nombre = equipo.nombre || "Equipo sin nombre";
        const directorTecnico = equipo.directorTecnico || "Sin director técnico";
        const titulos = equipo.titulos ?? 0;
        const tipo = equipo.tipoClasificacion || "Sin clasificación";
        const imagen = equipo.imagenUrl || DEFAULT_TEAM_IMAGE;

        return `
            <article class="equipo-card" data-id="${equipo.id ?? ""}">
                <img src="${imagen}" alt="${nombre}" onerror="this.src='${DEFAULT_TEAM_IMAGE}'">
                <h3>${nombre}</h3>
                <p><strong>DT:</strong> ${directorTecnico}</p>
                <p><strong>Títulos:</strong> ${titulos}</p>
                <p><strong>Clasificación:</strong> ${tipo}</p>
                <div class="equipo-actions">
                    <button class="btn btn-small btn-detalle" data-id="${equipo.id ?? ""}">Detalle</button>
                    <button class="btn btn-small btn-editar" data-id="${equipo.id ?? ""}">Editar</button>
                    <button class="btn btn-small btn-eliminar" data-id="${equipo.id ?? ""}">Eliminar</button>
                </div>
            </article>
        `;
    }).join("");

    equiposContainer.querySelectorAll(".btn-detalle").forEach((button) => {
        button.addEventListener("click", () => {
            const equipo = equipos.find((item) => String(item.id) === String(button.dataset.id));
            if (!equipo) return;

            const jugadores = Array.isArray(equipo.jugadores) && equipo.jugadores.length > 0
                ? equipo.jugadores.map((jugador) => `- ${jugador.nombre || "Jugador"}`).join("\n")
                : "- Sin jugadores registrados";

            alert(`Equipo: ${equipo.nombre}\nDirector técnico: ${equipo.directorTecnico || "Sin dato"}\nClasificación: ${equipo.tipoClasificacion || "Sin dato"}\n\nJugadores:\n${jugadores}`);
        });
    });

    equiposContainer.querySelectorAll(".btn-editar").forEach((button) => {
        button.addEventListener("click", () => {
            const equipo = equipos.find((item) => String(item.id) === String(button.dataset.id));
            if (equipo && window.abrirModalEquipo) {
                window.abrirModalEquipo(equipo);
            }
        });
    });

    equiposContainer.querySelectorAll(".btn-eliminar").forEach((button) => {
        button.addEventListener("click", async () => {
            const equipo = equipos.find((item) => String(item.id) === String(button.dataset.id));
            if (!equipo) return;

            const confirmar = window.confirm(`¿Estás seguro de eliminar el equipo "${equipo.nombre}"?`);
            if (!confirmar) return;

            try {
                await EquipoService.eliminarEquipo(equipo.id);
                mostrarToast("Equipo eliminado correctamente.", "success");
                await cargarEquipos(equiposContainer);
            } catch (error) {
                mostrarToast(error.message || "No se pudo eliminar el equipo", "error");
            }
        });
    });
}


