// Espejo del CambioJugadorDTO del backend
// (mas-que-amigos/src/main/java/com/marin/mas_que_amigos/dto/CambioJugadorDTO.java).
//
// Representa una sustitución (titular sale, suplente entra) registrada
// durante un partido en curso, con el minuto en que ocurrió.
// idPartido, jugadorSale, jugadorEntra y fechaRegistro son de solo lectura
// en el backend (se completan al responder); al crear un cambio solo se
// envían idJugadorSale, idJugadorEntra y minuto (idPartido va en la URL).
export class CambioJugadorDTO {
    constructor({
        id = null,
        idPartido = null,
        idJugadorSale = null,
        idJugadorEntra = null,
        minuto = 0,
        jugadorSale = null,
        jugadorEntra = null,
        fechaRegistro = null
    } = {}) {
        this.id = id;
        this.idPartido = idPartido;
        this.idJugadorSale = idJugadorSale;
        this.idJugadorEntra = idJugadorEntra;
        this.minuto = minuto;
        this.jugadorSale = jugadorSale;
        this.jugadorEntra = jugadorEntra;
        this.fechaRegistro = fechaRegistro;
    }
}
