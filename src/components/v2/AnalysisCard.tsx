// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Calculation mode, installed supports, search ceiling and axial mode.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2 } from "lucide-react";
import { AppInputs } from "@/lib/v2-app/inputs";
import { MAX_SUPPORTS } from "@/lib/mechanics-v2";

interface Props {
  inputs: AppInputs;
  onChange: (field: string, value: number | string) => void;
}

/** Explicit string label so that 0 is always rendered. */
export const countLabel = (n: number): string => String(n);

const COUNTS = Array.from({ length: MAX_SUPPORTS + 1 }, (_, i) => i);

const CountSelect = ({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (v: number) => void }) => (
  <div>
    <Label htmlFor={id} className="text-xs">{label}</Label>
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger id={id} className="h-8 text-sm"><SelectValue>{countLabel(value)}</SelectValue></SelectTrigger>
      <SelectContent>{COUNTS.map((n) => <SelectItem key={n} value={String(n)}>{countLabel(n)}</SelectItem>)}</SelectContent>
    </Select>
  </div>
);

const MODE_HELP: Record<AppInputs["mode"], string> = {
  fixedLength: "Solve the pipe for the length L entered in Geometry.",
  searchLength: "Find every length range meeting the bending criterion for the installed support count.",
  minSupports: "Find the smallest installed support count (0 to the ceiling) with an admissible length.",
  findH: "Find h is not available with the biaxial engine (V2).",
};

const AnalysisCard = ({ inputs, onChange }: Props) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-sm">
        <Settings2 className="h-4 w-4 text-primary" /> Analysis
      </CardTitle>
      <ToggleGroup type="single" value={inputs.mode} onValueChange={(v) => { if (v) onChange("mode", v); }}
        className="justify-start flex-wrap mt-2" size="sm" aria-label="Calculation mode">
        <ToggleGroupItem value="fixedLength" className="text-[11px] px-2.5 h-7">Fixed L</ToggleGroupItem>
        <ToggleGroupItem value="searchLength" className="text-[11px] px-2.5 h-7">Find L range</ToggleGroupItem>
        <ToggleGroupItem value="minSupports" className="text-[11px] px-2.5 h-7">Min. supports</ToggleGroupItem>
        <ToggleGroupItem value="findH" className="text-[11px] px-2.5 h-7">Find h (unavailable)</ToggleGroupItem>
      </ToggleGroup>
      <p className="text-[11px] text-muted-foreground mt-1">{MODE_HELP[inputs.mode]}</p>
    </CardHeader>
    <CardContent className="grid grid-cols-2 gap-3">
      {inputs.mode === "minSupports" ? (
        <CountSelect id="maxSupports" label="Search ceiling (max supports)" value={inputs.maxSupports} onChange={(v) => onChange("maxSupports", v)} />
      ) : (
        <CountSelect id="numSupports" label="Installed supports" value={inputs.numSupports} onChange={(v) => onChange("numSupports", v)} />
      )}
      <div>
        <Label htmlFor="axialMode" className="text-xs">Axial mode</Label>
        <Select value={inputs.axialMode} onValueChange={(v) => onChange("axialMode", v)}>
          <SelectTrigger id="axialMode" className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Free sliding</SelectItem>
            <SelectItem value="restrained">Restrained (not implemented)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="col-span-2 text-[11px] text-muted-foreground">
        Supports are equally spaced candidate vertical supports (unilateral contact). Fixed-end pipe, linear model.
      </p>
    </CardContent>
  </Card>
);

export default AnalysisCard;
