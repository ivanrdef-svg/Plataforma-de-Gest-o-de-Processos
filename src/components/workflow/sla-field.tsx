import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIME_UNITS, type TimeUnit } from "@/config/sla-model";

/**
 * Build 014 — campo de prazo reutilizável (quantidade + unidade).
 * Usado tanto na definição do workflow quanto no editor de etapas.
 */
export function SlaField({
  label,
  hint,
  amount,
  unit,
  placeholder = "Sem prazo",
  onChange,
}: {
  label: string;
  hint?: string;
  amount: number | undefined;
  unit: TimeUnit | undefined;
  placeholder?: string;
  onChange: (amount: number | undefined, unit: TimeUnit) => void;
}) {
  const current = unit ?? "horas";
  return (
    <div className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="mt-1 grid grid-cols-[1fr_110px] gap-2">
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          value={amount ?? ""}
          placeholder={placeholder}
          onChange={(e) => {
            const raw = e.target.value.trim();
            onChange(raw === "" ? undefined : Number(raw), current);
          }}
          className="h-8 text-xs"
        />
        <Select value={current} onValueChange={(v) => onChange(amount, v as TimeUnit)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_UNITS.map((u) => (
              <SelectItem key={u} value={u} className="text-xs">
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
