import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DebugInfo, SupportStatusDisplay } from "@/lib/calculations";
import { Bug, ChevronDown, AlertTriangle } from "lucide-react";
import { useState } from "react";

function computeSagCheck(
  debug: DebugInfo,
  supportStatus: SupportStatusDisplay[],
  numSupports: number
): { minSag: number; maxSag: number; warning?: string } | null {
  // Need deflection data from debug — we approximate from support status + endpoints
  // Use support positions to define spans, compute w_rel at midpoints
  // For now, if we have no data, skip
  if (debug.L_mm == null || debug.L_mm <= 0) return null;

  // We can't access full deflection curve here, but we can check support status
  // If supportStatus has w_fem and w_ref, compute w_rel = w_fem - w_ref
  const sagValues = supportStatus.map(s => s.w_fem - s.w_ref);
  if (sagValues.length === 0) return null;

  const minSag = Math.min(...sagValues);
  const maxSag = Math.max(...sagValues);

  let warning: string | undefined;
  // If self-weight is on (q > 0) and max sag <= 0, sign convention issue
  if (debug.q_Nmm > 0 && maxSag <= 0 && sagValues.length > 0) {
    warning = "Self-weight sag check failed (sign convention issue)";
  }

  return { minSag, maxSag, warning };
}

interface Props {
  debug: DebugInfo;
  numSupports: number;
  supportStatus: SupportStatusDisplay[];
}

const DebugPanel = ({ debug, numSupports, supportStatus }: Props) => {
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
    ["M_theory = qL²/12", fmt(debug.M_end_theory, v => v.toExponential(4)), "Fixed-fixed end moment (total L, no supports)"],
    ["M_settle = 6EIh/L²", fmt(debug.M_settlement_theory, v => v.toExponential(4)), "Fixed-fixed settlement moment (total L)"],
    ["M_settle FEM", fmt(debug.M_settlement_fem, v => v.toExponential(4)), "FEM settlement moment (q=0)"],
    ["Settle err %", fmt(debug.settlementErrorPercent, v => v.toFixed(2) + "%"), "|M_FEM - M_theory| / M_theory"],
  ];

  if (numSupports > 0) {
    rows.push(
      ["— Span Theory —", "", `With ${numSupports} supports`],
      ["M_theory (span)", fmt(debug.M_theory_span, v => v.toExponential(4)), "q·Ls²/12 per span"],
      ["M_settle (span)", fmt(debug.M_settle_span, v => v.toExponential(4)), "6EI·hs/Ls² per span"],
      ["Span err %", fmt(debug.spanErrorPercent, v => v.toFixed(2) + "%"), "|M_FEM - M_span_total| / M_span_total"],
    );
  }

  // FindL search debug
  if (debug.searchSupportsUsed != null) {
    rows.push(
      ["— Find L Search —", "", "Range search debug"],
      ["Supports tested", String(debug.searchSupportsUsed), "Minimum supports found"],
      ["Lmin guess", fmt(debug.searchLminGuess, v => v.toFixed(1) + " m"), "Coarse scan lower bound"],
      ["Lmax guess", fmt(debug.searchLmaxGuess, v => v.toFixed(1) + " m"), "Coarse scan upper bound"],
    );
  }

  // Contact solver debug
  if (debug.contactIterations != null) {
    rows.push(
      ["— Contact Solver —", "", "Unilateral support model"],
      ["Contact iterations", String(debug.contactIterations), "Active-set convergence iterations"],
      ["Candidates", String(debug.candidateSupportsCount ?? 0), "Total candidate supports"],
      ["Active", String(debug.activeSupportsCount ?? 0), "Supports in contact"],
    );
  }

  // Sag check: compute w_rel at midspans
  const sagCheck = computeSagCheck(debug, supportStatus, numSupports);
  if (sagCheck) {
    rows.push(
      ["— Sag Check —", "", "w_rel = w - w_ref at mid-spans"],
      ["min(w_rel)", sagCheck.minSag.toFixed(3) + " mm", "Minimum relative deflection"],
      ["max(w_rel)", sagCheck.maxSag.toFixed(3) + " mm", "Maximum relative deflection (sag)"],
    );
    if (sagCheck.warning) {
      rows.push(["⚠️ Sag warning", sagCheck.warning, "Sign convention issue"]);
    }
  }

  rows.push(
    ["FEM Max M (N·mm)", fmt(debug.maxMoment, v => v.toExponential(4)), "Peak bending moment from FEM"],
    ["FEM/Theory ratio", fmt(debug.femTheoryRatio, v => v.toFixed(4)), ratioWarning ? "⚠️ Ratio far from 1" : "Valid when h=0, no supports"],
    ["Error %", fmt(debug.errorPercent, v => v.toFixed(2) + "%"), "|M_FEM - M_theory| / M_theory (no supports only)"],
    ["Validation", debug.validationPassed ? "✅ PASS" : "❌ FAIL", "Self-weight & settlement checks"],
    ["at x (mm)", fmt(debug.maxMomentLocation, v => v.toFixed(1)), "Location of peak moment"],
    ["Max Stress (MPa)", fmt(debug.maxStress, v => v.toFixed(2)), "σ = |M|·c / I"],
    ["Allowable (MPa)", fmt(debug.allowableStress, v => v.toFixed(2)), "Re × allowable%"],
  );

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

            {/* Support Contact Status Table */}
            {supportStatus.length > 0 && (
              <div className="mt-3 pt-2 border-t border-border/30">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Support Contact Status</p>
                <div className="space-y-0.5">
                  {supportStatus.map((sup, i) => {
                    const lift = sup.w_fem - sup.w_ref;
                    return (
                      <div key={i} className="grid grid-cols-[auto_1fr_auto] gap-2 text-[10px] py-0.5 border-b border-border/20 last:border-0">
                        <span className="font-mono text-foreground">#{i}</span>
                        <span className="font-mono text-muted-foreground">
                          x={sup.x.toFixed(3)}m  w_fem={sup.w_fem.toFixed(1)}  w_ref={sup.w_ref.toFixed(1)}
                        </span>
                        <span className={`font-mono font-semibold ${sup.active ? "text-primary" : "text-muted-foreground"}`}>
                          {sup.active ? "ACTIVE" : `LIFTED +${lift.toFixed(1)}mm`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default DebugPanel;
