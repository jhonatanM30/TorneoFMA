import { inicializarModalEquipo } from "./modalEquipo.js";


document.addEventListener("DOMContentLoaded", function () {
    const equiposContainer = document.querySelector(".equipos-container");

    if (!equiposContainer) {
        console.error("No se encontró el contenedor de equipos. Verifica que el ID 'equipos-container' esté en equipos.html");
        return;
    }

    cargarEquipos(equiposContainer);
    inicializarModalEquipo(); //  Llamamos a la inicialización del modal
});

function cargarEquipos(equiposContainer) {
    const equipos = [
        { nombre: "Equipo 1", dt: "DT 1", img: "assets/comark.jpg" },
        { nombre: "Equipo 2", dt: "DT 2", img: "assets/comark.jpg" },
        { nombre: "Equipo 3", dt: "DT 3", img: "assets/comark.jpg" },
        { nombre: "Equipo 4", dt: "DT 4", img: "assets/comark.jpg" },
        { nombre: "Equipo 5", dt: "DT 5", img: "assets/comark.jpg" }
    ];

    let equiposHTML = "";
    equipos.forEach(equipo => {
        equiposHTML += `
            <div class="equipo-card">
                <img src="${equipo.img}" alt="${equipo.nombre}">
                <h3>${equipo.nombre}</h3>
                <p>DT: ${equipo.dt}</p>
                <button class="ver-jugadores-btn">Ver jugadores</button>
                <button class="ver-jugadores-btn">Editar</button>
            </div>
        `;
    });

    equiposContainer.innerHTML = equiposHTML;
}


