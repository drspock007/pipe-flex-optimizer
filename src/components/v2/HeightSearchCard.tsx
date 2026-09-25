// créé par Giovanni Malagnino, 2026-09-25 17:40 CEST (Europe/Rome, UTC+2)
// Find h: search status, admissible hv ranges and represented hv choice.

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowUpDown } from "lucide-react";
import NumericInput from "@/components/NumericInput";
import { useUnits } from "@/contexts/UnitContext";
import { HeightRange } from "@/lib/mechanics-v2";
import { HeightSelection, heightOptions, heightRangeText } from "@/lib/v2-app/height-selection";
import { StatusText } from "@/lib/v2-app/status-text";
import { StatusBanner, Busy } from "./StatusBanner";

export const useFmtHeight = () => {
  const { conv, label } = useUnits();
  return (mm: number) => `${conv(mm, "mm").toFixed(2)} ${label("mm")}`;
};

interface Props {
  loading: boolean; refreshing: boolean; error: string | null; status: StatusText | null;
  ranges: HeightRange[]; selection: HeightSelection | null; selectedH: number | null;
  onChange: (s: HeightSelection) => void;
}

const HeightSearchCard = ({ loading, refreshing, error, status, ranges, selection, selectedH, onChange }: Props) => {
  const fmt = useFmtHeight();
  const { conv, parse, label } = useUnits();
  const [custom, setCustom] = useState<number>(selection?.customH ?? 0);
  useEffect(() => { if (selection?.customH !== null && selection?.customH !== undefined) setCustom(selection.customH); }, [selection?.customH]);
  const k = selection?.rangeIndex ?? 0;
  const opts = ranges[k] ? heightOptions(ranges[k]) : [];
  const customOk = Number.isFinite(custom);

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ArrowUpDown className="h-4 w-4 text-primary" /> Height search (hv, up +)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {loading && <Busy label={refreshing ? "Updating search — the content below belongs to the previous inputs" : "Searching admissible hv…"} />}
        {error && <StatusBanner s={{ tone: "error", title: "Search failed", detail: error }} />}
        {status && <StatusBanner s={status} />}
        {selectedH !== null && (
          <p className="text-xs">Represented hv: <strong className="font-mono">{fmt(selectedH)}</strong>
            <span className="text-muted-foreground"> — initially the upper bound of the range with the largest admissible hv. L, hl and supports are fixed; the entered hv is not used.</span></p>
        )}
        {ranges.length > 0 && (
          <div className="space-y-3">
            <div className="space-y-1.5" role="radiogroup" aria-label="Admissible hv ranges">
              <Label className="text-xs">Admissible hv ranges (select one)</Label>
              {ranges.map((r, i) => (
                <button key={i} type="button" role="radio" aria-checked={i === k}
                  onClick={() => onChange({ rangeIndex: i, optionId: heightOptions(r)[0].id, customH: selection?.customH ?? null })}
                  className={`w-full text-left rounded-md border px-3 py-2 text-xs font-mono ${i === k ? "border-primary bg-primary/10" : "border-border"}`}>
                  Range {i + 1}: {heightRangeText(r, fmt)}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Represented hv</Label>
              <div className="flex flex-wrap gap-2">
                {opts.map((o) => (
                  <Button key={o.id} size="sm" variant={selection?.optionId === o.id ? "default" : "outline"} className="h-7 text-[11px]"
                    onClick={() => onChange({ rangeIndex: k, optionId: o.id, customH: selection?.customH ?? null })}>
                    {o.label}: {fmt(o.hv)}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-40">
                  <Label className="text-[11px]">Custom hv, signed ({label("mm")})</Label>
                  <NumericInput value={conv(custom, "mm")} onValueChange={(v) => setCustom(parse(v, "mm"))} className="h-8 text-sm" decimals={2} />
                </div>
                <Button size="sm" variant={selection?.optionId === "custom" ? "default" : "outline"} className="h-8 text-[11px]"
                  disabled={!customOk} onClick={() => onChange({ rangeIndex: k, optionId: "custom", customH: custom })}>
                  Use custom hv
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">A custom hv may lie outside the ranges: the criterion is then reported as not met.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HeightSearchCard;
