import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Weight } from "lucide-react";

interface Props {
  includeSelfWeight: boolean;
  density: number;
  q: number;
  weightPerMeter: number;
  onChange: (field: string, value: boolean | number) => void;
}

const LoadCard = ({ includeSelfWeight, density, q, weightPerMeter, onChange }: Props) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-sm">
        <Weight className="h-4 w-4 text-primary" /> Loading
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id="selfweight"
          checked={includeSelfWeight}
          onCheckedChange={v => onChange("includeSelfWeight", !!v)}
        />
        <Label htmlFor="selfweight" className="text-xs cursor-pointer">Include self-weight</Label>
      </div>
      {includeSelfWeight && (
        <div>
          <Label className="text-xs">Density ρ (kg/m³)</Label>
          <Input type="number" value={density} onChange={e => onChange("density", +e.target.value)} className="h-8 text-sm" />
        </div>
      )}
      <div className="rounded-md bg-muted p-2.5 space-y-0.5">
        <div className="grid grid-cols-2 gap-x-4 text-xs">
          <span className="text-muted-foreground">q</span><span className="text-right font-mono">{q.toFixed(4)} N/mm</span>
          <span className="text-muted-foreground">Weight</span><span className="text-right font-mono">{weightPerMeter.toFixed(2)} kg/m</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default LoadCard;
