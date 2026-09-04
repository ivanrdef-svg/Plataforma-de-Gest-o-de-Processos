/**
 * Build 026 — Etapa 4.1: tradução das falhas do domínio para linguagem humana.
 * A UI nunca exibe o código cru como única mensagem.
 */

import type { PopDraftReviewFailure } from "@/lib/pop-draft-proposal-store";

export function popDraftFailureMessage(reason: PopDraftReviewFailure): string {
  switch (reason) {
    case "nao-encontrada":
      return "Proposta não encontrada.";
    case "status-invalido":
      return "Não foi possível continuar — a proposta não está mais em revisão.";
    case "revisao-nao-iniciada":
      return "Inicie a revisão antes de continuar.";
    case "secao-nao-encontrada":
      return "Seção não encontrada nesta revisão.";
    case "ordenacao-invalida":
      return "Ordenação inválida das seções.";
    case "ja-confirmada":
      return "Esta proposta já foi confirmada.";
    case "falha-na-materializacao":
      return "Não foi possível criar o POP. Tente novamente.";
    default:
      return "Não foi possível concluir a ação.";
  }
}
