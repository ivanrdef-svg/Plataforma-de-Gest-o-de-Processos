import { Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readinessScore } from "./process-consistency-panel";
import type { ProcessDoc } from "@/lib/process-store";

/**
 * Build 007 — preparação para o BPM.
 * O modelo organizacional já possui estrutura suficiente para a geração
 * automática do primeiro diagrama; a geração chega na próxima Build.
 */
export function BpmReadinessBanner({ doc }: { doc: ProcessDoc }) {
  const { score, blocking } = readinessScore(doc);
  const rules = doc.rules?.length ?? 0;
  const participants = doc.participants?.length ?? 0;

  return (
    <div className="rounded-xl border bg-gradient-to-br from-primary/5 to-transparent px-5 py-4">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium">
            Este processo já possui estrutura suficiente para gerar
            automaticamente seu primeiro modelo BPM
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {doc.steps.length} etapas tipificadas · {rules} regras de negócio ·{" "}
            {participants} participantes · prontidão de {score}%
            {blocking > 0 &&
              ` · ${blocking} ponto${blocking === 1 ? "" : "s"} a resolver na Consistência do Processo`}
            .
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button size="sm" disabled className="gap-1.5">
            <Wand2 className="h-3.5 w-3.5" />
            Gerar BPM
          </Button>
          <span className="text-[11px] text-muted-foreground">
            Disponível na próxima Build.
          </span>
        </div>
      </div>
    </div>
  );
}
