// src/components/geometry/PipeSizeSelect.tsx
// NPS dropdown with Custom option revealing a manual D₀ input.

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NumericInput from "@/components/NumericInput";
import { PIPE_SIZES } from "@/lib/pipe-presets";
import { useUnits } from "@/contexts/UnitContext";

interface Props {
  selectedNps: string;
  Do: number;
  onNpsChange: (nps: string) => void;
  onDoChange: (value: number) => void;
}

const PipeSizeSelect = ({ selectedNps, Do, onNpsChange, onDoChange }: Props) => {
  const { conv, parse, label } = useUnits();

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-xs">NPS</Label>
        <Select value={selectedNps} onValueChange={onNpsChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select NPS" />
          </SelectTrigger>
          <SelectContent>
            {PIPE_SIZES.map((p) => (
              <SelectItem key={p.nps} value={p.nps} className="text-xs">
                NPS {p.nps}" ({conv(p.od_mm!, "mm").toFixed(1)} {label("mm")})
              </SelectItem>
            ))}
            <SelectItem value="CUSTOM" className="text-xs font-semibold">
              Custom
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedNps === "CUSTOM" && (
        <div>
          <Label className="text-xs">D₀ ({label("mm")})</Label>
          <NumericInput
            value={conv(Do, "mm")}
            onValueChange={(v) => onDoChange(parse(v, "mm"))}
            className="h-8 text-sm"
            decimals={2}
          />
        </div>
      )}
    </div>
  );
};

export default PipeSizeSelect;
