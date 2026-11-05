// Etiquetas en español para los valores del módulo de torneos.

export const ETIQUETAS_FORMATO = {
    LEAGUE: "Liga",
    GROUPS_KNOCKOUT: "Grupos y eliminatoria",
    KNOCKOUT: "Eliminatoria directa",
    LEGACY: "Histórico"
};

export const ETIQUETAS_ESTADO_TORNEO = {
    DRAFT: "Borrador",
    IN_PROGRESS: "En curso",
    FINISHED: "Finalizado"
};

// Formatos que se pueden elegir al crear o editar. LEGACY es solo del
// torneo "Histórico" y nunca se ofrece.
export const FORMATOS_ELEGIBLES = ["LEAGUE", "GROUPS_KNOCKOUT", "KNOCKOUT"];

export const ETIQUETAS_FASE = {
    FASE_DE_GRUPOS: "Fase de grupos",
    REPECHAJE: "Repechaje",
    ELIMINACION_DIRECTA: "Eliminación directa",
    FINAL: "Final"
};

export const ETIQUETAS_ESTADO_PARTIDO = {
    PROGRAMADO: "Programado",
    EN_CURSO: "En curso",
    FINALIZADO: "Finalizado"
};

// El torneo "Histórico" está protegido: no se edita, elimina, inicia,
// finaliza ni admite inscripciones.
export const esHistorico = (torneo) => torneo?.format === "LEGACY";
