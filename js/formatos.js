// Utilidades de formato compartidas (costo de jugadores y traspasos).

// El costo es un decimal sin divisa (el backend no guarda moneda): se
// muestra como valor monetario, con separadores de miles y 2 decimales.
export function formatearCosto(valor) {
    const numero = Number(valor);
    const seguro = Number.isFinite(numero) ? numero : 0;
    return "$ " + seguro.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Las fechas del backend (LocalDateTime, sin zona) se interpretan y
// muestran en la zona horaria local del navegador, en español.
export function formatearFechaHora(fechaISO) {
    if (!fechaISO) return "";
    const fecha = new Date(fechaISO);
    if (Number.isNaN(fecha.getTime())) return "";
    return fecha.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

export function escaparHtml(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]
    ));
}
