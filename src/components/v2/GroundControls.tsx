// créé par Giovanni Malagnino, 2026-09-25 20:10 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-26 04:30 CEST: Find L search domain (V2-7).
// Modifié par Giovanni Malagnino, 2026-09-26 05:10 CEST: domain shared with Min. supports (V2-8).
// Modifié par Giovanni Malagnino, 2026-09-26 17:55 CEST: domain also for Find L restrained (V2-11).
// Ground contact switch, minimum pipe-axis elevation (mm) and Find L domain (m).

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import NumericInput from "@/components/NumericInput";
import { useUnits } from "@/contexts/UnitContext";
import { AppInputs } from "@/lib/v2-app/inputs";

interface Props { inputs: AppInputs; onChange: (field: string, value: number | string | boolean) => void }

const GroundControls = ({ inputs, onChange }: Props) => {
  const { conv, parse, label } = useUnits();
  const findL = inputs.mode === "searchLength" || inputs.mode === "minSupports";
  // Domain: Find L / Min. supports with ground, and Find L restrained even without ground (V2-11).
  const showDomain = (inputs.groundEnabled && findL) || (findL && inputs.axialMode === "restrained");
  const badDomain = !(inputs.searchLmin > 0 && inputs.searchLmin < inputs.searchLmax && Number.isFinite(inputs.searchLmax));
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
          </p>
        </>
      )}
      {showDomain && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label htmlFor="searchLmin" className="text-xs">Search minimum length ({label("m")})</Label>
            <NumericInput value={conv(inputs.searchLmin, "m")} onValueChange={(v) => onChange("searchLmin", parse(v, "m"))} className="h-8 text-sm" decimals={3} />
          </div>
          <div>
            <Label htmlFor="searchLmax" className="text-xs">Search maximum length ({label("m")})</Label>
            <NumericInput value={conv(inputs.searchLmax, "m")} onValueChange={(v) => onChange("searchLmax", parse(v, "m"))} className="h-8 text-sm" decimals={3} />
          </div>
          <p className="sm:col-span-2 text-[11px] text-muted-foreground">
            Exploration domain, not a mechanical bound: results are reported within the searched length domain only.
            {badDomain && <strong className="block text-destructive">Requires 0 &lt; minimum &lt; maximum.</strong>}
          </p>
        </div>
      )}
    </div>
  );
};

export default GroundControls;
