/**
 * Build 021 — validação própria do BPMN.
 *
 * Domínio independente do `workflow-validation.ts`: aqui não existem os
 * conceitos de publicação/execução do Workflow. O objetivo é dar feedback
 * sobre o desenho, sabendo que um diagrama em construção é normal — por isso
 * a maioria das situações incompletas é "atenção", e "erro" fica reservado a
 * grafo quebrado ou referência inválida.
 *
 * Função pura: não usa React, store ou canvas, e não muta os argumentos.
 */

import type { BpmDiagram, BpmIssue, BpmNode } from "@/config/bpm-model";
import type { ProcessDefinition } from "@/lib/process-store";

export type BpmValidationStatus = "válido" | "válido com avisos" | "inválido";

export interface BpmValidation {
  status: BpmValidationStatus;
  errors: BpmIssue[];
  warnings: BpmIssue[];
  infos: string[];
  summary: string;
}

function label(node: BpmNode | undefined, fallback: string) {
  const name = node?.name?.trim();
  return name || fallback;
}

export function validateBpmn(diagram: BpmDiagram, doc: ProcessDefinition): BpmValidation {
  const issues: BpmIssue[] = [];
  const infos: string[] = [];

  const nodes = diagram.nodes ?? [];
  const edges = diagram.edges ?? [];

  // Índices montados uma única vez (evita buscas O(n²)).
  const nodeById = new Map<string, BpmNode>();
  const duplicatedIds = new Set<string>();
  nodes.forEach((n) => {
    if (nodeById.has(n.id)) duplicatedIds.add(n.id);
    else nodeById.set(n.id, n);
  });

  const stepById = new Map(doc.steps.map((s) => [s.id, s]));
  const stepIdsInDiagram = new Set<string>();

  /* ---------------------------------------------------------------
     Estrutura
     --------------------------------------------------------------- */

  // Erro: IDs duplicados corrompem seleção, edição e remoção. É defesa
  // contra estado inválido, nunca um passo intermediário legítimo.
  duplicatedIds.forEach((id) => {
    issues.push({
      id: `dup-node-${id}`,
      severity: "erro",
      message: `Existe mais de um elemento com o mesmo identificador (${id}).`,
      nodeId: id,
    });
  });

  const outgoing = new Map<string, number>();
  const incoming = new Map<string, number>();
  const edgeKeys = new Set<string>();

  edges.forEach((edge) => {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);

    // Erro: aresta apontando para nó inexistente é grafo quebrado de fato.
    if (!source || !target) {
      issues.push({
        id: `edge-orphan-${edge.id}`,
        severity: "erro",
        message: "Existe uma conexão ligada a um elemento que não existe mais.",
        edgeId: edge.id,
      });
      return;
    }

    // Erro: self-loop não representa nada no desenho e trava a leitura.
    if (edge.source === edge.target) {
      issues.push({
        id: `edge-self-${edge.id}`,
        severity: "erro",
        message: `"${label(source, "Elemento")}" está conectado a si mesmo.`,
        edgeId: edge.id,
      });
      return;
    }

    // Atenção: duplicada é redundante, mas o fluxo continua legível.
    const key = `${edge.source}>${edge.target}>${edge.kind}`;
    if (edgeKeys.has(key)) {
      issues.push({
        id: `edge-dup-${edge.id}`,
        severity: "atencao",
        message: `Conexão duplicada entre "${label(source, "origem")}" e "${label(target, "destino")}".`,
        edgeId: edge.id,
      });
    } else {
      edgeKeys.add(key);
    }

    outgoing.set(edge.source, (outgoing.get(edge.source) ?? 0) + 1);
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  });

  /* ---------------------------------------------------------------
     Conectividade
     --------------------------------------------------------------- */

  let startCount = 0;
  let endCount = 0;

  nodes.forEach((node) => {
    if (node.kind === "start") startCount += 1;
    if (node.kind === "end") endCount += 1;
    if (node.stepId) stepIdsInDiagram.add(node.stepId);

    const out = outgoing.get(node.id) ?? 0;
    const inc = incoming.get(node.id) ?? 0;

    // Atenção (e não erro): um elemento recém-criado fica isolado por
    // alguns segundos até o usuário conectá-lo. Tratar como erro puniria
    // o fluxo normal de edição.
    if (out === 0 && inc === 0) {
      issues.push({
        id: `isolated-${node.id}`,
        severity: "atencao",
        message: `"${label(node, "Elemento")}" ainda não está conectado ao fluxo.`,
        nodeId: node.id,
      });
      return;
    }

    if (node.kind === "task" || node.kind === "approval") {
      // Atenção: modelagem parcial é esperada durante a construção.
      if (inc === 0) {
        issues.push({
          id: `no-in-${node.id}`,
          severity: "atencao",
          message: `"${label(node, "Atividade")}" não possui entrada no fluxo.`,
          nodeId: node.id,
        });
      }
      if (out === 0) {
        issues.push({
          id: `no-out-${node.id}`,
          severity: "atencao",
          message: `"${label(node, "Atividade")}" não possui saída no fluxo.`,
          nodeId: node.id,
        });
      }
    }

    // Atenção: um gateway com uma saída só costuma ser desenho inacabado,
    // mas não impede a leitura do diagrama.
    if (node.kind === "gateway" && out < 2) {
      issues.push({
        id: `gateway-out-${node.id}`,
        severity: "atencao",
        message: `A decisão "${label(node, "Decisão")}" precisa de pelo menos duas saídas.`,
        nodeId: node.id,
      });
    }
  });

  // Atenção: ausência de início/fim é típica de rascunho.
  if (startCount === 0) {
    issues.push({
      id: "no-start",
      severity: "atencao",
      message: "O diagrama não possui um evento de início.",
    });
  }
  if (endCount === 0) {
    issues.push({
      id: "no-end",
      severity: "atencao",
      message: "O diagrama não possui um evento de fim.",
    });
  }
  // Atenção: múltiplos inícios raramente são intencionais.
  if (startCount > 1) {
    issues.push({
      id: "many-start",
      severity: "atencao",
      message: `O diagrama possui ${startCount} eventos de início.`,
    });
  }
  // Atenção (não erro): BPMN permite vários fins legitimamente; o aviso
  // existe só para o caso de duplicação por esquecimento.
  if (endCount > 1) {
    issues.push({
      id: "many-end",
      severity: "atencao",
      message: `O diagrama possui ${endCount} eventos de fim.`,
    });
  }

  /* ---------------------------------------------------------------
     Processo ↔ BPMN
     --------------------------------------------------------------- */

  nodes.forEach((node) => {
    if (!node.stepId) return;
    const step = stepById.get(node.stepId);

    // Erro: o nó aponta para uma etapa que não existe mais no Processo.
    if (!step) {
      issues.push({
        id: `step-missing-${node.id}`,
        severity: "erro",
        message: `"${label(node, "Elemento")}" referencia uma etapa que não existe mais no Processo.`,
        nodeId: node.id,
      });
      return;
    }

    // Atenção: divergência de nome é informativa; nada é corrigido sozinho.
    if (node.name.trim() !== step.name.trim()) {
      issues.push({
        id: `step-name-${node.id}`,
        severity: "atencao",
        message: `O nome "${label(node, "Elemento")}" difere da etapa do Processo ("${step.name.trim() || "sem nome"}").`,
        nodeId: node.id,
      });
    }
  });

  // Atenção: etapa ainda não desenhada — sincronização é aditiva e manual.
  doc.steps.forEach((step) => {
    if (stepIdsInDiagram.has(step.id)) return;
    issues.push({
      id: `step-not-drawn-${step.id}`,
      severity: "atencao",
      message: `A etapa "${step.name.trim() || "sem nome"}" do Processo ainda não está no diagrama.`,
    });
  });

  /* ---------------------------------------------------------------
     Consolidação
     --------------------------------------------------------------- */

  if (!nodes.length) {
    infos.push("O diagrama ainda está vazio.");
  }
  infos.push(`${nodes.length} elemento(s) e ${edges.length} conexão(ões).`);
  infos.push(`${stepIdsInDiagram.size} de ${doc.steps.length} etapa(s) do Processo representadas.`);

  const errors = issues.filter((i) => i.severity === "erro");
  const warnings = issues.filter((i) => i.severity === "atencao");

  const status: BpmValidationStatus = errors.length
    ? "inválido"
    : warnings.length
      ? "válido com avisos"
      : "válido";

  const summary = errors.length
    ? `${errors.length} erro(s) e ${warnings.length} aviso(s) no diagrama.`
    : warnings.length
      ? `${warnings.length} aviso(s) no diagrama.`
      : "Diagrama consistente.";

  return { status, errors, warnings, infos, summary };
}
