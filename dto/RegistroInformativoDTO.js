// Espejo del RegistroInformativoDTO del backend
// (mas-que-amigos/src/main/java/com/marin/mas_que_amigos/dto/RegistroInformativoDTO.java).
//
// fechaPublicacion no se envía al crear: la asigna el servidor. Cuando el
// backend responde, ya viene con ese valor.
export class RegistroInformativoDTO {
    constructor({
        id = null,
        titulo = "",
        contenido = "",
        fechaPublicacion = null
    } = {}) {
        this.id = id;
        this.titulo = titulo;
        this.contenido = contenido;
        this.fechaPublicacion = fechaPublicacion;
    }
}
