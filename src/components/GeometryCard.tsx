import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionProperties } from "@/lib/calculations";
import { Ruler } from "lucide-react";

interface Props {
  Do: number; t: number; L: number; h: number;
  section: SectionProperties;
  onChange: (field: string, value: number) => void;
}

const GeometryCard = ({ Do, t, L, h, section, onChange }: Props) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-sm">
        <Ruler className="h-4 w-4 text-primary" /> Geometry
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">D₀ (mm)</Label>
          <Input type="number" value={Do} onChange={e => onChange("Do", +e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">t (mm)</Label>
          <Input type="number" value={t} onChange={e => onChange("t", +e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">L (m)</Label>
          <Input type="number" value={L} onChange={e => onChange("L", +e.target.value)} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">h (mm)</Label>
          <Input type="number" value={h} onChange={e => onChange("h", +e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
      <div className="rounded-md bg-muted p-2.5 space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Computed</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
          <span className="text-muted-foreground">Dᵢ</span><span className="text-right font-mono">{section.Di.toFixed(2)} mm</span>
          <span className="text-muted-foreground">A</span><span className="text-right font-mono">{section.A.toFixed(1)} mm²</span>
          <span className="text-muted-foreground">I</span><span className="text-right font-mono">{section.I.toExponential(3)} mm⁴</span>
          <span className="text-muted-foreground">c</span><span className="text-right font-mono">{section.c.toFixed(2)} mm</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default GeometryCard;
