import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getGradeOptions } from "@/lib/calculations";
import { Layers } from "lucide-react";

interface Props {
  grade: string; E: number; customYield: number;
  onChange: (field: string, value: string | number) => void;
}

const MaterialCard = ({ grade, E, customYield, onChange }: Props) => (
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
            {getGradeOptions().map(g => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {grade === "Custom" && (
        <div>
          <Label className="text-xs">Yield Strength Rₑ (MPa)</Label>
          <Input type="number" value={customYield} onChange={e => onChange("customYield", +e.target.value)} className="h-8 text-sm" />
        </div>
      )}
      <div>
        <Label className="text-xs">Young's Modulus E (GPa)</Label>
        <Input type="number" value={E} onChange={e => onChange("E", +e.target.value)} className="h-8 text-sm" />
      </div>
    </CardContent>
  </Card>
);

export default MaterialCard;
