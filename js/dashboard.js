import { EquipoService } from "../services/EquipoService.js";
import { JugadorService } from "../services/JugadorService.js";
import { PartidoService } from "../services/PartidoService.js";
import { EstadisticaService } from "../services/EstadisticaService.js";
import { RegistroInformativoService } from "../services/RegistroInformativoService.js";

// Colores fijos (no tomados de las variables CSS) porque Chart.js dibuja en
// <canvas>: no hereda el tema por CSS, así que si el usuario cambia a modo
// oscuro los gráficos igual se ven bien con estos mismos colores de marca.
const COLOR_POR_POSICION = {
    PORTERO: "#3498db",
    DEFENSA: "#145A32",
    MEDIOCAMPISTA: "#FFD700",
    DELANTERO: "#b22222"
};

const ETIQUETAS_POSICION = {
    PORTERO: "Portero",
    DEFENSA: "Defensa",
    MEDIOCAMPISTA: "Mediocampista",
    DELANTERO: "Delantero"
};

document.addEventListener("DOMContentLoaded", async function () {
    const [equipos, jugadores, partidos, estadisticas] = await Promise.allSettled([
        EquipoService.obtenerEquipos(),
        JugadorService.obtenerJugadores(),
        PartidoService.obtenerPartidos(),
        EstadisticaService.obtenerEstadisticas()
    ]);

    pintarContador("stat-equipos", equipos);
    pintarContador("stat-jugadores", jugadores);
    pintarContador("stat-partidos", partidos);
    pintarContador("stat-estadisticas", estadisticas);

    // Los gráficos necesitan que Chart.js (cargado por <script> en
    // index.html, antes que este módulo) ya esté disponible como global.
    if (typeof Chart === "undefined") {
        console.error("Chart.js no se cargó; se omiten los gráficos de Inicio.");
        return;
    }

    if (jugadores.status === "fulfilled") {
        graficarJugadoresPorPosicion(jugadores.value);
    }

    if (equipos.status === "fulfilled" && jugadores.status === "fulfilled" && estadisticas.status === "fulfilled") {
        graficarGolesPorEquipo(equipos.value, jugadores.value, estadisticas.value);
    }

    await cargarNovedades();
});

// FRONTEND_VISION.md Fase5, hallazgo 2: registros informativos creados
// desde Configuracion (Fase 6), mostrados aqui del mas reciente al mas
// antiguo (el backend ya los devuelve ordenados asi).
async function cargarNovedades() {
    const contenedor = document.querySelector(".novedades-container");
    if (!contenedor) return;

    try {
        const registros = await RegistroInformativoService.obtenerRegistros();
        renderNovedades(contenedor, Array.isArray(registros) ? registros : []);
    } catch (error) {
        console.error("No se pudieron cargar las novedades del torneo:", error);
        contenedor.innerHTML = `
            <div class="empty-state">
                No se pudieron cargar las novedades del torneo.
            </div>
        `;
    }
}

function renderNovedades(contenedor, registros) {
    if (registros.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                Todavía no hay novedades publicadas. Se crean desde Configuración.
            </div>
        `;
        return;
    }

    contenedor.innerHTML = `
        <div class="novedades-lista">
            ${registros.map((registro) => tarjetaNovedad(registro)).join("")}
        </div>
    `;
}

function tarjetaNovedad(registro) {
    const fecha = formatearFechaNovedad(registro.fechaPublicacion);
    return `
        <article class="novedad-card">
            <h4>${registro.titulo}</h4>
            <p class="novedad-fecha">${fecha}</p>
            <p class="novedad-contenido">${registro.contenido}</p>
        </article>
    `;
}

function formatearFechaNovedad(fechaISO) {
    if (!fechaISO) return "";
    const fecha = new Date(fechaISO);
    if (Number.isNaN(fecha.getTime())) return "";
    return fecha.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

function pintarContador(idElemento, resultado) {
    const elemento = document.getElementById(idElemento);
    if (!elemento) return;

    if (resultado.status === "fulfilled" && Array.isArray(resultado.value)) {
        elemento.textContent = resultado.value.length;
    } else {
        console.error(`No se pudo cargar el contador de ${idElemento}:`, resultado.reason);
        elemento.textContent = "-";
    }
}

function graficarJugadoresPorPosicion(jugadores) {
    const canvas = document.getElementById("chart-posiciones");
    if (!canvas) return;

    const conteos = { PORTERO: 0, DEFENSA: 0, MEDIOCAMPISTA: 0, DELANTERO: 0 };
    jugadores.forEach((jugador) => {
        if (conteos[jugador.posicion] !== undefined) {
            conteos[jugador.posicion] += 1;
        }
    });

    const posiciones = Object.keys(conteos).filter((posicion) => conteos[posicion] > 0);

    if (posiciones.length === 0) {
        mostrarSinDatos(canvas, "Todavía no hay jugadores registrados.");
        return;
    }

    new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: posiciones.map((posicion) => ETIQUETAS_POSICION[posicion]),
            datasets: [{
                data: posiciones.map((posicion) => conteos[posicion]),
                backgroundColor: posiciones.map((posicion) => COLOR_POR_POSICION[posicion]),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } }
            }
        }
    });
}

function graficarGolesPorEquipo(equipos, jugadores, estadisticas) {
    const canvas = document.getElementById("chart-goles-equipo");
    if (!canvas) return;

    const jugadorPorId = new Map(jugadores.map((jugador) => [String(jugador.id), jugador]));
    const golesPorEquipo = new Map();

    estadisticas.forEach((estadistica) => {
        const jugador = jugadorPorId.get(String(estadistica.idJugador));
        const idEquipo = jugador?.idEquipo ?? jugador?.equipo?.id;
        if (idEquipo === undefined || idEquipo === null) return;

        const totalPrevio = golesPorEquipo.get(idEquipo) || 0;
        golesPorEquipo.set(idEquipo, totalPrevio + Number(estadistica.goles || 0));
    });

    const equiposConGoles = equipos
        .map((equipo) => ({ nombre: equipo.nombre, goles: golesPorEquipo.get(equipo.id) || 0 }))
        .filter((item) => item.goles > 0)
        .sort((a, b) => b.goles - a.goles);

    if (equiposConGoles.length === 0) {
        mostrarSinDatos(canvas, "Todavía no hay goles registrados en Estadísticas.");
        return;
    }

    new Chart(canvas, {
        type: "bar",
        data: {
            labels: equiposConGoles.map((item) => item.nombre),
            datasets: [{
                label: "Goles",
                data: equiposConGoles.map((item) => item.goles),
                backgroundColor: "#145A32"
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });
}

function mostrarSinDatos(canvas, mensaje) {
    const contenedor = canvas.closest(".chart-card");
    if (contenedor) {
        canvas.remove();
        const aviso = document.createElement("p");
        aviso.className = "chart-sin-datos";
        aviso.textContent = mensaje;
        contenedor.appendChild(aviso);
    }
}
