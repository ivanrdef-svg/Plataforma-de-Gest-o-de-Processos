/**
 * Build 019 — metadados visuais dos Workflow Templates.
 *
 * Apenas rótulos e tons reaproveitando o design system existente (`Pill`).
 * Nenhum componente visual novo é introduzido aqui.
 */

import type { TemplateStatus } from "@/lib/template-store";

export const TEMPLATE_STATUS_LABEL: Record<TemplateStatus, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  arquivado: "Arquivado",
};

export const TEMPLATE_STATUS_TONE: Record<TemplateStatus, string> = {
  rascunho: "bg-muted text-muted-foreground",
  ativo: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  arquivado: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

/** Texto do estado de uso — nunca comunicar status apenas por cor. */
export const TEMPLATE_USE_LABEL: Record<TemplateStatus, string> = {
  rascunho: "Em edição",
  ativo: "Usar Template",
  arquivado: "Arquivado",
};
