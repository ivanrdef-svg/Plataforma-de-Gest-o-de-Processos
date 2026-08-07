import { Layers, Users, LogIn, LogOut, FileText, BookOpen, ListChecks } from "lucide-react";
import { PROCESS_DEMO_ORIGIN } from "@/config/process-structure";
import type { ProcessDoc } from "@/lib/process-store";
import { cn } from "@/lib/utils";

/**
 * Build 007 — Painel esquerdo do BPM Designer.
 *
 * Reforça a filosofia do produto: tudo que aparece aqui vem do Processo.
 * Nenhum dado é inventado no diagrama.
 */

function splitList(value: string) {
  return value
    .split(/[,;\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function Group({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: typeof Layers;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <header className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {count !== undefined && (
          <span className="ml-auto rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </header>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <p className="truncate rounded-md border bg-background px-2 py-1.5 text-[11px] text-muted-foreground">
      {children}
    </p>
  );
}

export function BpmSourcePanel({
  doc,
  selectedStepId,
  onSelectStep,
}: {
  doc: ProcessDoc;
  selectedStepId?: string | undefined;
  onSelectStep: (stepId: string) => void;
}) {
  const participants = Array.from(
    new Set(doc.steps.map((s) => s.owner).filter(Boolean)),
  );
  const inputs = Array.from(new Set(doc.steps.flatMap((s) => splitList(s.inputs))));
  const outputs = Array.from(new Set(doc.steps.flatMap((s) => splitList(s.outputs))));
  const knowledge =
    PROCESS_DEMO_ORIGIN.find((g) => g.type === "Knowledge Package")?.items ?? [];
  const pops = PROCESS_DEMO_ORIGIN.find((g) => g.type === "POP")?.items ?? [];
  const docs = PROCESS_DEMO_ORIGIN.find((g) => g.type === "Checklist")?.items ?? [];

  return (
    <div className="space-y-5">
      <p className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        O diagrama é derivado deste Processo. Refine o desenho sem perder a
        origem da informação.
      </p>

      <Group icon={Layers} title="Etapas do Processo" count={doc.steps.length}>
        {doc.steps.map((step, i) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onSelectStep(step.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] transition-colors",
              selectedStepId === step.id
                ? "border-primary/50 bg-primary/5 text-foreground"
                : "bg-background text-muted-foreground hover:border-border-strong hover:text-foreground",
            )}
          >
            <span className="tabular-nums text-[10px] text-muted-foreground/70">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="truncate">{step.name || "Etapa sem nome"}</span>
          </button>
        ))}
        {!doc.steps.length && (
          <Chip>Nenhuma etapa cadastrada na aba Etapas.</Chip>
        )}
      </Group>

      <Group icon={Users} title="Participantes" count={participants.length}>
        {participants.length ? (
          participants.map((p) => <Chip key={p}>{p}</Chip>)
        ) : (
          <Chip>Defina responsáveis nas etapas.</Chip>
        )}
      </Group>

      <Group icon={LogIn} title="Entradas" count={inputs.length}>
        {inputs.length ? inputs.map((v) => <Chip key={v}>{v}</Chip>) : <Chip>—</Chip>}
      </Group>

      <Group icon={LogOut} title="Saídas" count={outputs.length}>
        {outputs.length ? outputs.map((v) => <Chip key={v}>{v}</Chip>) : <Chip>—</Chip>}
      </Group>

      <Group icon={FileText} title="Documentos" count={docs.length}>
        {docs.map((d) => (
          <Chip key={d.name}>{d.name}</Chip>
        ))}
      </Group>

      <Group icon={BookOpen} title="Knowledge relacionado" count={knowledge.length}>
        {knowledge.map((k) => (
          <Chip key={k.name}>{k.name}</Chip>
        ))}
      </Group>

      <Group icon={ListChecks} title="POP relacionado" count={pops.length}>
        {pops.map((p) => (
          <Chip key={p.name}>{p.name}</Chip>
        ))}
      </Group>
    </div>
  );
}
