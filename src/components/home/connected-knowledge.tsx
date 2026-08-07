import { Link } from "@tanstack/react-router";
import { Network, Zap, Clock } from "lucide-react";
import { SectionHeader } from "@/components/layout/page";
import {
  ObjectTypeIcon,
} from "@/components/relationships/relationship-badges";
import { useRelationships, summarize } from "@/lib/relationship-store";
import type { RelatedObjectType } from "@/config/relationship-model";

/**
 * Build 005 — widget discreto "Conhecimento Conectado" na Home.
 * Dados simulados: objetos mais relacionados, recentemente conectados
 * e de maior impacto.
 */

interface ConnectedItem {
  id: string;
  name: string;
  type: RelatedObjectType;
  to: "knowledge" | "workspace";
  targetId: string;
}

const TRACKED: ConnectedItem[] = [
  {
    id: "conhecimento-fiscal",
    name: "Conhecimento Fiscal",
    type: "Knowledge Package",
    to: "knowledge",
    targetId: "conhecimento-fiscal",
  },
  {
    id: "onboarding-clientes",
    name: "Onboarding de Clientes",
    type: "Processo",
    to: "workspace",
    targetId: "onboarding-clientes",
  },
  {
    id: "seguranca-informacao",
    name: "Segurança da Informação",
    type: "Knowledge Package",
    to: "knowledge",
    targetId: "seguranca-informacao",
  },
  {
    id: "gestao-fornecedores",
    name: "Gestão de Fornecedores",
    type: "Processo",
    to: "workspace",
    targetId: "gestao-fornecedores",
  },
];

const RECENTLY_CONNECTED = [
  { name: "POP-014 Abertura de Conta", detail: "vinculado à Política de Crédito", when: "há 2 horas" },
  { name: "Checklist de Conformidade", detail: "vinculado ao Controle C-07", when: "ontem" },
  { name: "BPMN Onboarding v2", detail: "vinculado ao processo Onboarding", when: "há 2 dias" },
];

function ConnectedRow({ item }: { item: ConnectedItem }) {
  const items = useRelationships(item.id);
  const stats = summarize(items);

  const content = (
    <>
      <ObjectTypeIcon type={item.type} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{item.name}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {stats.total} conexões · {stats.dependencias}{" "}
          {stats.dependencias === 1 ? "dependência" : "dependências"}
        </span>
      </span>
      <span className="shrink-0 text-[11px] text-muted-foreground/80">
        {stats.impactos > 0 ? `${stats.impactos} impactos` : "—"}
      </span>
    </>
  );

  return item.to === "knowledge" ? (
    <Link
      to="/knowledge/$packageId"
      params={{ packageId: item.targetId }}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
    >
      {content}
    </Link>
  ) : (
    <Link
      to="/workspaces/$workspaceId"
      params={{ workspaceId: item.targetId }}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
    >
      {content}
    </Link>
  );
}

export function ConnectedKnowledge() {
  return (
    <section>
      <SectionHeader
        title="Conhecimento conectado"
        description="Nenhum objeto existe isolado — veja a rede da sua operação."
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border bg-card">
          <p className="flex items-center gap-1.5 border-b px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Network className="h-3.5 w-3.5" /> Objetos mais relacionados
          </p>
          <div className="divide-y">
            {TRACKED.map((item) => (
              <ConnectedRow key={item.id} item={item} />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border bg-card">
            <p className="flex items-center gap-1.5 border-b px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Recentemente conectados
            </p>
            <div className="divide-y">
              {RECENTLY_CONNECTED.map((item) => (
                <div key={item.name} className="px-4 py-2.5">
                  <p className="truncate text-sm">{item.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.detail} · {item.when}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card">
            <p className="flex items-center gap-1.5 border-b px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Zap className="h-3.5 w-3.5" /> Maior impacto
            </p>
            <div className="divide-y">
              {[
                { name: "Política de Segurança da Informação", detail: "impacta 9 objetos" },
                { name: "Risco R-118 — Vazamento de Dados", detail: "impacta 6 objetos" },
              ].map((item) => (
                <div key={item.name} className="px-4 py-2.5">
                  <p className="truncate text-sm">{item.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
