import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalculationResults } from "@/lib/calculations";
import { BarChart3, CircleCheck, CircleX, AlertTriangle } from "lucide-react";

interface Props {
  results: CalculationResults;
}

const ResultsPanel = ({ results }: Props) => {
  const { maxStress, allowableStress, isSafeNow, hasWindow, numSupports, spanLength, section,
          computedLmin, computedLmax, computedH, calcMode, supportStatus, L_plot } = results;
  const ratio = maxStress / allowableStress;

  const activeCount = supportStatus.filter(s => s.active).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 className="h-4 w-4 text-primary" /> Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Safety Badge */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Safety Status</span>
            {calcMode === "findL" ? (
              hasWindow ? (
                <Badge className="bg-safe text-safe-foreground hover:bg-safe/90">
                  <CircleCheck className="h-3 w-3 mr-1" /> FEASIBLE WINDOW FOUND
                </Badge>
              ) : (
                <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  <CircleX className="h-3 w-3 mr-1" /> NO SOLUTION
                </Badge>
              )
            ) : (
              <Badge className={isSafeNow
                ? "bg-safe text-safe-foreground hover:bg-safe/90"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }>
                {isSafeNow
                  ? <><CircleCheck className="h-3 w-3 mr-1" /> SAFE</>
                  : <><CircleX className="h-3 w-3 mr-1" /> NOT SAFE</>
                }
              </Badge>
            )}
          </div>
          {/* Separate stress safety indicator for FindL */}
          {calcMode === "findL" && hasWindow && !isSafeNow && (
            <div className="flex items-center justify-end">
              <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-[9px]">
                <AlertTriangle className="h-2.5 w-2.5 mr-1" /> Display stress exceeds allowable
              </Badge>
            </div>
          )}
        </div>

        {/* Stress comparison */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Max Stress</span>
            <span className={`font-mono font-semibold ${!isSafeNow ? "text-destructive" : ""}`}>{maxStress.toFixed(1)} MPa</span>
          </div>
          {calcMode === "findL" && L_plot != null && (
            <p className="text-[9px] text-muted-foreground italic">Shown at L = {L_plot.toFixed(2)} m (midpoint)</p>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Allowable Stress</span>
            <span className="font-mono font-semibold text-primary">{allowableStress.toFixed(1)} MPa</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isSafeNow ? 'bg-safe' : 'bg-destructive'}`}
              style={{ width: `${Math.min(ratio * 100, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-right">Utilization: {(ratio * 100).toFixed(1)}%</p>
        </div>

        {/* Computed values (reverse modes) */}
        {calcMode === "findL" && hasWindow && computedLmin != null && computedLmax != null && (
          <div className="rounded-md border border-primary bg-primary/10 p-2.5 space-y-1">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Admissible Length Range</p>
            <div className="flex items-baseline gap-3">
              <div>
                <span className="text-[10px] text-muted-foreground">L<sub>min</sub></span>
                <p className="text-lg font-mono font-bold text-primary">{computedLmin.toFixed(2)} m</p>
              </div>
              <span className="text-muted-foreground">—</span>
              <div>
                <span className="text-[10px] text-muted-foreground">L<sub>max</sub></span>
                <p className="text-lg font-mono font-bold text-primary">{computedLmax.toFixed(2)} m</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs mt-1">
              <span className="text-muted-foreground">Supports Used</span>
              <span className="text-right font-mono font-semibold">{numSupports} (minimum)</span>
              <span className="text-muted-foreground">Active Supports</span>
              <span className="text-right font-mono font-semibold">{activeCount}/{numSupports}</span>
              {L_plot != null && (
                <>
                  <span className="text-muted-foreground">Display at L</span>
                  <span className="text-right font-mono font-semibold">{L_plot.toFixed(2)} m</span>
                </>
              )}
            </div>
            {numSupports > 0 && (
              <p className="text-[9px] text-muted-foreground mt-1 italic">
                Unilateral supports on settlement line — pipe lifts off inactive supports
              </p>
            )}
          </div>
        )}
        {calcMode === "findL" && !hasWindow && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              No solution up to {20} supports
            </AlertDescription>
          </Alert>
        )}
        {calcMode === "findH" && computedH != null && (
          <div className="rounded-md border border-primary bg-primary/10 p-2.5 space-y-1">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Computed Max Settlement</p>
            <p className="text-lg font-mono font-bold text-primary">{computedH.toFixed(2)} mm</p>
            {numSupports > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs mt-1">
                <span className="text-muted-foreground">Supports Used</span>
                <span className="text-right font-mono font-semibold">{numSupports}</span>
                <span className="text-muted-foreground">Active Supports</span>
                <span className="text-right font-mono font-semibold">{activeCount}/{numSupports}</span>
              </div>
            )}
          </div>
        )}
        {calcMode === "findH" && computedH == null && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Aucun tassement admissible pour ces paramètres
            </AlertDescription>
          </Alert>
        )}

        {/* Support info */}
        <div className="rounded-md bg-muted p-2.5 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Support Optimization</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <span className="text-muted-foreground">Candidate Supports</span>
            <span className="text-right font-mono font-semibold">{numSupports}</span>
            <span className="text-muted-foreground">Active (in contact)</span>
            <span className="text-right font-mono font-semibold">{activeCount}</span>
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
