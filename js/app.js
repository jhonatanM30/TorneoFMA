document.addEventListener("DOMContentLoaded", function() {
    loadComponent("components/menu.html", "menu-container");
    loadComponent("components/footer.html", "footer-container");
});

// Función para cargar un componente HTML en un contenedor
function loadComponent(url, containerId) {
    fetch(url)
        .then(response => response.text())
        .then(data => document.getElementById(containerId).innerHTML = data)
        .catch(error => console.error("Error al cargar el componente:", error));
}

// Función para mostrar/ocultar el menú
function toggleMenu() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar.style.left === "0px") {
        sidebar.style.left = "-250px";
    } else {
        sidebar.style.left = "0px";
    }
}
