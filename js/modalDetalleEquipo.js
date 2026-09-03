// Modal de detalle de equipo (FRONTEND_VISION.md Fase1: reemplaza el
// alert() de "Detalle" por un modal presentable, con la cantidad de
// jugadores como bonus pedido en el propio hallazgo.
const DEFAULT_TEAM_IMAGE = "assets/comark.jpg";

export function inicializarModalDetalleEquipo() {
    const modalContainer = document.getElementById("modal-detalle-container");

    if (!modalContainer) {
        console.warn("No se encontró el contenedor del modal de detalle de equipo");
        return;
    }

    fetch("components/modal-detalle-equipo.html")
        .then((response) => response.text())
        .then((html) => {
            modalContainer.innerHTML = html;

            const modal = document.getElementById("modal-detalle-equipo");
            const btnCerrarModal = modal ? modal.querySelector(".close") : null;
            const btnCerrarSecundario = document.getElementById("detalle-equipo-cerrar-btn");

            if (!modal || !btnCerrarModal) {
                console.error("El modal de detalle de equipo no se encontró correctamente.");
                return;
            }

            modal.style.display = "none";

            const closeModal = () => {
                modal.style.display = "none";
            };

            window.abrirModalDetalleEquipo = (equipo) => {
                if (!equipo) return;

                document.getElementById("detalle-equipo-nombre").textContent = equipo.nombre || "Equipo sin nombre";
                document.getElementById("detalle-equipo-dt").textContent = equipo.directorTecnico || "Sin dato";
                document.getElementById("detalle-equipo-clasificacion").textContent = equipo.tipoClasificacion || "Sin dato";
                document.getElementById("detalle-equipo-titulos").textContent = equipo.titulos ?? 0;

                const imagen = document.getElementById("detalle-equipo-imagen");
                if (imagen) {
                    imagen.src = equipo.imagenUrl || DEFAULT_TEAM_IMAGE;
                    imagen.alt = equipo.nombre || "Escudo del equipo";
                    imagen.onerror = () => { imagen.src = DEFAULT_TEAM_IMAGE; };
                }

                const jugadores = Array.isArray(equipo.jugadores) ? equipo.jugadores : [];
                document.getElementById("detalle-equipo-cantidad-jugadores").textContent = jugadores.length;

                const lista = document.getElementById("detalle-equipo-jugadores");
                if (jugadores.length === 0) {
                    lista.innerHTML = "<li class=\"detalle-equipo-sin-jugadores\">Sin jugadores registrados.</li>";
                } else {
                    lista.innerHTML = jugadores.map((jugador) => {
                        const posicion = jugador.posicion || "Sin posición";
                        const dorsal = jugador.dorsal ?? "-";
                        return `<li>#${dorsal} ${jugador.nombre || "Jugador"} <span class="detalle-jugador-posicion">${posicion}</span></li>`;
                    }).join("");
                }

                modal.style.display = "flex";
            };

            btnCerrarModal.addEventListener("click", closeModal);
            if (btnCerrarSecundario) {
                btnCerrarSecundario.addEventListener("click", closeModal);
            }

            window.addEventListener("click", (event) => {
                if (event.target === modal) {
                    closeModal();
                }
            });
        })
        .catch((error) => console.error("Error cargando el modal de detalle de equipo:", error));
}
