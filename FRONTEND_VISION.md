Resolver los hallasgos en la funcionalidad de una aplicacion full-stack existente, frontend(MasQueAmigos-Torneo) + backend(mas-que-amigos) 
la cual es un proyecto real que ya funcional en su mayoría, no un desarrollo desde cero. 
Trabajar fase por fase cada hallazgos

CONTEXTO
Actualmente si un usuario hace uso de la aplicacion, podria encontrarse con
algunos modulos que responden correctamente, pero otros presentan comportamientos
que no son los que deberia tener, se documentaron como hallazgos cada uno de los 
que se lograron detectar y clasificar por fases, son los siguientes : 

Fase1
##EQUIPOS##

-Al momento de crear y editar equipo, deberia existir un boton de carga que me permita subir imagenes desde el dispositivo y que esta se guarde donde estan las otras existenten para el escudo del equipo
-Al momento de crear equipo, Tipo de clasificacion deberia ser unos valores que lleguen por parametria, inicialmente esten Eliminatoria, Repechaje
-Al momento de detallar equipo, me abre un alert y deberia ser un modal o una pagina visualmente mas detallista, ya que se presentaria mas profesional y los jugadores se podrian poder mostrar de mejor manera y como  bonus mostrar la cantidad de jugadores de ese equipo
-Sobre cada una de las acciones y/o pagina de la aplicacion deberia existir un reload/cargando... preferiblemente familiarizado con la pagina con el fin de que la pagina no quede en blanco mientras carga.
-Al momento de buscar equipo por nombre no parece funcionar, escribo la inicial de uno existen y no me lo muestra en la pantalla
-Deberia existir un boton para listar todo, en caso de que se haya aplicado un filtro y se quiera volver al listado
-Al dar clic en ver equipo en repechaje, me deberias de permitir ver los equipos que su tipo de clasificacion fue repechaje o los equipos que clasificaron por eliminatoria, deberia existir ese filtro.
-Sorteos de partidos deberia estar en la pantalla de partidos.

Fase2
##JUGADORES##

-Al momento de cargar la pagina de jugadores deberia mostrarme la lista de jugadores, no el modal para crear variao jugadore
-Deberia poder crear varios jugadores y cada uno podria estar relacionado a un equipo diferente a no ser que tecnicamente esto no sea viable, ejemplo equipo macalister agrego 2 jugadores, equipo socios.com agrego 3 jugadores y todo esto se vaya en el proceso batch
-Es posible guardar mas de 20 jugadores en una misma ejecucion pero a medida que voy agregando, el modal dinamicamente crece, pero se pierden sin poder realizar una accion en los botones inferiores guardar y cancelar, validar si se deberia implementar otro tipo de pantalla.
-En la pantalla cargar varios jugadores puedo iniciar a cargar jugadores, pero si por error toco fuera del modal se cierra y al vover pierdo la información ya diligenciada.
-En la pantalla cargar varios jugadores no deberia mostrarse información tecnica, si informativa acerca de como se llena e formulario
-Una vez cargados los jugadores en bd la información de respuesta deberia verse en un toast no en el mismo modal para que este se pueda cerrar y mostrar la lista con los nuevos jugadores
-Como bonus se podria implementar un boton opcional para cargar la foto del jugador y que esta se vea como fondo de la card actual de manera suave predminando la información del jugador, en caso de que no la cargue card queda como esta actualmente
-En ninguna de las funcionalidades del proyecto deberia existir Alert, siempre toast

Fase3
#PARTIDOS Y ALINEACIONES#

-Al crear un partido se debe permitir seleccionar diferentes equipos entre local y visitante antes de continuar con la demas información, nunca que sean los mismos equipos
-En la pantalla de programar partido los botones inferiores no son visibles, no permiten reaizar ninguna accion, despues de llenar el formulario.
-Al momento de crear un partido siempre deberia ser por default goles local y visitantante 0-0
-Todas las funcionalidades de los filtros deben funcionar correctamente 
-Un partido se deberia permitir Editar
-Deberia de existir la opcion de sortear partido y seleccionar los equipos que participaran en el sorteo de manera aleatoria cumpliendo algunas condiciones casi obvias de un partido
ejemplo, para que se pueda dar el sorteo, deberian existir mas de 2 equipos, con 2 no habria que sortear, es un partido para programar
si hay 3 sale al azar un partido y el equipo faltante no tendra partido, si se seleccionan 4 equipos el sorteo se hace para definir los 2 partidos y asi sucesivamente
-Los detalles del partido sorteado se llenan antes de de darle sortear como cuando se crea un partido y solo los equipos quedan al azar, de igual manera de necesitar una edicion esto es posible
-Alineaciones debria poder estar en un apartado del partido creado, al seleccionar un equipo de ese partido, me deberia permitir alinear de sus jugadores los titulares 
-Me gustaria ir mas alla en partido-alineaciones, tener la manera de que despues de que inicie el partido pueda realizar un cambio entre un suplente y salga un titular y se vea reflejado el tiempo, lo mismo en ese partido poder irlo editando en el transcurso con sucesos normales de partido como amarilla, roja, gol y asistencia que posteriormente me sirvan en la consulta de estadisticas, esto si lo ves viable desde este modulo
-Deberia poder consultar las alineaciones de cada partido, tanto de jugadores titulares y suplentes y los cambios realizados en el mismo

Fase4
#ESTADISTICAS#
-Deberia permitir consultar estadisticas de jugadores, partidos y equipos esto mediantes las actualizaciones que se hagan durante el partido, goles y asistencia de un jugador de un equipo, tarjetas amarillas y rojas de un jugador, de un equipo, titulos ganados, participaciones entre ellas con la información que se pueda obtener.
-En este modulo permitete darle estilo con diferentes graficos ademas de la información

Fase5
#INICIO#

-Manten solo las card y no las barras estadisticas
-Deberia permitir mostrar registros informativos que se creen desde el modulo de configuracion y organizarlo en la pantalla de la mejor manera

Fase6
#CONFIGURACION#

-Deberia permitir crear y eliminar especies de blog para la pagina de inicio

Fase 7
#CONSTANTE INTENCIONAL#
De manera momentanea y para no crear un Login que distinga a los admin de los usuarios consultivos en este mvp
se me ocurrio que al cargar la pagina se pida ingresar una clave si es un usuario con rol de Director tecnico
esa clave se valide en todos los metodos que no son de consulta de manera quemada, si intenta una accion de ese tipo y no cumple decirle que no esta autorizado
que solo puede consultar información dentro de la app, de igual manera me puede proponer algo que cumpla con la misma intencion

