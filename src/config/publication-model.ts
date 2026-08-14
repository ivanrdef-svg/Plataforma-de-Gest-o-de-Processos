/**
 * Build 018 — Workflow Publication Governance.
 *
 * Vocabulário da PUBLICAÇÃO de uma versão. Não cria um novo Lifecycle nem um
 * novo motor de validação: a prontidão é sempre DERIVADA do resultado da
 * Build 016 (validateWorkflow) sobre a versão em rascunho.
 */

export const IMPACT_LEVELS = ["baixo", "médio", "alto"] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

export const IMPACT_DESCRIPTION: Record<ImpactLevel, string> = {
  baixo: "Alterações sem impacto relevante no fluxo operacional.",
  médio: "Alterações que modificam etapas, responsabilidades ou regras.",
  alto: "Alterações que podem alterar significativamente o comportamento ou os controles do processo.",
};

export const IMPACT_TONE: Record<ImpactLevel, string> = {
  baixo: "bg-muted text-muted-foreground",
  médio: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  alto: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

/** Estado derivado — nunca persistido como um segundo ciclo de vida. */
export const READINESS_STATES = [
  "não pronta",
  "pronta com avisos",
  "pronta",
] as const;
export type ReadinessState = (typeof READINESS_STATES)[number];

export const READINESS_TONE: Record<ReadinessState, string> = {
  "não pronta": "bg-destructive/10 text-destructive",
  "pronta com avisos": "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  pronta: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export const READINESS_HINT: Record<ReadinessState, string> = {
  "não pronta": "Existem erros de validação que impedem a publicação.",
  "pronta com avisos":
    "Tecnicamente válida. Os avisos não bloqueiam, mas devem ser conhecidos antes de publicar.",
  pronta: "Nenhum erro e nenhum aviso. Esta versão pode ser publicada.",
};

/** Texto exibido quando uma versão antiga não possui o dado. */
export const NOT_INFORMED = "Não informado";

export const IMMUTABLE_PUBLICATION_MESSAGE =
  "Após a publicação, esta versão não poderá ser editada. Alterações futuras deverão ser realizadas em uma nova versão.";
