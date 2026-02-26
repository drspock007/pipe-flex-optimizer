import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionProperties, CalcMode } from "@/lib/calculations";
import { Ruler } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import NumericInput from "@/components/NumericInput";
import { useUnits } from "@/contexts/UnitContext";

interface Props {
  Do: number; t: number; L: number; h: number;
  section: SectionProperties;
  calcMode: CalcMode;
  computedLmin?: number;
  computedLmax?: number;
  computedH?: number;
  onChange: (field: string, value: number | string) => void;
}

const GeometryCard = ({ Do, t, L, h, section, calcMode, computedLmin, computedLmax, computedH, onChange }: Props) => {
  const { conv, parse, label } = useUnits();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Ruler className="h-4 w-4 text-primary" /> Geometry
        </CardTitle>
        <ToggleGroup
          type="single" value={calcMode}
          onValueChange={(v) => { if (v) onChange("calcMode", v); }}
          className="justify-start mt-2" size="sm"
        >
          <ToggleGroupItem value="standard" className="text-[11px] px-2.5 h-7">Standard</ToggleGroupItem>
          <ToggleGroupItem value="findL" className="text-[11px] px-2.5 h-7">Find L</ToggleGroupItem>
          <ToggleGroupItem value="findH" className="text-[11px] px-2.5 h-7">Find h</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">D₀ ({label("mm")})</Label>
            <NumericInput value={conv(Do, "mm")} onValueChange={v => onChange("Do", parse(v, "mm"))} className="h-8 text-sm" decimals={2} />
          </div>
          <div>
            <Label className="text-xs">t ({label("mm")})</Label>
            <NumericInput value={conv(t, "mm")} onValueChange={v => onChange("t", parse(v, "mm"))} className="h-8 text-sm" decimals={2} />
          </div>
          {calcMode === "findL" ? (
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">L<sub>min</sub> ({label("m")})</Label>
                {computedLmin == null ? (
                  <div className="h-8 text-sm border border-destructive bg-destructive/10 rounded-md flex items-center px-3 font-semibold text-destructive text-[11px]">
                    No solution
                  </div>
                ) : (
                  <Input type="number" value={+conv(computedLmin, "m").toFixed(4)} readOnly className="h-8 text-sm border-primary bg-primary/10 font-semibold" />
                )}
              </div>
              <div>
                <Label className="text-xs">L<sub>max</sub> ({label("m")})</Label>
                {computedLmax == null ? (
                  <div className="h-8 text-sm border border-destructive bg-destructive/10 rounded-md flex items-center px-3 font-semibold text-destructive text-[11px]">
                    No solution
                  </div>
                ) : (
                  <Input type="number" value={+conv(computedLmax, "m").toFixed(4)} readOnly className="h-8 text-sm border-primary bg-primary/10 font-semibold" />
                )}
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-xs">L ({label("m")})</Label>
              <NumericInput value={conv(L, "m")} onValueChange={v => onChange("L", parse(v, "m"))} className="h-8 text-sm" decimals={2} />
            </div>
          )}
          <div>
            <Label className="text-xs">h ({label("mm")})</Label>
            {calcMode === "findH" ? (
              computedH == null ? (
                <div className="h-8 text-sm border border-destructive bg-destructive/10 rounded-md flex items-center px-3 font-semibold text-destructive">
                  No solution
                </div>
              ) : (
                <Input
                  type="number"
                  value={+conv(computedH, "mm").toFixed(2)}
                  readOnly
                  className="h-8 text-sm border-primary bg-primary/10 font-semibold"
                />
              )
            ) : (
              <NumericInput value={conv(h, "mm")} onValueChange={v => onChange("h", parse(v, "mm"))} className="h-8 text-sm" decimals={2} />
            )}
          </div>
        </div>

        <div className="rounded-md bg-muted p-2.5 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Computed</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <span className="text-muted-foreground">Dᵢ</span><span className="text-right font-mono">{conv(section.Di, "mm").toFixed(2)} {label("mm")}</span>
            <span className="text-muted-foreground">A</span><span className="text-right font-mono">{conv(section.A, "mm2").toFixed(2)} {label("mm2")}</span>
            <span className="text-muted-foreground">I</span><span className="text-right font-mono">{conv(section.I, "mm4").toExponential(3)} {label("mm4")}</span>
            <span className="text-muted-foreground">c</span><span className="text-right font-mono">{conv(section.c, "mm").toFixed(2)} {label("mm")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeometryCard;
