import { JugadorService } from "../services/JugadorService.js";
import { PartidoService } from "../services/PartidoService.js";
import { AlineacionService } from "../services/AlineacionService.js";
import { CambioJugadorService } from "../services/CambioJugadorService.js";
import { EstadisticaService } from "../services/EstadisticaService.js";
import { mostrarToast } from "./toast.js";
import { inicializarModalAlineacion } from "./modalAlineacion.js";

let jugadoresCache = [];
let partidosCache = [];
let estadisticasCache = [];
let alineacionActual = [];

document.addEventListener("DOMContentLoaded", async function () {
    const resultado = document.querySelector(".alineacion-resultado");
    const filtroPartido = document.getElementById("filtro-partido-alineacion");
    const btnAgregar = document.getElementById("btn-agregar-alineacion");

    const cambioWrapper = document.getElementById("cambio-jugador-wrapper");
    const formCambio = document.getElementById("form-cambio-jugador");
    const selectCambioEquipo = document.getElementById("cambio-equipo");
    const selectCambioSale = document.getElementById("cambio-sale");
    const selectCambioEntra = document.getElementById("cambio-entra");
    const inputCambioMinuto = document.getElementById("cambio-minuto");
    const cambioFormStatus = document.getElementById("cambio-form-status");

    const historialSeccion = document.getElementById("historial-partido");
    const historialLista = document.getElementById("historial-lista");

    if (!resultado) {
        console.error("No se encontró el contenedor de alineaciones.");
        return;
    }

    // estadisticasCache se carga una sola vez (igual que en estadisticas.js)
    // y se filtra localmente por partido para armar el historial; no hay
    // endpoint "estadisticas por partido" en el backend.
    try {
        [jugadoresCache, partidosCache, estadisticasCache] = await Promise.all([
            JugadorService.obtenerJugadores(),
            PartidoService.obtenerPartidos(),
            EstadisticaService.obtenerEstadisticas()
        ]);
    } catch (error) {
        jugadoresCache = [];
        partidosCache = [];
        estadisticasCache = [];
        console.error("No se pudieron cargar jugadores/partidos/estadísticas para Alineaciones:", error);
    }

    filtroPartido.innerHTML = '<option value="">Seleccione un partido para ver su alineación</option>' +
        partidosCache.map((partido) => `<option value="${partido.id}">${partido.equipoLocal?.nombre || "Local"} vs ${partido.equipoVisitante?.nombre || "Visitante"} (${partido.fecha || "sin fecha"})</option>`).join("");

    inicializarModalAlineacion({
        partidos: partidosCache,
        jugadores: jugadoresCache,
        onAlineacionGuardada: async () => {
            await mostrarAlineacion(filtroPartido.value);
        }
    });

    btnAgregar.addEventListener("click", () => {
        if (window.abrirModalAlineacion) {
            window.abrirModalAlineacion(filtroPartido.value || null);
        }
    });

    filtroPartido.addEventListener("change", () => mostrarAlineacion(filtroPartido.value));

    // FRONTEND_VISION.md Fase3: "Alineaciones deberia poder estar en un
    // apartado del partido creado". En vez de mover el modulo (rompería
    // la navegacion existente), Partidos enlaza aqui con
    // alineaciones.html?idPartido=X y esta pagina preselecciona ese
    // partido automaticamente.
    const params = new URLSearchParams(window.location.search);
    const idPartidoInicial = params.get("idPartido");
    if (idPartidoInicial && filtroPartido.querySelector(`option[value="${idPartidoInicial}"]`)) {
        filtroPartido.value = idPartidoInicial;
        await mostrarAlineacion(idPartidoInicial);
    }

    async function mostrarAlineacion(idPartido) {
        const partido = partidosCache.find((item) => String(item.id) === String(idPartido));

        if (!idPartido || !partido) {
            resultado.innerHTML = `
                <div class="empty-state">
                    Elige un partido arriba para ver quién está alineado.
                </div>
            `;
            alineacionActual = [];
            ocultarCambioYHistorial();
            return;
        }

        resultado.innerHTML = "<div class='loading-state'>Cargando alineación...</div>";

        try {
            const [alineacion, cambios] = await Promise.all([
                AlineacionService.obtenerPorPartido(idPartido),
                CambioJugadorService.obtenerPorPartido(idPartido)
            ]);
            alineacionActual = Array.isArray(alineacion) ? alineacion : [];
            render(partido, alineacionActual);
            actualizarSeccionCambio(partido);
            renderHistorial(partido, Array.isArray(cambios) ? cambios : []);
        } catch (error) {
            resultado.innerHTML = `
                <div class="empty-state">
                    No se pudo cargar la alineación de este partido.<br>
                    ${error.message || "Intenta nuevamente más tarde."}
                </div>
            `;
            alineacionActual = [];
            ocultarCambioYHistorial();
        }
    }

    function ocultarCambioYHistorial() {
        cambioWrapper.hidden = true;
        historialSeccion.hidden = true;
    }

    function render(partido, alineacion) {
        if (!partido) {
            resultado.innerHTML = `<div class="empty-state">Partido no encontrado.</div>`;
            return;
        }

        const idLocal = String(partido.equipoLocal?.id ?? "");
        const idVisitante = String(partido.equipoVisitante?.id ?? "");

        const deEquipo = (idEquipo) => alineacion.filter((item) => {
            const idEquipoJugador = String(item.jugador?.equipo?.id ?? "");
            return idEquipoJugador === idEquipo;
        });

        resultado.innerHTML = `
            ${tarjetaEquipo(partido.equipoLocal?.nombre || "Equipo local", deEquipo(idLocal))}
            ${tarjetaEquipo(partido.equipoVisitante?.nombre || "Equipo visitante", deEquipo(idVisitante))}
        `;
    }

    function tarjetaEquipo(nombreEquipo, jugadoresAlineados) {
        const titulares = jugadoresAlineados.filter((item) => item.titular);
        const suplentes = jugadoresAlineados.filter((item) => !item.titular);

        return `
            <article class="alineacion-equipo">
                <h3>${nombreEquipo}</h3>
                <h4>Titulares (${titulares.length}/11)</h4>
                <ul class="alineacion-lista">
                    ${listaJugadores(titulares)}
                </ul>
                <h4>Suplentes</h4>
                <ul class="alineacion-lista">
                    ${listaJugadores(suplentes)}
                </ul>
            </article>
        `;
    }

    function listaJugadores(items) {
        if (items.length === 0) {
            return '<li class="sin-jugadores">Sin jugadores registrados</li>';
        }

        return items.map((item) => {
            const jugador = item.jugador || jugadoresCache.find((j) => String(j.id) === String(item.idJugador));
            const nombre = jugador?.nombre || `Jugador #${item.idJugador}`;
            const dorsal = jugador?.dorsal ?? "-";
            return `<li>#${dorsal} — ${nombre}</li>`;
        }).join("");
    }

    // fase3-09: el formulario de "Registrar cambio" solo tiene sentido con
    // el partido EN_CURSO (el backend tambien lo valida). Al cambiar de
    // equipo, sale/entra se llenan con los titulares/suplentes reales de
    // ese equipo segun la alineacion ya cargada (alineacionActual).
    function actualizarSeccionCambio(partido) {
        const enCurso = (partido.estado || "PROGRAMADO") === "EN_CURSO";
        cambioWrapper.hidden = !enCurso;

        if (!enCurso) {
            return;
        }

        formCambio.reset();
        setCambioStatus("");

        selectCambioEquipo.innerHTML = '<option value="">Seleccione un equipo</option>' +
            `<option value="${partido.equipoLocal?.id ?? ""}">${partido.equipoLocal?.nombre || "Equipo local"}</option>` +
            `<option value="${partido.equipoVisitante?.id ?? ""}">${partido.equipoVisitante?.nombre || "Equipo visitante"}</option>`;

        selectCambioSale.innerHTML = '<option value="">Seleccione un equipo primero</option>';
        selectCambioSale.disabled = true;
        selectCambioEntra.innerHTML = '<option value="">Seleccione un equipo primero</option>';
        selectCambioEntra.disabled = true;
    }

    function actualizarJugadoresCambio() {
        const idEquipo = selectCambioEquipo.value;

        if (!idEquipo) {
            selectCambioSale.innerHTML = '<option value="">Seleccione un equipo primero</option>';
            selectCambioSale.disabled = true;
            selectCambioEntra.innerHTML = '<option value="">Seleccione un equipo primero</option>';
            selectCambioEntra.disabled = true;
            return;
        }

        const delEquipo = alineacionActual.filter((item) => String(item.jugador?.equipo?.id ?? "") === idEquipo);
        const titulares = delEquipo.filter((item) => item.titular);
        const suplentes = delEquipo.filter((item) => !item.titular);

        const opcion = (item) => {
            const jugador = item.jugador || jugadoresCache.find((j) => String(j.id) === String(item.idJugador));
            const nombre = jugador?.nombre || `Jugador #${item.idJugador}`;
            const dorsal = jugador?.dorsal ?? "-";
            return `<option value="${jugador?.id ?? item.idJugador}">#${dorsal} — ${nombre}</option>`;
        };

        selectCambioSale.disabled = false;
        selectCambioSale.innerHTML = titulares.length > 0
            ? '<option value="">Seleccione un jugador</option>' + titulares.map(opcion).join("")
            : '<option value="">Este equipo no tiene titulares alineados</option>';

        selectCambioEntra.disabled = false;
        selectCambioEntra.innerHTML = suplentes.length > 0
            ? '<option value="">Seleccione un jugador</option>' + suplentes.map(opcion).join("")
            : '<option value="">Este equipo no tiene suplentes alineados</option>';
    }

    selectCambioEquipo.addEventListener("change", actualizarJugadoresCambio);

    function setCambioStatus(message, type = "info") {
        cambioFormStatus.textContent = message || "";
        cambioFormStatus.className = `form-status ${type}`;
    }

    formCambio.addEventListener("submit", async (event) => {
        event.preventDefault();

        const idPartido = filtroPartido.value;
        const idJugadorSale = selectCambioSale.value ? Number(selectCambioSale.value) : null;
        const idJugadorEntra = selectCambioEntra.value ? Number(selectCambioEntra.value) : null;
        const minuto = inputCambioMinuto.value !== "" ? Number(inputCambioMinuto.value) : null;

        if (!idPartido) {
            setCambioStatus("Seleccione un partido.", "error");
            return;
        }
        if (!idJugadorSale || !idJugadorEntra) {
            setCambioStatus("Seleccione el jugador que sale y el que entra.", "error");
            return;
        }
        if (idJugadorSale === idJugadorEntra) {
            setCambioStatus("El jugador que sale y el que entra no pueden ser el mismo.", "error");
            return;
        }
        if (minuto === null || minuto < 0) {
            setCambioStatus("Indique el minuto del cambio.", "error");
            return;
        }

        setCambioStatus("");

        try {
            await CambioJugadorService.registrarCambio(idPartido, {
                idJugadorSale,
                idJugadorEntra,
                minuto
            });
            mostrarToast("Cambio de jugador registrado.", "success");
            await mostrarAlineacion(idPartido);
        } catch (error) {
            setCambioStatus(error.message || "No se pudo registrar el cambio.", "error");
        }
    });

    // fase3-10: el historial combina los cambios de jugador (CambioJugador,
    // audit log de sustituciones) con las estadisticas que traen minuto
    // (goles/tarjetas/asistencias registrados durante el partido), todo
    // ordenado por minuto. Esto es lo que satisface "consultar los cambios
    // realizados" del hallazgo original.
    function renderHistorial(partido, cambios) {
        const idPartido = String(partido.id);

        const eventosCambio = cambios.map((cambio) => ({
            minuto: cambio.minuto ?? 0,
            texto: `Cambio: sale ${cambio.jugadorSale?.nombre || `Jugador #${cambio.idJugadorSale}`}, entra ${cambio.jugadorEntra?.nombre || `Jugador #${cambio.idJugadorEntra}`}`
        }));

        const eventosEstadistica = estadisticasCache
            .filter((estadistica) => String(estadistica.idPartido) === idPartido && estadistica.minuto !== null && estadistica.minuto !== undefined)
            .map((estadistica) => {
                const jugador = jugadoresCache.find((j) => String(j.id) === String(estadistica.idJugador));
                const nombre = jugador?.nombre || `Jugador #${estadistica.idJugador}`;
                const partes = [];
                if (estadistica.goles > 0) partes.push(`${estadistica.goles} gol(es)`);
                if (estadistica.tarjetasAmarillas > 0) partes.push(`${estadistica.tarjetasAmarillas} amarilla(s)`);
                if (estadistica.tarjetasRojas > 0) partes.push(`${estadistica.tarjetasRojas} roja(s)`);
                if (estadistica.asistencias > 0) partes.push(`${estadistica.asistencias} asistencia(s)`);
                return {
                    minuto: estadistica.minuto,
                    texto: `${nombre}: ${partes.length > 0 ? partes.join(", ") : "estadística registrada"}`
                };
            });

        const eventos = [...eventosCambio, ...eventosEstadistica].sort((a, b) => a.minuto - b.minuto);

        historialSeccion.hidden = false;
        historialLista.innerHTML = eventos.length === 0
            ? '<li class="sin-eventos">Todavía no hay cambios ni estadísticas con minuto registradas para este partido.</li>'
            : eventos.map((evento) => `<li><span class="historial-minuto">${evento.minuto}'</span><span>${evento.texto}</span></li>`).join("");
    }
});
