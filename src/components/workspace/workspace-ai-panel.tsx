import { Sparkles } from "lucide-react";

/**
 * Painel lateral direito do Workspace — reservado para o futuro AI Copilot.
 * Sprint 001: apenas placeholder visual.
 */
export function WorkspaceAiPanel() {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-sm font-medium">Assistente</p>
          <p className="text-[11px] text-muted-foreground">Contexto do objeto aberto</p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed bg-card/50 px-4 py-8 text-center">
        <p className="text-sm font-medium">Tudo pronto para receber o AI Copilot.</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Este painel acompanhará o objeto aberto e trará sugestões, análises e
          geração de conteúdo em sprints futuras.
        </p>
      </div>
    </div>
  );
}
