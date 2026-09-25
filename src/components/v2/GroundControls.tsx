// créé par Giovanni Malagnino, 2026-09-25 20:10 CEST (Europe/Rome, UTC+2)
// Ground contact switch and minimum pipe-axis elevation (stored in mm).

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import NumericInput from "@/components/NumericInput";
import { useUnits } from "@/contexts/UnitContext";
import { AppInputs } from "@/lib/v2-app/inputs";

interface Props { inputs: AppInputs; onChange: (field: string, value: number | string | boolean) => void }

const GroundControls = ({ inputs, onChange }: Props) => {
  const { conv, parse, label } = useUnits();
  return (
    <div className="col-span-2 space-y-2 rounded-md border border-border/60 p-2">
      <label className="flex items-center justify-between gap-2 text-xs font-medium">
        Ground contact
        <Switch checked={inputs.groundEnabled} onCheckedChange={(v) => onChange("groundEnabled", v)} aria-label="Ground contact" />
      </label>
      {inputs.groundEnabled && (
        <>
          <div>
            <Label htmlFor="groundContactZ" className="text-xs">Minimum pipe-axis elevation ({label("mm")})</Label>
            <NumericInput value={conv(inputs.groundContactZ, "mm")} onValueChange={(v) => onChange("groundContactZ", parse(v, "mm"))} className="h-8 text-sm" decimals={1} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Axis level = physical ground elevation + outer radius (coating included). It is already an axis level: the radius is not added again.
            Same axes as hv: z(0) = 0, z(L) = hv. Rigid, horizontal, frictionless ground over the full length.
            {inputs.mode !== "fixedLength" && <strong className="block text-destructive">Ground contact is currently available in Fixed L only.</strong>}
          </p>
        </>
      )}
    </div>
  );
};

export default GroundControls;
