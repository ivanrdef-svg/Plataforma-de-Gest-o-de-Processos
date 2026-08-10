import { useMemo } from "react";
import { useKnowledgeDocs } from "@/lib/knowledge-store";
import { usePopDocs } from "@/lib/pop-store";
import { useProcessDocs } from "@/lib/process-store";
import { getLifecycle, useLifecycleEntries, type LifecycleSeed } from "@/lib/lifecycle-store";
import {
  getGovernance,
  governanceHealth,
  type GovernanceHealth,
  type GovernanceRecord,
  type GovernanceSeed,
} from "@/lib/governance-store";
import type { LifecycleStateId } from "@/config/lifecycle-model";

/**
 * Build 010 — agregação dos ativos governados.
 *
 * Reutiliza os stores existentes (Knowledge, POP, Processo) e o Lifecycle
 * Engine. Nenhuma fonte de dados nova é criada.
 */

export interface GovernedAsset {
  seed: GovernanceSeed;
  lifecycleSeed: LifecycleSeed;
  record: GovernanceRecord;
  health: GovernanceHealth;
  state: LifecycleStateId;
  typeLabel: string;
}

const TYPE_LABEL: Record<string, string> = {
  knowledge: "Knowledge Package",
  pop: "POP",
  processo: "Processo",
};

export function useGovernedAssets(): GovernedAsset[] {
  useLifecycleEntries();
  const knowledge = useKnowledgeDocs();
  const pops = usePopDocs();
  const processes = useProcessDocs();

  return useMemo(() => {
    const seeds: GovernanceSeed[] = [
      ...knowledge.map((doc) => ({
        objectId: doc.id,
        kind: "knowledge" as const,
        name: doc.name,
        owner: doc.owner,
        status: doc.status,
        updatedAt: doc.updatedAt,
      })),
      ...pops.map((doc) => ({
        objectId: doc.id,
        kind: "pop" as const,
        name: doc.name,
        owner: doc.owner,
        status: doc.status,
        updatedAt: doc.savedAt || doc.revisedAt,
      })),
      ...processes.map((doc) => ({
        objectId: doc.id,
        kind: "processo" as const,
        name: doc.name,
        owner: doc.owner,
        status: doc.status,
        updatedAt: doc.savedAt || doc.revisedAt,
      })),
    ];

    return seeds.map((seed) => {
      const record = getGovernance(seed);
      return {
        seed,
        lifecycleSeed: seed as LifecycleSeed,
        record,
        health: governanceHealth(record),
        state: getLifecycle(seed).state,
        typeLabel: TYPE_LABEL[seed.kind] ?? "Ativo",
      };
    });
  }, [knowledge, pops, processes]);
}
