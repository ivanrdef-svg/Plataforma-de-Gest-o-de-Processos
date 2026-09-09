/**
 * Build 027.1 — seleção mínima de Processo para vincular a um POP.
 *
 * Sem biblioteca nova: Dialog + Input de busca + lista filtrada em memória
 * sobre `useProcessDocs()`. Nenhuma regra de domínio aqui — o componente só
 * orquestra `linkPopToProcess`.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";
import { useProcessDocs } from "@/lib/process-store";
import { linkPopToProcess } from "@/lib/pop-store";

export function LinkPopProcessDialog({
  popId,
  currentProcessId,
  open,
  onOpenChange,
}: {
  popId: string;
  currentProcessId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const processes = useProcessDocs();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(currentProcessId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedId(currentProcessId);
      setSaving(false);
    }
  }, [open, currentProcessId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return processes;
    return processes.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
    );
  }, [processes, query]);

  const onConfirm = () => {
    if (!selectedId) return;
    setSaving(true);
    const updated = linkPopToProcess(popId, selectedId);
    setSaving(false);
    if (!updated) {
      toast.error("Não foi possível vincular: o processo selecionado não foi encontrado.");
      return;
    }
    toast.success("Processo vinculado ao POP.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular processo</DialogTitle>
          <DialogDescription>
            Selecione o processo ao qual este POP pertence.
          </DialogDescription>
        </DialogHeader>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou código"
          className="h-9 text-sm"
        />

        <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">
              {processes.length === 0
                ? "Nenhum processo cadastrado ainda."
                : "Nenhum processo corresponde à busca."}
            </p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                  selectedId === p.id
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-muted/60",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground">{p.name}</span>
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    {p.code}
                  </span>
                </span>
                <Pill size="sm">{p.status}</Pill>
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={!selectedId || saving}>
            {saving ? "Vinculando…" : "Vincular"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
