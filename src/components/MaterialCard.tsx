import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GRADES } from "@/lib/calculations";
import { Layers } from "lucide-react";
import { useUnits } from "@/contexts/UnitContext";

interface Props {
  grade: string; E: number; customYield: number;
  onChange: (field: string, value: string | number) => void;
}

const MaterialCard = ({ grade, E, customYield, onChange }: Props) => {
  const { conv, parse, label } = useUnits();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Layers className="h-4 w-4 text-primary" /> Material
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Steel Grade</Label>
          <Select value={grade} onValueChange={v => onChange("grade", v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {GRADES.map(g => (
                <SelectItem key={g.key} value={g.key}>
                  {g.label} — {conv(g.smys, "MPa").toFixed(0)} {label("MPa")}
                </SelectItem>
              ))}
              <SelectItem value="CUSTOM">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {grade === "CUSTOM" && (
          <div>
            <Label className="text-xs">Yield Strength Rₑ ({label("MPa")})</Label>
            <Input type="number" value={+conv(customYield, "MPa").toFixed(2)} onChange={e => onChange("customYield", parse(+e.target.value, "MPa"))} className="h-8 text-sm" />
          </div>
        )}
        <div>
          <Label className="text-xs">Young's Modulus E ({label("GPa")})</Label>
          <Input type="number" value={+conv(E, "GPa").toFixed(2)} onChange={e => onChange("E", parse(+e.target.value, "GPa"))} className="h-8 text-sm" />
        </div>
      </CardContent>
    </Card>
  );
};

export default MaterialCard;
