import { PartidoService } from "../services/PartidoService.js";
import { abrirFormulario } from "./modalFormulario.js";
import { mostrarToast } from "./toast.js";

// Un partido necesita penales cuando está en curso con el marcador igual.
// (El servidor decide si el partido exige ganador; si no, rechaza el registro.)
export const necesitaPenales = (partido) =>
    partido?.estado === "EN_CURSO" && Number(partido.golesLocal ?? 0) === Number(partido.golesVisitante ?? 0);

// Formulario para registrar los penales de cada equipo (solo ADMIN).
export function abrirFormularioPenales(partido, alGuardar = async () => {}) {
    const local = partido.equipoLocal?.nombre || "Equipo local";
    const visitante = partido.equipoVisitante?.nombre || "Equipo visitante";

    abrirFormulario({
        titulo: "Registrar penales",
        ayuda: `${local} ${partido.golesLocal ?? 0} - ${partido.golesVisitante ?? 0} ${visitante}. Los penales deben ser distintos: el de más penales gana. No cambian el marcador.`,
        textoEnviar: "Registrar",
        campos: [
            { name: "penalesLocal", label: `Penales de ${local}`, type: "number", min: 0, step: 1, required: true, value: partido.penalesLocal ?? "" },
            { name: "penalesVisitante", label: `Penales de ${visitante}`, type: "number", min: 0, step: 1, required: true, value: partido.penalesVisitante ?? "" }
        ],
        alEnviar: async ({ penalesLocal, penalesVisitante }) => {
            if (penalesLocal === penalesVisitante) {
                throw new Error("Los penales de ambos equipos deben ser distintos.");
            }
            await PartidoService.registrarPenales(partido.id, penalesLocal, penalesVisitante);
            mostrarToast("Penales registrados. Ya puedes finalizar el partido.", "success");
            await alGuardar();
        }
    });
}
