import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DebugInfo } from "@/lib/calculations";
import { Bug, ChevronDown, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface Props {
  debug: DebugInfo;
}

const DebugPanel = ({ debug }: Props) => {
  const [open, setOpen] = useState(false);

  const ratioWarning = (debug.femTheoryRatio ?? 0) > 0 && ((debug.femTheoryRatio ?? 0) < 0.8 || (debug.femTheoryRatio ?? 0) > 1.2);

  const fmt = (v: number | undefined, fn: (n: number) => string) => v != null && isFinite(v) ? fn(v) : "—";

  const rows: [string, string, string][] = [
    ["L (mm)", fmt(debug.L_mm, v => v.toFixed(1)), "Pipe length in mm"],
    ["q (N/mm)", fmt(debug.q_Nmm, v => v.toFixed(6)), "Self-weight distributed load"],
    ["q (N/m)", fmt(debug.q_Nm, v => v.toFixed(4)), "Self-weight in N/m"],
    ["I (mm⁴)", fmt(debug.I, v => v.toExponential(4)), "Second moment of area"],
    ["c (mm)", fmt(debug.c, v => v.toFixed(2)), "Outer fiber distance"],
    ["Elem/span", String(debug.elementsPerSpan ?? "—"), "Elements per span used"],
    ["Total DOFs", String(debug.totalDofs ?? "—"), "Degrees of freedom"],
    ["Solve time", fmt(debug.solveTimeMs, v => v.toFixed(1) + " ms"), "FEM solve duration"],
    ["M_theory = qL²/12", fmt(debug.M_end_theory, v => v.toExponential(4)), "Fixed-fixed end moment (self-weight only)"],
    ["M_settle = 6EIh/L²", fmt(debug.M_settlement_theory, v => v.toExponential(4)), "Fixed-fixed settlement moment"],
    ["M_settle FEM", fmt(debug.M_settlement_fem, v => v.toExponential(4)), "FEM settlement moment (q=0)"],
    ["Settle err %", fmt(debug.settlementErrorPercent, v => v.toFixed(2) + "%"), "|M_FEM - M_theory| / M_theory"],
    ["FEM Max M (N·mm)", fmt(debug.maxMoment, v => v.toExponential(4)), "Peak bending moment from FEM"],
    ["FEM/Theory ratio", fmt(debug.femTheoryRatio, v => v.toFixed(4)), ratioWarning ? "⚠️ Ratio far from 1" : "Valid when h=0, no supports"],
    ["Error %", fmt(debug.errorPercent, v => v.toFixed(2) + "%"), "|M_FEM - M_theory| / M_theory"],
    ["Validation", debug.validationPassed ? "✅ PASS" : "❌ FAIL", "Self-weight & settlement checks"],
    ["at x (mm)", fmt(debug.maxMomentLocation, v => v.toFixed(1)), "Location of peak moment"],
    ["Max Stress (MPa)", fmt(debug.maxStress, v => v.toFixed(2)), "σ = |M|·c / I"],
    ["Allowable (MPa)", fmt(debug.allowableStress, v => v.toFixed(2)), "Re × allowable%"],
  ];

  const hasWarnings = debug.warnings && debug.warnings.length > 0;

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-2 pt-3 px-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
              <Bug className="h-3.5 w-3.5" /> FEM Debug Info
              {hasWarnings && <AlertTriangle className="h-3 w-3 text-primary" />}
            </CardTitle>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-4">
            {hasWarnings && (
              <div className="mb-2 space-y-0.5">
                {debug.warnings.map((w, i) => (
                  <p key={i} className="text-[10px] text-primary font-mono">{w}</p>
                ))}
              </div>
            )}
            <div className="space-y-0.5">
              {rows.map(([label, value, desc]) => (
                <div key={label} className="grid grid-cols-[1fr_auto] gap-2 text-[11px] py-0.5 border-b border-border/30 last:border-0">
                  <div>
                    <span className="font-mono text-foreground">{label}</span>
                    <span className="text-muted-foreground ml-1.5">— {desc}</span>
                  </div>
                  <span className="font-mono font-semibold text-primary tabular-nums">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default DebugPanel;
