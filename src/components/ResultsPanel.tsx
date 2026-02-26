// src/components/ResultsPanel.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalculationResults, FindLDisplayMode } from "@/lib/calculations";
import { BarChart3, CircleCheck, CircleX, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUnits } from "@/contexts/UnitContext";

interface Props {
  results: CalculationResults;
  onChange?: (field: string, value: string | number | boolean) => void;
}

const labelFor = (m: FindLDisplayMode) => {
  if (m === "Lmin") return "Lmin (minimum admissible)";
  if (m === "Lmid") return "Lmid (milieu de fenêtre)";
  if (m === "Lopt") return "Lopt (σ minimale)";
  return "Lmax (maximum admissible)";
};

const ResultsPanel = ({ results, onChange }: Props) => {
  const { conv, label } = useUnits();
  const {
    maxStress, allowableStress, isSafeNow, hasWindow, numSupports,
    spanLength, section, computedLmin, computedLmax, computedH,
    calcMode, supportStatus, L_plot, findLDisplay, findLPoints,
  } = results;

  const ratio = maxStress / allowableStress;
  const activeCount = supportStatus.filter((s) => s.active).length;
  const stressUnit = label("MPa");
  const lengthUnit = label("m");

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
                <Badge className="bg-safe text-safe-foreground hover:bg-safe/90"><CircleCheck className="h-3 w-3 mr-1" /> FEASIBLE WINDOW FOUND</Badge>
              ) : (
                <Badge className="bg-destructive text-destructive-foreground hover:bg-destructive/90"><CircleX className="h-3 w-3 mr-1" /> NO SOLUTION</Badge>
              )
            ) : (
              <Badge className={isSafeNow ? "bg-safe text-safe-foreground hover:bg-safe/90" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}>
                {isSafeNow ? <><CircleCheck className="h-3 w-3 mr-1" /> SAFE</> : <><CircleX className="h-3 w-3 mr-1" /> NOT SAFE</>}
              </Badge>
            )}
          </div>
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
            <span className={`font-mono font-semibold ${!isSafeNow ? "text-destructive" : ""}`}>
              {conv(maxStress, "MPa").toFixed(1)} {stressUnit}
            </span>
          </div>
          {calcMode === "findL" && L_plot != null && (
            <p className="text-[9px] text-muted-foreground italic">
              Shown at L = {conv(L_plot, "m").toFixed(2)} {lengthUnit} ({labelFor(findLDisplay)})
            </p>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Allowable Stress</span>
            <span className="font-mono font-semibold text-primary">{conv(allowableStress, "MPa").toFixed(1)} {stressUnit}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${isSafeNow ? "bg-safe" : "bg-destructive"}`} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground text-right">Utilization: {(ratio * 100).toFixed(1)}%</p>
        </div>

        {/* FindL window */}
        {calcMode === "findL" && hasWindow && computedLmin != null && computedLmax != null && (
          <div className="rounded-md border border-primary bg-primary/10 p-2.5 space-y-1">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Admissible Length Range</p>
            <div className="flex items-baseline gap-3">
              <div>
                <span className="text-[10px] text-muted-foreground">L<sub>min</sub></span>
                <p className="text-lg font-mono font-bold text-primary">{conv(computedLmin, "m").toFixed(2)} {lengthUnit}</p>
              </div>
              <span className="text-muted-foreground">—</span>
              <div>
                <span className="text-[10px] text-muted-foreground">L<sub>max</sub></span>
                <p className="text-lg font-mono font-bold text-primary">{conv(computedLmax, "m").toFixed(2)} {lengthUnit}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs mt-1">
              <span className="text-muted-foreground">Supports Used</span>
              <span className="text-right font-mono font-semibold">{numSupports} (minimum)</span>
              <span className="text-muted-foreground">Active Supports</span>
              <span className="text-right font-mono font-semibold">{activeCount}/{numSupports}</span>
              <span className="text-muted-foreground">Display Mode</span>
              <div className="flex justify-end">
                <Select value={findLDisplay} onValueChange={(v) => onChange?.("findLDisplay", v as FindLDisplayMode)}>
                  <SelectTrigger className="h-7 w-[210px] text-[11px]"><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lmin">Lmin{findLPoints ? ` = ${conv(findLPoints.Lmin, "m").toFixed(2)} ${lengthUnit}` : ""}</SelectItem>
                    <SelectItem value="Lmid">Lmid{findLPoints ? ` = ${conv(findLPoints.Lmid, "m").toFixed(2)} ${lengthUnit}` : ""}</SelectItem>
                    <SelectItem value="Lopt">Lopt{findLPoints ? ` = ${conv(findLPoints.Lopt, "m").toFixed(2)} ${lengthUnit}` : ""}</SelectItem>
                    <SelectItem value="Lmax">Lmax{findLPoints ? ` = ${conv(findLPoints.Lmax, "m").toFixed(2)} ${lengthUnit}` : ""}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {L_plot != null && (
                <>
                  <span className="text-muted-foreground">Display at L</span>
                  <span className="text-right font-mono font-semibold">{conv(L_plot, "m").toFixed(2)} {lengthUnit}</span>
                </>
              )}
            </div>
            {numSupports > 0 && (
              <p className="text-[9px] text-muted-foreground mt-1 italic">Unilateral supports on settlement line — pipe lifts off inactive supports</p>
            )}
          </div>
        )}

        {calcMode === "findL" && !hasWindow && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">No solution up to 20 supports</AlertDescription>
          </Alert>
        )}

        {/* FindH */}
        {calcMode === "findH" && computedH != null && (
          <div className="rounded-md border border-primary bg-primary/10 p-2.5 space-y-1">
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">Computed Max Settlement</p>
            <p className="text-lg font-mono font-bold text-primary">{conv(computedH, "mm").toFixed(2)} {label("mm")}</p>
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
            <AlertDescription className="text-xs">Aucun tassement admissible pour ces paramètres</AlertDescription>
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
            <span className="text-right font-mono">{conv(spanLength, "m").toFixed(2)} {lengthUnit}</span>
          </div>
        </div>

        {/* Section properties */}
        <div className="rounded-md bg-muted p-2.5 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Section Properties</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <span className="text-muted-foreground">Dᵢ</span>
            <span className="text-right font-mono">{conv(section.Di, "mm").toFixed(2)} {label("mm")}</span>
            <span className="text-muted-foreground">A</span>
            <span className="text-right font-mono">{conv(section.A, "mm2").toFixed(2)} {label("mm2")}</span>
            <span className="text-muted-foreground">I</span>
            <span className="text-right font-mono">{conv(section.I, "mm4").toExponential(3)} {label("mm4")}</span>
            <span className="text-muted-foreground">c</span>
            <span className="text-right font-mono">{conv(section.c, "mm").toFixed(2)} {label("mm")}</span>
            <span className="text-muted-foreground">Weight/m</span>
            <span className="text-right font-mono">{conv(section.weightPerMeter, "kg/m").toFixed(2)} {label("kg/m")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsPanel;
