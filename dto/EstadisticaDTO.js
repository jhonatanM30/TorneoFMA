// Espejo del EstadisticaDTO del backend
// (mas-que-amigos/src/main/java/com/marin/mas_que_amigos/dto/EstadisticaDTO.java).
//
// A diferencia de EquipoDTO/JugadorDTO/PartidoDTO, este DTO NO trae el
// jugador ni el partido completos anidados (el backend solo devuelve
// idJugador/idPartido), así que la pantalla de Estadísticas resuelve los
// nombres cruzando estos ids contra las listas ya cargadas de jugadores y
// partidos (jugadoresCache / partidosCache en js/estadisticas.js).
export class EstadisticaDTO {
    constructor({
        id = null,
        idJugador = null,
        idPartido = null,
        goles = 0,
        tarjetasAmarillas = 0,
        tarjetasRojas = 0,
        asistencias = 0
    } = {}) {
        this.id = id;
        this.idJugador = idJugador;
        this.idPartido = idPartido;
        this.goles = goles;
        this.tarjetasAmarillas = tarjetasAmarillas;
        this.tarjetasRojas = tarjetasRojas;
        this.asistencias = asistencias;
    }
}
