// Espejo del PartidoDTO del backend
// (mas-que-amigos/src/main/java/com/marin/mas_que_amigos/dto/PartidoDTO.java).
//
// `equipoLocal` y `equipoVisitante` son de solo lectura (@JsonProperty
// READ_ONLY): el servidor los completa en las respuestas pero los ignora si
// se envían en el request. Para crear un partido se usan idEquipoLocal /
// idEquipoVisitante. `fecha` es "YYYY-MM-DD" y `hora` es "HH:mm" (ISO-8601,
// tal como los produce un <input type="date">/<input type="time">) —
// Jackson (jackson-datatype-jsr310) los serializa/deserializa así por
// defecto en este backend, sin necesidad de reformatear en el cliente.
export const FASES_PARTIDO = ["FASE_DE_GRUPOS", "REPECHAJE", "ELIMINACION_DIRECTA", "FINAL"];

export class PartidoDTO {
    constructor({
        id = null,
        idEquipoLocal = null,
        equipoLocal = null,
        idEquipoVisitante = null,
        equipoVisitante = null,
        fecha = "",
        hora = "",
        golesLocal = 0,
        golesVisitante = 0,
        fase = ""
    } = {}) {
        this.id = id;
        this.idEquipoLocal = idEquipoLocal;
        this.equipoLocal = equipoLocal;
        this.idEquipoVisitante = idEquipoVisitante;
        this.equipoVisitante = equipoVisitante;
        this.fecha = fecha;
        this.hora = hora;
        this.golesLocal = golesLocal;
        this.golesVisitante = golesVisitante;
        this.fase = fase;
    }
}
