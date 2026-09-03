// Espejo del AlineacionDTO del backend
// (mas-que-amigos/src/main/java/com/marin/mas_que_amigos/dto/AlineacionDTO.java).
//
// `partido` y `jugador` son de solo lectura (@JsonProperty READ_ONLY): el
// servidor los completa en las respuestas pero los ignora si se envían en
// el request. Para crear una alineación se usan idPartido/idJugador.
export class AlineacionDTO {
    constructor({
        idPartido = null,
        idJugador = null,
        titular = false,
        partido = null,
        jugador = null
    } = {}) {
        this.idPartido = idPartido;
        this.idJugador = idJugador;
        this.titular = titular;
        this.partido = partido;
        this.jugador = jugador;
    }
}
