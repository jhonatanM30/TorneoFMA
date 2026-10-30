import { TransferService } from "../services/TransferService.js";
import { mostrarToast } from "./toast.js";
import { formatearCosto, formatearFechaHora, escaparHtml } from "./formatos.js";

// Bandeja de solicitudes de traspaso pendientes (vista de organizador, en
// Configuración): GET /api/transfers?status=PENDING.
export async function inicializarBandejaTraspasos() {
    const contenedor = document.querySelector(".traspasos-container");
    if (!contenedor) return;

    async function cargar() {
        contenedor.innerHTML = "<div class='loading-state'>Cargando solicitudes de traspaso...</div>";
        try {
            render(await TransferService.obtenerTraspasos({ status: "PENDING" }));
        } catch (error) {
            contenedor.innerHTML = `
                <div class="empty-state">
                    No se pudieron cargar las solicitudes de traspaso.<br>
                    ${escaparHtml(error.message || "Intenta nuevamente más tarde.")}
                </div>
            `;
        }
    }

    function render(traspasos) {
        if (traspasos.length === 0) {
            contenedor.innerHTML = "<div class='empty-state'>No hay solicitudes de traspaso pendientes.</div>";
            return;
        }

        contenedor.innerHTML = `
            <div class="registros-lista">
                ${traspasos.map((t) => `
                    <article class="registro-card traspaso-card" data-id="${t.id}">
                        <div class="registro-card-header">
                            <h3>${escaparHtml(t.playerName)}</h3>
                            <span class="registro-card-acciones">
                                <button class="btn btn-small btn-confirmar" data-requiere-admin="true" data-id="${t.id}">Confirmar</button>
                                <button class="btn btn-small btn-eliminar btn-rechazar" data-requiere-admin="true" data-id="${t.id}">Rechazar</button>
                            </span>
                        </div>
                        <p class="traspaso-ruta">${escaparHtml(t.originTeamName)} <span aria-hidden="true">→</span> ${escaparHtml(t.destinationTeamName)}</p>
                        <p class="registro-contenido">
                            <strong>Costo:</strong> ${formatearCosto(t.cost)}
                            ${t.destinationDorsal ? ` · <strong>Dorsal nuevo:</strong> ${t.destinationDorsal}` : ""}
                        </p>
                        <p class="registro-fecha">Solicitado: ${formatearFechaHora(t.requestedAt)}</p>
                    </article>
                `).join("")}
            </div>
        `;

        const buscar = (id) => traspasos.find((t) => String(t.id) === String(id));

        contenedor.querySelectorAll(".btn-confirmar").forEach((button) => {
            button.addEventListener("click", async () => {
                const t = buscar(button.dataset.id);
                if (!t) return;

                const confirmar = window.confirm(
                    `¿Confirmar el traspaso de "${t.playerName}" de ${t.originTeamName} a ${t.destinationTeamName}?\n\n` +
                    "El jugador cambiará de equipo y las demás solicitudes pendientes de este jugador se rechazarán automáticamente."
                );
                if (!confirmar) return;

                await ejecutar(() => TransferService.confirmarTraspaso(t.id),
                    `Traspaso confirmado: ${t.playerName} ahora pertenece a ${t.destinationTeamName}. Las demás solicitudes pendientes de este jugador fueron rechazadas.`);
            });
        });

        contenedor.querySelectorAll(".btn-rechazar").forEach((button) => {
            button.addEventListener("click", async () => {
                const t = buscar(button.dataset.id);
                if (!t) return;

                const confirmar = window.confirm(`¿Rechazar la solicitud de traspaso de "${t.playerName}" a ${t.destinationTeamName}?`);
                if (!confirmar) return;

                await ejecutar(() => TransferService.rechazarTraspaso(t.id),
                    `Solicitud rechazada: ${t.playerName} se queda en ${t.originTeamName}.`);
            });
        });
    }

    async function ejecutar(accion, mensajeExito) {
        contenedor.querySelectorAll("button").forEach((b) => { b.disabled = true; });
        try {
            await accion();
            mostrarToast(mensajeExito, "success");
        } catch (error) {
            // Incluye "dorsal ocupado" al confirmar: la solicitud sigue
            // pendiente, por eso igual se refresca la bandeja.
            mostrarToast(error.message || "No se pudo completar la acción.", "error");
        }
        await cargar();
    }

    await cargar();
}
