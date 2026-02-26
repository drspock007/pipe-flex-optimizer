// src/components/CoatingCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NumericInput from "@/components/NumericInput";
import { useUnits } from "@/contexts/UnitContext";
import {
  CoatingType,
  COATING_LABELS,
  getYellowJacketThickness,
  getCoatingDensity,
  calcCoatingWeight,
} from "@/lib/coating-presets";

interface Props {
  coatingType: CoatingType;
  coatingThickness: number; // mm (SI)
  coatingDensity: number; // kg/m³
  Do: number; // mm
  nps: string; // current NPS for Yellow Jacket auto-thickness
  onChange: (field: string, value: string | number) => void;
}

const COATING_TYPES = Object.keys(COATING_LABELS) as CoatingType[];

const CoatingCard = ({ coatingType, coatingThickness, coatingDensity, Do, nps, onChange }: Props) => {
  const { conv, parse, label } = useUnits();

  const effectiveDensity = getCoatingDensity(coatingType, coatingDensity);

  // Determine effective thickness
  let effectiveThickness = coatingThickness;
  let autoThickness: number | undefined;

  if (coatingType === "yellowJacket") {
    autoThickness = getYellowJacketThickness(nps);
    if (autoThickness != null) effectiveThickness = autoThickness;
  }

  const weight = calcCoatingWeight(Do, effectiveThickness, effectiveDensity);

  const showThicknessInput = coatingType === "sp2888" || coatingType === "fbeAro" || coatingType === "custom"
    || (coatingType === "yellowJacket" && autoThickness == null);

  const showDensityInput = coatingType === "custom";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-primary" /> Anti-corrosion Coating
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Coating type selector */}
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={coatingType} onValueChange={(v) => onChange("coatingType", v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COATING_TYPES.map((ct) => (
                <SelectItem key={ct} value={ct}>{COATING_LABELS[ct]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {coatingType !== "none" && (
          <>
            {/* Auto thickness info for Yellow Jacket */}
            {coatingType === "yellowJacket" && autoThickness != null && (
              <p className="text-[11px] text-muted-foreground">
                Auto thickness: {conv(autoThickness, "mm").toFixed(2)} {label("mm")} (NPS {nps})
              </p>
            )}

            {/* Thickness input */}
            {showThicknessInput && (
              <div>
                <Label className="text-xs">Thickness ({label("mm")})</Label>
                <NumericInput
                  value={conv(coatingThickness, "mm")}
                  onValueChange={(v) => onChange("coatingThickness", parse(v, "mm"))}
                  className="h-8 text-sm" decimals={2}
                />
              </div>
            )}

            {/* Density input (custom only) */}
            {showDensityInput && (
              <div>
                <Label className="text-xs">Density ({label("kg/m3")})</Label>
                <NumericInput
                  value={conv(coatingDensity, "kg/m3")}
                  onValueChange={(v) => onChange("coatingDensity", parse(v, "kg/m3"))}
                  className="h-8 text-sm" decimals={0}
                />
              </div>
            )}

            {/* Summary */}
            <SummaryBlock
              effectiveThickness={effectiveThickness}
              effectiveDensity={effectiveDensity}
              weight={weight}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

/** Muted summary block showing effective values */
function SummaryBlock({ effectiveThickness, effectiveDensity, weight }: {
  effectiveThickness: number; effectiveDensity: number; weight: number;
}) {
  const { conv, label } = useUnits();
  return (
    <div className="rounded-md bg-muted p-2.5 space-y-0.5">
      <div className="grid grid-cols-2 gap-x-4 text-xs">
        <span className="text-muted-foreground">Thickness</span>
        <span className="text-right font-mono">{conv(effectiveThickness, "mm").toFixed(2)} {label("mm")}</span>
        <span className="text-muted-foreground">Density</span>
        <span className="text-right font-mono">{effectiveDensity.toFixed(0)} {label("kg/m3")}</span>
        <span className="text-muted-foreground">Weight</span>
        <span className="text-right font-mono">{conv(weight, "kg/m").toFixed(3)} {label("kg/m")}</span>
      </div>
    </div>
  );
}

export default CoatingCard;
