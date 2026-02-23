import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalculationResults } from "@/lib/calculations";
import { BarChart3, CircleCheck, CircleX } from "lucide-react";

interface Props {
  results: CalculationResults;
}

const ResultsPanel = ({ results }: Props) => {
  const { maxStress, allowableStress, isSafe, numSupports, spanLength, section, computedL, computedH } = results;
  const ratio = maxStress / allowableStress;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 className="h-4 w-4 text-primary" /> Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Safety Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Safety Status</span>
          <Badge className={isSafe
            ? "bg-safe text-safe-foreground hover:bg-safe/90"
            : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
          }>
            {isSafe
              ? <><CircleCheck className="h-3 w-3 mr-1" /> SAFE</>
              : <><CircleX className="h-3 w-3 mr-1" /> NOT SAFE</>
            }
          </Badge>
        </div>

        {/* Stress comparison */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Max Stress</span>
            <span className="font-mono font-semibold">{maxStress.toFixed(1)} MPa</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Allowable Stress</span>
            <span className="font-mono font-semibold text-primary">{allowableStress.toFixed(1)} MPa</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isSafe ? 'bg-safe' : 'bg-destructive'}`}
              style={{ width: `${Math.min(ratio * 100, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-right">Utilization: {(ratio * 100).toFixed(1)}%</p>
        </div>

        {/* Computed values (reverse modes) */}
        {computedL != null && (
          <div className="rounded-md border border-primary bg-primary/10 p-2.5 space-y-1">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Computed Max Length</p>
            <p className="text-lg font-mono font-bold text-primary">{computedL.toFixed(2)} m</p>
          </div>
        )}
        {computedH != null && (
          <div className="rounded-md border border-primary bg-primary/10 p-2.5 space-y-1">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Computed Max Settlement</p>
            <p className="text-lg font-mono font-bold text-primary">{computedH.toFixed(2)} mm</p>
          </div>
        )}

        {/* Support info */}
        <div className="rounded-md bg-muted p-2.5 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Support Optimization</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <span className="text-muted-foreground">Intermediate Supports</span>
            <span className="text-right font-mono font-semibold">{numSupports}</span>
            <span className="text-muted-foreground">Span Length</span>
            <span className="text-right font-mono">{spanLength.toFixed(2)} m</span>
          </div>
        </div>

        {/* Section properties */}
        <div className="rounded-md bg-muted p-2.5 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Section Properties</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <span className="text-muted-foreground">A</span>
            <span className="text-right font-mono">{section.A.toFixed(1)} mm²</span>
            <span className="text-muted-foreground">I</span>
            <span className="text-right font-mono">{section.I.toExponential(3)} mm⁴</span>
            <span className="text-muted-foreground">Weight/m</span>
            <span className="text-right font-mono">{section.weightPerMeter.toFixed(2)} kg/m</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsPanel;
