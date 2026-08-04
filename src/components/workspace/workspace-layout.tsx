import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/**
 * Estrutura padrão de Workspace da plataforma.
 *
 * Todo objeto importante (conhecimento, processo, POP, BPMN, workflow...)
 * é aberto dentro deste layout. Nunca crie páginas novas quando um painel
 * lateral puder resolver — use `sidePanel`.
 *
 * Contrato estável: Sprints futuras apenas adicionam props opcionais.
 */

export interface WorkspaceTab {
  id: string;
  label: string;
  content: ReactNode;
}

export interface WorkspaceLayoutProps {
  title: string;
  subtitle?: string;
  /** Barra de contexto: breadcrumbs, status, metadados do objeto aberto. */
  contextBar?: ReactNode;
  /** Ações do header (botões discretos). */
  actions?: ReactNode;
  tabs?: WorkspaceTab[];
  defaultTab?: string;
  /** Conteúdo principal quando não há abas. */
  children?: ReactNode;
  /** Painel lateral contextual (propriedades, relacionamentos, histórico, IA). */
  sidePanel?: ReactNode;
  /** Rodapé de status do workspace. */
  statusBar?: ReactNode;
  className?: string;
}

export function WorkspaceLayout({
  title,
  subtitle,
  contextBar,
  actions,
  tabs,
  defaultTab,
  children,
  sidePanel,
  statusBar,
  className,
}: WorkspaceLayoutProps) {
  return (
    <div className={cn("flex min-h-[calc(100vh-3.5rem)] flex-col", className)}>
      <div className="border-b bg-background/60">
        <div className="flex items-start justify-between gap-4 px-6 pt-6 md:px-10">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {contextBar && (
          <div className="flex flex-wrap items-center gap-2 px-6 pt-4 text-xs text-muted-foreground md:px-10">
            {contextBar}
          </div>
        )}
        <div className="h-4" />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 px-6 py-8 md:px-10">
          {tabs && tabs.length > 0 ? (
            <Tabs defaultValue={defaultTab ?? tabs[0]!.id} className="w-full">
              <TabsList className="mb-6">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id}>
                  {tab.content}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            children
          )}
        </div>

        {sidePanel && (
          <aside className="hidden w-80 shrink-0 border-l bg-surface/50 px-5 py-8 lg:block">
            {sidePanel}
          </aside>
        )}
      </div>

      {statusBar && (
        <div className="border-t bg-surface/60 px-6 py-2 text-xs text-muted-foreground md:px-10">
          {statusBar}
        </div>
      )}
    </div>
  );
}
