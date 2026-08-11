import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WORKFLOW_STATUS_OPTIONS } from "@/config/workflow-model";
import type { WorkflowStatus } from "@/config/workflow-model";
import type { WorkflowDoc } from "@/lib/workflow-store";

/** Build 011 — propriedades da definição de workflow (painel lateral). */
export function WorkflowMetadataPanel({
  doc,
  onChange,
}: {
  doc: WorkflowDoc;
  onChange: (patch: Partial<WorkflowDoc>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Propriedades
      </p>

      <Row label="Nome">
        <Input
          value={doc.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="h-8 text-xs"
        />
      </Row>

      <Row label="Status">
        <Select
          value={doc.status}
          onValueChange={(v) => onChange({ status: v as WorkflowStatus })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORKFLOW_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>

      <Row label="Responsável">
        <Input
          value={doc.owner}
          onChange={(e) => onChange({ owner: e.target.value })}
          className="h-8 text-xs"
        />
      </Row>

      <Row label="Área">
        <Input
          value={doc.area}
          onChange={(e) => onChange({ area: e.target.value })}
          className="h-8 text-xs"
        />
      </Row>

      <Row label="Versão">
        <Input
          value={doc.version}
          onChange={(e) => onChange({ version: e.target.value })}
          className="h-8 text-xs"
        />
      </Row>

      <Row label="Descrição">
        <Textarea
          value={doc.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className="min-h-[70px] resize-none text-xs"
        />
      </Row>

      <div className="rounded-lg border bg-surface/40 px-3 py-2 text-[11px] text-muted-foreground">
        Processo de origem: <span className="text-foreground">{doc.processName}</span>
        <br />
        Criado em {doc.createdAt} · revisado em {doc.revisedAt}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
