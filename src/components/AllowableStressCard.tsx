import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import { useUnits } from "@/contexts/UnitContext";

interface Props {
  allowablePercent: number;
  yieldStrength: number;
  allowableStress: number;
  onChange: (value: number) => void;
}

const AllowableStressCard = ({ allowablePercent, yieldStrength, allowableStress, onChange }: Props) => {
  const { conv, label } = useUnits();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-primary" /> Allowable Stress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Allowable % of Yield: {allowablePercent}%</Label>
          <Slider
            value={[allowablePercent]}
            onValueChange={v => onChange(v[0])}
            min={10} max={100} step={1}
            className="mt-2"
          />
        </div>
        <div className="rounded-md bg-muted p-2.5 space-y-0.5">
          <div className="grid grid-cols-2 gap-x-4 text-xs">
            <span className="text-muted-foreground">Rₑ</span>
            <span className="text-right font-mono">{conv(yieldStrength, "MPa").toFixed(0)} {label("MPa")}</span>
            <span className="text-muted-foreground">Allowable</span>
            <span className="text-right font-mono font-semibold text-primary">{conv(allowableStress, "MPa").toFixed(1)} {label("MPa")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AllowableStressCard;
