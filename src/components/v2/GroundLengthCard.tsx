// créé par Giovanni Malagnino, 2026-09-26 04:30 CEST (Europe/Rome, UTC+2)
// Find L with ground (V2-7): search status, estimated ranges and represented L.

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import NumericInput from "@/components/NumericInput";
import { useUnits } from "@/contexts/UnitContext";
import { GroundLengthResult } from "@/lib/mechanics-v2";
import { GLSelection, glOptions, glRanges } from "@/lib/v2-app/ground-length-selection";
import { EDGE_TEXT, GROUND_LENGTH_LIMITS } from "@/lib/v2-app/ground-length-text";
import { StatusText } from "@/lib/v2-app/status-text";
import { StatusBanner, Busy } from "./StatusBanner";
import { useFmtLength } from "./LengthSelector";

interface Props {
  loading: boolean; refreshing: boolean; error: string | null; status: StatusText | null;
  result: GroundLengthResult | null; details: [string, string][];
  selection: GLSelection | null; selectedL: number | null; onChange: (s: GLSelection) => void;
  /** Preferred verified L (default: lowest computed stress) and card title (V2-8 reuse). */
  best?: number | null; title?: string;
}

const GroundLengthCard = ({ loading, refreshing, error, status, result, details, selection, selectedL, onChange, best: bestIn, title = "Length search with ground" }: Props) => {
  const fmt = useFmtLength();
  const { conv, parse, label } = useUnits();
  const [custom, setCustom] = useState<number>(selection?.custom ?? selectedL ?? 30000);
  const ranges = glRanges(result);
  const best = bestIn !== undefined ? bestIn : result && "lowestStress" in result ? result.lowestStress?.L ?? null : null;
  const k = selection?.rangeIndex ?? 0;
  const opts = ranges[k] ? glOptions(ranges[k], best) : [];
  const pick = (optionId: string, rangeIndex = k) => onChange({ rangeIndex, optionId, custom: selection?.custom ?? null });

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Search className="h-4 w-4 text-primary" /> {title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {loading && <Busy label={refreshing ? "Updating search — the content below belongs to the previous inputs" : "Searching admissible lengths within the domain…"} />}
        {error && <StatusBanner s={{ tone: "error", title: "Search failed", detail: error }} />}
        {status && <StatusBanner s={status} />}
        {details.length > 0 && (
          <dl className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
            {details.map(([a, b], i) => (<div key={i} className="contents"><dt className="text-muted-foreground">{a}</dt><dd className="font-mono break-words">{b}</dd></div>))}
          </dl>
        )}
        {result && <p className="text-[11px] text-muted-foreground">{GROUND_LENGTH_LIMITS}</p>}
        {selectedL !== null && (
          <p className="text-xs">Represented L: <strong className="font-mono">{fmt(selectedL)}</strong>
            <span className="text-muted-foreground"> — initially a verified admissible sample with the lowest computed stress (not a global optimum). hv, hl and supports are fixed.</span></p>
        )}
        {ranges.length > 0 && (
          <div className="space-y-3">
            <div className="space-y-1.5" role="radiogroup" aria-label="Estimated admissible length ranges">
              <Label className="text-xs">Estimated admissible ranges (select one)</Label>
              {ranges.map((r, i) => (
                <button key={i} type="button" role="radio" aria-checked={i === k} onClick={() => pick(glOptions(r, best)[0].id, i)}
                  className={`w-full text-left rounded-md border px-3 py-2 text-xs font-mono break-words ${i === k ? "border-primary bg-primary/10" : "border-border"}`}>
                  Estimated range {i + 1}: [{fmt(r.lower.value)} ; {fmt(r.upper.value)}]
                  {(r.lower.domainEdge || r.upper.domainEdge) && <span className="block text-[10px] text-muted-foreground">{r.lower.domainEdge ? "lower" : ""}{r.lower.domainEdge && r.upper.domainEdge ? " & " : ""}{r.upper.domainEdge ? "upper" : ""} end {EDGE_TEXT}</span>}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Represented L</Label>
              <div className="flex flex-wrap gap-2">
                {opts.map((o) => (
                  <Button key={o.id} size="sm" variant={selection?.optionId === o.id ? "default" : "outline"} className="h-7 text-[11px]" onClick={() => pick(o.id)}>
                    {o.label}: {fmt(o.value)}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-40">
                  <Label className="text-[11px]">Custom L ({label("m")})</Label>
                  <NumericInput value={conv(custom / 1000, "m")} onValueChange={(v) => setCustom(parse(v, "m") * 1000)} className="h-8 text-sm" decimals={3} />
                </div>
                <Button size="sm" variant={selection?.optionId === "custom" ? "default" : "outline"} className="h-8 text-[11px]"
                  disabled={!(Number.isFinite(custom) && custom > 0)} onClick={() => onChange({ rangeIndex: k, optionId: "custom", custom })}>
                  Use custom L
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">The represented L is re-solved; its verdict (below) may differ from the estimated range.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GroundLengthCard;
