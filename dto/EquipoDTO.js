export class EquipoDTO {
    constructor({
        id = null,
        nombre = "",
        directorTecnico = "",
        imagenUrl = "",
        titulos = 0,
        tipoClasificacion = "",
        jugadores = []
    } = {}) {
        this.id = id;
        this.nombre = nombre;
        this.directorTecnico = directorTecnico;
        this.imagenUrl = imagenUrl;
        this.titulos = titulos;
        this.tipoClasificacion = tipoClasificacion;
        this.jugadores = jugadores;
    }
}
