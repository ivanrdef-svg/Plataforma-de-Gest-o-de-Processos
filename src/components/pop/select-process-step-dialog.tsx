/**
 * Build 029 — Etapa 3: seleção de uma Etapa do Processo já vinculado ao POP.
 *
 * Mesmo padrão do seletor de Processo do Build 027.1 (Dialog + Input de busca +
 * lista filtrada em memória). Componente puramente de apresentação: quem chama
 * decide qual mutador executar com o `stepId` selecionado.
 */
import { useEffect, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import type { ProcessStep } from "@/lib/process-store";

export function SelectProcessStepDialog({
  steps,
  currentStepId,
  title,
  description,
  confirmLabel,
  open,
  onOpenChange,
  onConfirm,
}: {
  steps: ProcessStep[];
  currentStepId?: string | undefined;
  title: string;
  description: string;
  confirmLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (stepId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(currentStepId);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedId(currentStepId);
    }
  }, [open, currentStepId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return steps;
    return steps.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q),
    );
  }, [steps, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar etapa por nome ou descrição"
          className="h-9 text-sm"
        />

        <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">
              {steps.length === 0
                ? "Este Processo ainda não possui etapas."
                : "Nenhuma etapa corresponde à busca."}
            </p>
          ) : (
            filtered.map((step) => {
              const position = steps.findIndex((s) => s.id === step.id) + 1;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setSelectedId(step.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors",
                    selectedId === step.id
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:bg-muted/60",
                  )}
                >
                  <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {String(position).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-foreground">{step.name}</span>
                    {step.description ? (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {step.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!selectedId}
            onClick={() => {
              if (selectedId) onConfirm(selectedId);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
