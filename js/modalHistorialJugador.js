import { TransferService } from "../services/TransferService.js";
import { formatearCosto, formatearFechaHora, escaparHtml } from "./formatos.js";

// Modal con el historial de equipos de un jugador: traspasos CONFIRMED
// (GET /api/transfers?status=CONFIRMED&playerId={id}).
export function inicializarModalHistorialJugador() {
    const modalContainer = document.getElementById("modal-historial-container");

    if (!modalContainer) {
        console.warn("No se encontró el contenedor del modal de historial");
        return;
    }

    fetch("components/modal-historial-jugador.html")
        .then((response) => response.text())
        .then((html) => {
            modalContainer.innerHTML = html;

            const modal = document.getElementById("modal-historial-jugador");
            const contenido = modal.querySelector("#historial-jugador-contenido");

            modal.style.display = "none";

            const closeModal = () => {
                modal.style.display = "none";
            };

            window.abrirModalHistorialJugador = async (jugador) => {
                if (!jugador) return;

                modal.querySelector("#historial-jugador-nombre").textContent = jugador.nombre || "Jugador";
                contenido.innerHTML = "<div class='loading-state'>Cargando historial...</div>";
                modal.style.display = "flex";

                try {
                    const traspasos = await TransferService.obtenerTraspasos({
                        status: "CONFIRMED",
                        playerId: jugador.id
                    });

                    if (traspasos.length === 0) {
                        contenido.innerHTML = "<div class='empty-state'>Este jugador no ha sido traspasado.</div>";
                        return;
                    }

                    contenido.innerHTML = `
                        <table class="tabla-traspasos">
                            <thead>
                                <tr><th>Origen</th><th>Destino</th><th>Costo</th><th>Fecha</th></tr>
                            </thead>
                            <tbody>
                                ${traspasos.map((t) => `
                                    <tr>
                                        <td>${escaparHtml(t.originTeamName)}</td>
                                        <td>${escaparHtml(t.destinationTeamName)}</td>
                                        <td>${formatearCosto(t.cost)}</td>
                                        <td>${formatearFechaHora(t.resolvedAt || t.requestedAt)}</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    `;
                } catch (error) {
                    contenido.innerHTML = `
                        <div class="empty-state">
                            No se pudo cargar el historial.<br>
                            ${escaparHtml(error.message || "Intenta nuevamente más tarde.")}
                        </div>
                    `;
                }
            };

            modal.querySelector(".close").addEventListener("click", closeModal);
            modal.querySelector("#historial-cerrar-btn").addEventListener("click", closeModal);
            window.addEventListener("click", (event) => {
                if (event.target === modal) closeModal();
            });
        })
        .catch((error) => console.error("Error cargando el modal de historial:", error));
}
