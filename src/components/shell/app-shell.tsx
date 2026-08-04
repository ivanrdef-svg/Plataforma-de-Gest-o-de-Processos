import type { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { GlobalSearch } from "@/components/search/global-search";
import {
  GlobalSearchProvider,
  useGlobalSearch,
} from "@/components/search/global-search-context";
import { Button } from "@/components/ui/button";
import { Search, Sparkles } from "lucide-react";

function TopBar() {
  const { open } = useGlobalSearch();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-3 backdrop-blur-md">
      <SidebarTrigger className="shrink-0" />
      <button
        type="button"
        onClick={open}
        className="group flex h-9 max-w-md flex-1 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Pesquisar na plataforma</span>
        <kbd className="ml-auto hidden shrink-0 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Assistente</span>
        </Button>
      </div>
    </header>
  );
}

/**
 * Shell principal da aplicação: navegação lateral, barra superior e pesquisa
 * global. Todos os módulos futuros são renderizados dentro do <main>.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <GlobalSearchProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="flex-1">{children}</main>
          </div>
        </div>
        <GlobalSearch />
      </SidebarProvider>
    </GlobalSearchProvider>
  );
}
