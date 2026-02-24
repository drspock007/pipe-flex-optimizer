import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DebugInfo } from "@/lib/calculations";
import { Bug, ChevronDown } from "lucide-react";
import { useState } from "react";

interface Props {
  debug: DebugInfo;
}

const DebugPanel = ({ debug }: Props) => {
  const [open, setOpen] = useState(false);

  const ratioWarning = debug.femTheoryRatio > 0 && (debug.femTheoryRatio < 0.8 || debug.femTheoryRatio > 1.2);

  const rows: [string, string, string][] = [
    ["L (mm)", debug.L_mm.toFixed(1), "Pipe length in mm"],
    ["q (N/mm)", debug.q_Nmm.toFixed(6), "Self-weight distributed load"],
    ["q (N/m)", debug.q_Nm.toFixed(4), "Self-weight in N/m"],
    ["I (mm⁴)", debug.I.toExponential(4), "Second moment of area"],
    ["c (mm)", debug.c.toFixed(2), "Outer fiber distance"],
    ["M_theory = qL²/12", debug.M_end_theory.toExponential(4), "Fixed-fixed end moment (self-weight only, no settlement)"],
    ["FEM Max Moment (N·mm)", debug.maxMoment.toExponential(4), "Peak bending moment from FEM"],
    ["FEM/Theory ratio", debug.femTheoryRatio.toFixed(4), ratioWarning ? "⚠️ Ratio far from 1 — settlement/supports contribute" : "Close to 1 when h=0, no supports"],
    ["at x (mm)", debug.maxMomentLocation.toFixed(1), "Location of peak moment"],
    ["Max Stress (MPa)", debug.maxStress.toFixed(2), "σ = |M|·c / I"],
    ["Allowable (MPa)", debug.allowableStress.toFixed(2), "Re × allowable%"],
  ];

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-2 pt-3 px-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <CardTitle className="flex items-center gap-2 text-xs text-muted-foreground">
              <Bug className="h-3.5 w-3.5" /> FEM Debug Info
            </CardTitle>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-4">
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
