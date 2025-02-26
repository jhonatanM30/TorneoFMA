import { EquipoDTO } from "../dto/EquipoDTO.js";
import { EquipoService } from "../services/EquipoService.js";

export function inicializarModalEquipo() {
    // Esperar a que el modal se cargue en el DOM
    setTimeout(() => {
        const modalContainer = document.getElementById("modal-container");

        fetch("components/modal-equipo.html")
            .then(response => response.text())
            .then(html => {
                modalContainer.innerHTML = html;

                const modal = document.getElementById("modal-equipo");
                const btnAbrirModal = document.querySelector(".botones .btn:nth-child(3)");
                const btnCerrarModal = modal.querySelector(".close");
                const formEquipo = modal.querySelector("#form-equipo");

                if (!modal || !btnAbrirModal || !btnCerrarModal || !formEquipo) {
                    console.error("El modal o los botones no se encontraron.");
                    return;
                }

                modal.style.display = "none"; 

                // 🔹 Abrir modal
                btnAbrirModal.addEventListener("click", () => {                  
                    modal.style.display = "flex";
                });

                // 🔹 Cerrar modal
                btnCerrarModal.addEventListener("click", () => {
                    modal.style.display = "none";
                });

                // 🔹 Cerrar modal si se hace clic fuera
                window.addEventListener("click", (e) => {
                    if (e.target === modal) {
                        modal.style.display = "none";
                    }
                });

                // 🔹 Manejar envío del formulario
                formEquipo.addEventListener("submit", async (e) => {
                    e.preventDefault();

                    let equipoDTO = {...EquipoDTO}
                    equipoDTO = {
                        nombre: formEquipo.querySelector("#nombre").value,
                        dt: formEquipo.querySelector("#dt").value,
                        escudo: formEquipo.querySelector("#escudo").value
                    };

                    console.log("Enviando equipo:", equipoDTO);

                    const resultado = await EquipoService.crearEquipo(equipoDTO);

                    if (resultado) {
                        alert("Equipo agregado correctamente");
                        modal.style.display = "none";
                        formEquipo.reset();
                    } else {
                        alert("Error al agregar equipo");
                    }
                });

            })
            .catch(error => console.error("Error cargando el modal:", error));
    }, 1000); // Esperamos 1 segundo para asegurarnos de que se ha insertado en el DOM
}
