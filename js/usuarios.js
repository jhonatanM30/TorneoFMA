import { UserService } from "../services/UserService.js";
import { EquipoService } from "../services/EquipoService.js";
import { Auth } from "./auth.js";
import { mostrarToast } from "./toast.js";
import { escaparHtml } from "./formatos.js";

// Gestión de usuarios (solo ADMIN, en Configuración): listar, crear DT o
// administrador y asignar / cambiar / quitar el equipo de un DT.
export function inicializarUsuarios() {
    const seccion = document.getElementById("usuarios-seccion");
    const lista = document.getElementById("usuarios-lista");
    const form = document.getElementById("form-usuario");
    const estado = document.getElementById("usuario-form-status");
    const selectRol = document.getElementById("usuario-rol");
    const selectEquipo = document.getElementById("usuario-equipo");
    if (!seccion || !lista || !form) return;

    let equipos = [];

    const opcionesEquipo = (seleccionado, etiquetaVacia) =>
        `<option value="">${etiquetaVacia}</option>` +
        equipos.map((e) => `<option value="${e.id}"${String(e.id) === String(seleccionado) ? " selected" : ""}>${escaparHtml(e.nombre)}</option>`).join("");

    const setEstado = (mensaje, tipo = "info") => {
        estado.textContent = mensaje || "";
        estado.className = `form-status ${tipo}`;
    };

    async function cargar() {
        lista.innerHTML = "<div class='loading-state'>Cargando usuarios...</div>";
        try {
            const [usuarios, listaEquipos] = await Promise.all([
                UserService.obtenerUsuarios(),
                EquipoService.obtenerEquipos()
            ]);
            equipos = Array.isArray(listaEquipos) ? listaEquipos : [];
            selectEquipo.innerHTML = opcionesEquipo("", "Sin equipo");
            render(usuarios);
        } catch (error) {
            lista.innerHTML = `<div class="empty-state">No se pudieron cargar los usuarios.<br>${escaparHtml(error.message)}</div>`;
        }
    }

    function render(usuarios) {
        if (usuarios.length === 0) {
            lista.innerHTML = "<div class='empty-state'>No hay usuarios creados.</div>";
            return;
        }

        lista.innerHTML = `
            <div class="registros-lista">
                ${usuarios.map((u) => `
                    <article class="registro-card usuario-card" data-id="${u.id}">
                        <div class="registro-card-header">
                            <h3>${escaparHtml(u.username)}</h3>
                            <span class="usuario-rol usuario-rol--${u.role}">${u.role === "ADMIN" ? "Administrador" : "Director Técnico"}</span>
                        </div>
                        ${u.role === "DT" ? `
                            <div class="usuario-equipo">
                                <label>Equipo:
                                    <select class="select-equipo-usuario" data-id="${u.id}">${opcionesEquipo(u.teamId, "Sin equipo")}</select>
                                </label>
                                <button class="btn btn-small btn-guardar-equipo" data-id="${u.id}">Guardar equipo</button>
                            </div>` : ""}
                    </article>
                `).join("")}
            </div>
        `;

        lista.querySelectorAll(".btn-guardar-equipo").forEach((boton) => {
            boton.addEventListener("click", async () => {
                const select = lista.querySelector(`.select-equipo-usuario[data-id="${boton.dataset.id}"]`);
                boton.disabled = true;
                try {
                    await UserService.asignarEquipo(boton.dataset.id, select.value ? Number(select.value) : null);
                    mostrarToast(select.value ? "Equipo asignado." : "Equipo quitado.", "success");
                    await cargar();
                } catch (error) {
                    mostrarToast(error.message || "No se pudo asignar el equipo.", "error");
                    boton.disabled = false;
                }
            });
        });
    }

    selectRol.addEventListener("change", () => {
        // Un administrador no tiene equipo.
        selectEquipo.disabled = selectRol.value === "ADMIN";
        if (selectEquipo.disabled) selectEquipo.value = "";
    });

    form.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const datos = {
            username: form.username.value.trim(),
            password: form.password.value,
            role: selectRol.value
        };
        if (selectEquipo.value) datos.teamId = Number(selectEquipo.value);

        setEstado("");
        try {
            await UserService.crearUsuario(datos);
            form.reset();
            selectEquipo.disabled = false;
            mostrarToast("Usuario creado correctamente.", "success");
            await cargar();
        } catch (error) {
            setEstado(error.message || "No se pudo crear el usuario.", "error");
        }
    });

    // El usuario puede iniciar sesión después de abrir la página: se carga al
    // entrar como ADMIN y se limpia al salir.
    const alCambiarSesion = () => {
        if (Auth.esAdmin()) {
            cargar();
        } else {
            lista.innerHTML = "";
        }
    };
    Auth.alCambiar((evento) => {
        if (["login", "logout", "expirada", "no-autorizado"].includes(evento.tipo)) alCambiarSesion();
    });
    alCambiarSesion();
}
