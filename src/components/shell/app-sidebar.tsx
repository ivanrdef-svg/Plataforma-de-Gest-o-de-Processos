import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Home, LayoutGrid, Search, Settings2, Star } from "lucide-react";
import { MODULE_GROUPS, PLATFORM_MODULES, type ModuleGroup } from "@/config/modules";
import { cn } from "@/lib/utils";
import { useGlobalSearch } from "@/components/search/global-search-context";

const GROUP_ORDER: ModuleGroup[] = ["core", "execucao", "inteligencia", "governanca"];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { open: openSearch } = useGlobalSearch();

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="px-3 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-[13px] font-semibold text-primary-foreground">
            P
          </span>
          {!collapsed && (
            <span className="truncate text-sm font-semibold tracking-tight">
              Process Platform
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/")} tooltip="Início">
                  <Link to="/" className="flex items-center gap-2.5">
                    <Home className="h-4 w-4" />
                    {!collapsed && <span>Início</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={openSearch} tooltip="Pesquisa global">
                  <Search className="h-4 w-4" />
                  {!collapsed && <span>Pesquisar</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/workspaces")}
                  tooltip="Workspaces"
                >
                  <Link to="/workspaces" className="flex items-center gap-2.5">
                    <LayoutGrid className="h-4 w-4" />
                    {!collapsed && <span>Workspaces</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/favoritos")}
                  tooltip="Favoritos"
                >
                  <Link to="/favoritos" className="flex items-center gap-2.5">
                    <Star className="h-4 w-4" />
                    {!collapsed && <span>Favoritos</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/administracao")}
                  tooltip="Administração"
                >
                  <Link to="/administracao" className="flex items-center gap-2.5">
                    <Settings2 className="h-4 w-4" />
                    {!collapsed && <span>Administração</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {GROUP_ORDER.map((group) => (
          <SidebarGroup key={group}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[11px] uppercase tracking-wider">
                {MODULE_GROUPS[group].label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {PLATFORM_MODULES.filter(
                  (m) => m.group === group && m.id !== "workspaces",
                ).map((module) => {
                  const Icon = module.icon;
                  const content = (
                    <>
                      <Icon className="h-4 w-4" />
                      {!collapsed && <span className="truncate">{module.name}</span>}
                    </>
                  );
                  return (
                    <SidebarMenuItem key={module.id}>
                      {module.route && module.status === "available" ? (
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(module.route)}
                          tooltip={module.name}
                        >
                          <Link to={module.route} className="flex items-center gap-2.5">
                            {content}
                          </Link>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton
                          tooltip={`${module.name} — em breve`}
                          className={cn("cursor-default text-muted-foreground")}
                        >
                          {content}
                          {!collapsed && (
                            <span className="ml-auto text-[10px] text-muted-foreground/70">
                              em breve
                            </span>
                          )}
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-3 py-3">
        {!collapsed && (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Plataforma de Engenharia de Processos
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
