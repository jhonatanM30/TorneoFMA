document.addEventListener("DOMContentLoaded", function() {
    // Cargar el menú y el footer dinámicamente
    loadComponent("components/menu.html", "menu-container");
    loadComponent("components/footer.html", "footer-container");

    // Función para cargar un componente HTML en un contenedor
    function loadComponent(url, containerId) {
        fetch(url)
            .then(response => response.text())
            .then(data => document.getElementById(containerId).innerHTML = data)
            .catch(error => console.error("Error al cargar el componente:", error));
    }
});

function toggleMenu() {
    const sidebar = document.getElementById("sidebar");

    if (sidebar.classList.contains("open")) {
        sidebar.classList.remove("open"); // Cierra el menú
    } else {
        sidebar.classList.add("open"); // Abre el menú
    }
}
