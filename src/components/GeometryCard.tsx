import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionProperties, CalcMode } from "@/lib/calculations";
import { Ruler } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Props {
  Do: number; t: number; L: number; h: number;
  section: SectionProperties;
  calcMode: CalcMode;
  computedL?: number;
  computedH?: number;
  onChange: (field: string, value: number | string) => void;
}

const GeometryCard = ({ Do, t, L, h, section, calcMode, computedL, computedH, onChange }: Props) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Ruler className="h-4 w-4 text-primary" /> Geometry
        </CardTitle>
        <ToggleGroup
          type="single"
          value={calcMode}
          onValueChange={(v) => { if (v) onChange("calcMode", v); }}
          className="justify-start mt-2"
          size="sm"
        >
          <ToggleGroupItem value="standard" className="text-[11px] px-2.5 h-7">Standard</ToggleGroupItem>
          <ToggleGroupItem value="findL" className="text-[11px] px-2.5 h-7">Find L</ToggleGroupItem>
          <ToggleGroupItem value="findH" className="text-[11px] px-2.5 h-7">Find h</ToggleGroupItem>
        </ToggleGroup>
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
            {calcMode === "findL" ? (
              computedL == null ? (
                <div className="h-8 text-sm border border-destructive bg-destructive/10 rounded-md flex items-center px-3 font-semibold text-destructive">
                  Aucune solution
                </div>
              ) : (
                <Input
                  type="number"
                  value={Math.round(computedL * 100) / 100}
                  readOnly
                  className="h-8 text-sm border-primary bg-primary/10 font-semibold"
                />
              )
            ) : (
              <Input type="number" value={L} onChange={e => onChange("L", +e.target.value)} className="h-8 text-sm" />
            )}
          </div>
          <div>
            <Label className="text-xs">h (mm)</Label>
            {calcMode === "findH" ? (
              computedH == null ? (
                <div className="h-8 text-sm border border-destructive bg-destructive/10 rounded-md flex items-center px-3 font-semibold text-destructive">
                  Aucune solution
                </div>
              ) : (
                <Input
                  type="number"
                  value={Math.round(computedH * 100) / 100}
                  readOnly
                  className="h-8 text-sm border-primary bg-primary/10 font-semibold"
                />
              )
            ) : (
              <Input type="number" value={h} onChange={e => onChange("h", +e.target.value)} className="h-8 text-sm" />
            )}
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
};

export default GeometryCard;
