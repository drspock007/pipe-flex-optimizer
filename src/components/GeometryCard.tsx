// Modifié par Giovanni malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SectionProperties } from "@/lib/calculations";
import { Ruler } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import NumericInput from "@/components/NumericInput";
import { useUnits } from "@/contexts/UnitContext";
import PipeSizeSelect from "@/components/geometry/PipeSizeSelect";
import WallThicknessSelect from "@/components/geometry/WallThicknessSelect";
import { PIPE_SIZES, WALL_THICKNESS_BY_NPS, findNpsByOd, findScheduleByWt } from "@/lib/pipe-presets";

interface Props {
  Do: number; t: number; L: number; h: number; hl: number;
  section: SectionProperties;
  /** L is only an input of the fixed-length mode; searches never read it. */
  showL: boolean;
  /** hv is not an input of Find h (it is searched). */
  showH?: boolean;
  onChange: (field: string, value: number | string) => void;
}

const GeometryCard = ({ Do, t, L, h, hl, showL, showH = true, onChange }: Props) => {
  const { conv, parse, label, system, toggle } = useUnits();
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Ruler className="h-4 w-4 text-primary" /> Geometry
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-medium ${system === "SI" ? "text-foreground" : "text-muted-foreground"}`}>SI</span>
            <Switch checked={system === "Imperial"} onCheckedChange={toggle} className="h-5 w-9" />
            <span className={`text-[10px] font-medium ${system === "Imperial" ? "text-foreground" : "text-muted-foreground"}`}>IMP</span>
          </div>
        </div>
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

          {showL && (
            <div>
              <Label className="text-xs">L ({label("m")})</Label>
              <NumericInput value={conv(L, "m")} onValueChange={v => onChange("L", parse(v, "m"))} className="h-8 text-sm" decimals={3} />
            </div>
          )}
          {showH && <div>
            <Label className="text-xs" title="Vertical end offset, positive when the right end is higher">h<sub>v</sub> ({label("mm")})</Label>
            <NumericInput value={conv(h, "mm")} onValueChange={v => onChange("h", parse(v, "mm"))} className="h-8 text-sm" decimals={1} />
          </div>}
          <div>
            <Label className="text-xs" title="Signed lateral end offset (horizontal, perpendicular to the pipe axis)">h<sub>l</sub> lateral ({label("mm")})</Label>
            <NumericInput value={conv(hl, "mm")} onValueChange={v => onChange("hl", parse(v, "mm"))} className="h-8 text-sm" decimals={1} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeometryCard;
