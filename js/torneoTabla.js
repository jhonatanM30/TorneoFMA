import { escaparHtml } from "./formatos.js";

// Tabla de posiciones (liga y grupos). El servidor ya devuelve las filas
// ordenadas y con posiciones únicas: acá no se recalcula ni se reordena nada.
//
// clasifican: cantidad de primeros puestos que clasifican (grupos); esas
// filas se marcan visualmente.
export function htmlTablaPosiciones(standings, { clasifican = 0 } = {}) {
    if (!Array.isArray(standings) || standings.length === 0) {
        return "<p class='torneo-ayuda'>No hay equipos para mostrar en la tabla.</p>";
    }

    const filas = standings.map((fila) => {
        const clasifica = clasifican > 0 && fila.position <= clasifican;
        return `
            <tr class="${clasifica ? "fila-clasifica" : ""}">
                <td>${fila.position}</td>
                <td class="col-equipo">${escaparHtml(fila.teamName)}${clasifica ? ' <span class="marca-clasifica" title="Clasifica a la eliminatoria">Clasifica</span>' : ""}</td>
                <td>${fila.played}</td>
                <td>${fila.won}</td>
                <td>${fila.drawn}</td>
                <td>${fila.lost}</td>
                <td>${fila.goalsFor}</td>
                <td>${fila.goalsAgainst}</td>
                <td>${fila.goalDifference > 0 ? "+" : ""}${fila.goalDifference}</td>
                <td class="col-puntos">${fila.points}</td>
                <td>${fila.fairPlayPoints}</td>
            </tr>`;
    }).join("");

    return `
        <div class="tabla-scroll">
            <table class="tabla-posiciones">
                <thead>
                    <tr>
                        <th title="Posición">#</th>
                        <th class="col-equipo">Equipo</th>
                        <th title="Partidos jugados">PJ</th>
                        <th title="Ganados">G</th>
                        <th title="Empatados">E</th>
                        <th title="Perdidos">P</th>
                        <th title="Goles a favor">GF</th>
                        <th title="Goles en contra">GC</th>
                        <th title="Diferencia de goles">DG</th>
                        <th title="Puntos">Pts</th>
                        <th title="Juego limpio: amarillas x 1 + rojas x 2 (menos es mejor, solo desempata)">JL</th>
                    </tr>
                </thead>
                <tbody>${filas}</tbody>
            </table>
        </div>`;
}
