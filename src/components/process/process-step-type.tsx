import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  PROCESS_STEP_TYPES,
  getStepType,
  type ProcessStepTypeId,
} from "@/config/process-model";

/**
 * Build 007 — identidade visual dos tipos de etapa.
 * Reutilizado pela lista de etapas, pela timeline e pela leitura do modelo.
 */

export function StepTypeBadge({
  type,
  className,
  withLabel = true,
}: {
  type?: string;
  className?: string;
  withLabel?: boolean;
}) {
  const meta = getStepType(type);
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        meta.tone,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {withLabel && meta.label}
    </span>
  );
}

export function StepTypePicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (type: ProcessStepTypeId) => void;
}) {
  const meta = getStepType(value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Tipo da etapa: ${meta.label}`}
          className="transition-opacity hover:opacity-80"
        >
          <StepTypeBadge type={value} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Tipo da etapa
        </DropdownMenuLabel>
        {PROCESS_STEP_TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <DropdownMenuItem
              key={t.id}
              onSelect={() => onChange(t.id)}
              className="gap-2"
            >
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1">
                <span className="block text-xs font-medium">{t.label}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {t.hint}
                </span>
              </span>
              {t.id === meta.id && (
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
