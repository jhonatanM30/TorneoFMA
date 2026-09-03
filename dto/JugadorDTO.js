// Espejo del JugadorDTO del backend
// (mas-que-amigos/src/main/java/com/marin/mas_que_amigos/dto/JugadorDTO.java).
//
// `equipo` es de solo lectura (@JsonProperty READ_ONLY en el backend): el
// servidor lo completa en las respuestas pero lo ignora si se envía en el
// request. Para crear/editar el equipo del jugador se usa `idEquipo`.
export const POSICIONES_JUGADOR = ["PORTERO", "DEFENSA", "MEDIOCAMPISTA", "DELANTERO"];

export class JugadorDTO {
    constructor({
        id = null,
        nombre = "",
        posicion = "",
        edad = null,
        dorsal = null,
        idEquipo = null,
        equipo = null
    } = {}) {
        this.id = id;
        this.nombre = nombre;
        this.posicion = posicion;
        this.edad = edad;
        this.dorsal = dorsal;
        this.idEquipo = idEquipo;
        this.equipo = equipo;
    }
}
