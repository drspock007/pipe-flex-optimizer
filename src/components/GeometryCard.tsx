import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionProperties, CalcMode } from "@/lib/calculations";
import { Ruler } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import NumericInput from "@/components/NumericInput";
import { useUnits } from "@/contexts/UnitContext";
import PipeSizeSelect from "@/components/geometry/PipeSizeSelect";
import WallThicknessSelect from "@/components/geometry/WallThicknessSelect";
import { PIPE_SIZES, WALL_THICKNESS_BY_NPS, findNpsByOd, findScheduleByWt } from "@/lib/pipe-presets";

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

  // Local state for selectors — derived from global Do/t on mount
  const [selectedNps, setSelectedNps] = useState(() => findNpsByOd(Do));
  const [selectedSchedule, setSelectedSchedule] = useState(() => findScheduleByWt(findNpsByOd(Do), t));

  const handleNpsChange = (nps: string) => {
    setSelectedNps(nps);
    if (nps === "CUSTOM") {
      setSelectedSchedule("Custom");
      return;
    }
    const pipe = PIPE_SIZES.find(p => p.nps === nps);
    if (pipe?.od_mm != null) onChange("Do", pipe.od_mm);
    // Reset schedule to first available
    const schedules = WALL_THICKNESS_BY_NPS[nps];
    if (schedules?.length) {
      setSelectedSchedule(schedules[0].schedule);
      onChange("t", schedules[0].wt_mm);
    } else {
      setSelectedSchedule("Custom");
    }
  };

  const handleScheduleChange = (schedule: string) => {
    setSelectedSchedule(schedule);
    if (schedule === "Custom") return;
    const options = WALL_THICKNESS_BY_NPS[selectedNps];
    const match = options?.find(o => o.schedule === schedule);
    if (match) onChange("t", match.wt_mm);
  };

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
          {/* NPS / D₀ */}
          <div>
            <PipeSizeSelect
              selectedNps={selectedNps} Do={Do}
              onNpsChange={handleNpsChange}
              onDoChange={(v) => onChange("Do", v)}
            />
          </div>

          {/* Schedule / t */}
          <div>
            {selectedNps === "CUSTOM" ? (
              <div>
                <Label className="text-xs">t ({label("mm")})</Label>
                <NumericInput value={conv(t, "mm")} onValueChange={v => onChange("t", parse(v, "mm"))} className="h-8 text-sm" decimals={3} />
              </div>
            ) : (
              <WallThicknessSelect
                selectedNps={selectedNps} selectedSchedule={selectedSchedule} t={t}
                onScheduleChange={handleScheduleChange}
                onTChange={(v) => onChange("t", v)}
              />
            )}
          </div>

          {/* L */}
          {calcMode === "findL" ? (
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">L<sub>min</sub> ({label("m")})</Label>
                {computedLmin == null ? (
                  <div className="h-8 text-sm border border-destructive bg-destructive/10 rounded-md flex items-center px-3 font-semibold text-destructive text-[11px]">No solution</div>
                ) : (
                  <Input type="number" value={+conv(computedLmin, "m").toFixed(4)} readOnly className="h-8 text-sm border-primary bg-primary/10 font-semibold" />
                )}
              </div>
              <div>
                <Label className="text-xs">L<sub>max</sub> ({label("m")})</Label>
                {computedLmax == null ? (
                  <div className="h-8 text-sm border border-destructive bg-destructive/10 rounded-md flex items-center px-3 font-semibold text-destructive text-[11px]">No solution</div>
                ) : (
                  <Input type="number" value={+conv(computedLmax, "m").toFixed(4)} readOnly className="h-8 text-sm border-primary bg-primary/10 font-semibold" />
                )}
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-xs">L ({label("m")})</Label>
              <NumericInput value={conv(L, "m")} onValueChange={v => onChange("L", parse(v, "m"))} className="h-8 text-sm" decimals={0} />
            </div>
          )}

          {/* h */}
          <div>
            <Label className="text-xs">h ({label("mm")})</Label>
            {calcMode === "findH" ? (
              computedH == null ? (
                <div className="h-8 text-sm border border-destructive bg-destructive/10 rounded-md flex items-center px-3 font-semibold text-destructive">No solution</div>
              ) : (
                <Input type="number" value={+conv(computedH, "mm").toFixed(2)} readOnly className="h-8 text-sm border-primary bg-primary/10 font-semibold" />
              )
            ) : (
              <NumericInput value={conv(h, "mm")} onValueChange={v => onChange("h", parse(v, "mm"))} className="h-8 text-sm" decimals={0} />
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default GeometryCard;
