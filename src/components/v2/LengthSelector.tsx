// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Range list and representative-length choice after a search.

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import NumericInput from "@/components/NumericInput";
import { useUnits } from "@/contexts/UnitContext";
import { GeneralRange } from "@/lib/mechanics-v2";
import { lengthOptions, SearchView, validCustomLength } from "@/lib/v2-app/selection";

export interface Selection { rangeIndex: number; optionId: string; customL: number | null } // customL in mm

interface Props {
  view: SearchView;
  selection: Selection | null;
  onChange: (s: Selection) => void;
}

export const useFmtLength = () => {
  const { conv, label } = useUnits();
  return (mm: number) => `${conv(mm / 1000, "m").toFixed(3)} ${label("m")}`;
};

export const rangeText = (r: GeneralRange, fmt: (mm: number) => string) => {
  const lo = r.lower.kind === "finite" ? `${r.lower.included ? "[" : "("}${fmt(r.lower.value!)}` : "(0";
  const hi = r.upper.kind === "finite" ? `${fmt(r.upper.value!)}${r.upper.included ? "]" : ")"}` : "∞)";
  return `${lo} ; ${hi}`;
};

const LengthSelector = ({ view, selection, onChange }: Props) => {
  const fmt = useFmtLength();
  const { conv, parse, label } = useUnits();
  const [custom, setCustom] = useState<number>(selection?.customL ?? 30000);
  useEffect(() => { if (selection?.customL) setCustom(selection.customL); }, [selection?.customL]);
  if (!view.ranges.length) return null;
  const k = selection?.rangeIndex ?? 0;
  const opts = lengthOptions(view.ranges[k], view.infimum);
  const customOk = validCustomLength(custom);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5" role="radiogroup" aria-label="Admissible length ranges">
        <Label className="text-xs">Admissible ranges (select one)</Label>
        {view.ranges.map((r, i) => (
          <button key={i} type="button" role="radio" aria-checked={i === k}
            onClick={() => { const o = lengthOptions(r, view.infimum)[0]; onChange({ rangeIndex: i, optionId: o?.id ?? "custom", customL: selection?.customL ?? null }); }}
            className={`w-full text-left rounded-md border px-3 py-2 text-xs font-mono ${i === k ? "border-primary bg-primary/10" : "border-border"}`}>
            Range {i + 1}: {rangeText(r, fmt)}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Represented length</Label>
        <div className="flex flex-wrap gap-2">
          {opts.map((o) => (
            <Button key={o.id} size="sm" variant={selection?.optionId === o.id ? "default" : "outline"}
              className="h-7 text-[11px]" onClick={() => onChange({ rangeIndex: k, optionId: o.id, customL: selection?.customL ?? null })}>
              {o.label}: {fmt(o.L)}
            </Button>
          ))}
        </div>
        {!opts.length && <p className="text-[11px] text-muted-foreground">This range has no finite bound or attained minimum: enter a custom length.</p>}
        <div className="flex items-end gap-2">
          <div className="w-40">
            <Label className="text-[11px]">Custom L ({label("m")})</Label>
            <NumericInput value={conv(custom / 1000, "m")} onValueChange={(v) => setCustom(parse(v, "m") * 1000)} className="h-8 text-sm" decimals={3} />
          </div>
          <Button size="sm" variant={selection?.optionId === "custom" ? "default" : "outline"} className="h-8 text-[11px]"
            disabled={!customOk} onClick={() => onChange({ rangeIndex: k, optionId: "custom", customL: custom })}>
            Use custom length
          </Button>
        </div>
        {!customOk && <p className="text-[11px] text-destructive">Custom length must be finite and strictly positive.</p>}
      </div>
    </div>
  );
};

export default LengthSelector;
