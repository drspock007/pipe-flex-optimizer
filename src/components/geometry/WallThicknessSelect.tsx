// src/components/geometry/WallThicknessSelect.tsx
// Schedule dropdown (filtered by NPS) with Custom option revealing a manual t input.

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NumericInput from "@/components/NumericInput";
import { getWallThicknessOptions } from "@/lib/pipe-presets";
import { useUnits } from "@/contexts/UnitContext";

interface Props {
  selectedNps: string;
  selectedSchedule: string;
  t: number;
  onScheduleChange: (schedule: string) => void;
  onTChange: (value: number) => void;
}

const WallThicknessSelect = ({ selectedNps, selectedSchedule, t, onScheduleChange, onTChange }: Props) => {
  const { conv, parse, label } = useUnits();
  const options = getWallThicknessOptions(selectedNps);

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs">Schedule</Label>
        <Select value={selectedSchedule} onValueChange={onScheduleChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select schedule" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.schedule} value={o.schedule} className="text-xs">
                {o.wt_mm !== null
                  ? `${o.schedule} — ${conv(o.wt_mm, "mm").toFixed(2)} ${label("mm")}`
                  : o.schedule}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSchedule === "Custom" && (
        <div>
          <Label className="text-xs">t ({label("mm")})</Label>
          <NumericInput
            value={conv(t, "mm")}
            onValueChange={(v) => onTChange(parse(v, "mm"))}
            className="h-8 text-sm"
            decimals={3}
          />
        </div>
      )}
    </div>
  );
};

export default WallThicknessSelect;
