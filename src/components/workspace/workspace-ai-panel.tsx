import {
  FileUp,
  GitBranch,
  Copy,
  Scale,
  Search,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Painel lateral direito do Workspace — reservado para o futuro AI Copilot.
 * Build 2.5: painel de sugestões (apenas visual, sem IA real).
 */

interface Suggestion {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}

const SUGGESTIONS: Suggestion[] = [
  { id: "pop", label: "Criar novo POP", hint: "A partir deste conteúdo", icon: Workflow },
  { id: "import", label: "Importar documento", hint: "PDF, Word ou Markdown", icon: FileUp },
  { id: "legis", label: "Relacionar legislação", hint: "Normas e obrigações", icon: Scale },
  { id: "dup", label: "Encontrar conteúdos duplicados", hint: "Curadoria da base", icon: Copy },
  { id: "proc", label: "Gerar processo", hint: "Do conhecimento ao fluxo", icon: GitBranch },
  { id: "search", label: "Pesquisar conhecimento relacionado", hint: "Contexto do objeto", icon: Search },
];

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

      <div className="space-y-1.5">
        <p className="px-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          Sugestões
        </p>
        {SUGGESTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() =>
                toast(s.label, { description: "Disponível quando o AI Copilot chegar." })
              }
              className="group flex w-full items-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left transition-all duration-200 hover:border-border hover:bg-card"
            >
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium">{s.label}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {s.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto rounded-xl border border-dashed bg-card/50 px-4 py-4 text-center">
        <p className="text-xs font-medium">Tudo pronto para receber o AI Copilot.</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          As sugestões acima são exemplos visuais desta build.
        </p>
      </div>
    </div>
  );
}
