// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-25 20:10 CEST: ground rows, Find h labels.
// Results of the solution at the represented length (engine values, unrounded decisions).

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";
import { BiaxialSuccess, GeneralInfimum } from "@/lib/mechanics-v2";
import { useUnits } from "@/contexts/UnitContext";
import { formatMomentPair } from "@/lib/unit-conversions";
import SupportsTable from "./SupportsTable";
import GroundRows from "./GroundRows";
import { AppMode } from "@/lib/v2-app/inputs";
import { axialRows, COMBINED_NOTE, verdictText } from "@/lib/v2-app/axial-text";

interface Props {
  s: BiaxialSuccess;
  /** null in fixed-length mode (no search performed). */
  rangeExists: boolean | "undecidable" | null;
  infimum: GeneralInfimum | null;
  atBound: boolean;
  mode: AppMode;
}

const Row = ({ k, v, strong }: { k: string; v: string; strong?: boolean }) => (
  <div className="flex justify-between gap-3 py-1 border-b border-border/50 text-xs">
    <span className="text-muted-foreground">{k}</span>
    <span className={`font-mono text-right ${strong ? "font-semibold text-foreground" : ""}`}>{v}</span>
  </div>
);

const V2ResultsPanel = ({ s, rangeExists, infimum, atBound, mode }: Props) => {
  const { conv, label, system } = useUnits();
  const m = (mm: number) => `${conv(mm / 1000, "m").toFixed(3)} ${label("m")}`;
  const mpa = (v: number) => `${conv(v, "MPa").toFixed(2)} ${label("MPa")}`;
  const active = s.supports.filter((x) => x.active).length;
  const excess = s.maxStress - s.sigmaAllow;
  const verdict = verdictText(s);
  const N = (v: number) => `${conv(v, "N").toFixed(1)} ${label("N")}`;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm"><Gauge className="h-4 w-4 text-primary" /> Results at the represented length</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`rounded-md border px-3 py-2 text-sm font-semibold ${verdict.met ? "border-primary/50 bg-primary/10" : "border-destructive/50 bg-destructive/10 text-destructive"}`}>
          {verdict.label} {verdict.met ? "met" : "not met"} {mode === "findH" ? `at hv = ${conv(s.input.hv, "mm").toFixed(1)} ${label("mm")}` : `at L = ${m(s.L)}`}
        </div>
        {verdict.uncertain && (
          <p className="rounded-md border border-destructive/50 px-3 py-2 text-[11px]">
            Verdict uncertain: the last mesh refinements change it, or the stress lies within the convergence threshold of the allowable. Compliance is not certain.
          </p>
        )}
        {atBound && !s.bendingCriterionMet && (
          <p className="text-[11px] text-muted-foreground">
            Numerical rounding at the range bound: engine stress exceeds the allowable by {excess.toExponential(2)} MPa
            (relative {(excess / s.sigmaAllow).toExponential(2)}). The criterion is reported as computed, not forced.
          </p>
        )}
        <div>
          {rangeExists !== null && <Row k="Admissible range exists" v={rangeExists === "undecidable" ? "undecidable" : rangeExists ? "yes" : "no"} />}
          {mode === "findH" && <Row k="Represented vertical offset hv" v={`${conv(s.input.hv, "mm").toFixed(1)} ${label("mm")}`} strong />}
          <Row k={mode === "findH" ? "Fixed length L" : mode === "fixedLength" ? "Length L" : "Represented length L"} v={m(s.L)} strong={mode !== "findH"} />
          <Row k="Max resultant bending stress" v={mpa(s.maxStress)} strong />
          <Row k="Allowable stress" v={mpa(s.sigmaAllow)} />
          <Row k="Position of the maximum" v={m(s.critical.x)} />
          <Row k="Moments at max (vertical / lateral)" v={formatMomentPair(s.critical.Mv, s.critical.Ml, system)} />
          <Row k="Installed supports / active contacts" v={`${s.supports.length} / ${active}`} />
          {infimum && (
            <Row k={infimum.attained ? "Minimum stress (attained)" : "Stress infimum (not attained)"}
              v={`${mpa(infimum.sigma)}${infimum.approachedAs === "attained" ? "" : ` (${infimum.approachedAs})`}${infimum.locations.length > 1 ? ` at ${infimum.locations.length} lengths` : ""}`} />
          )}
          <Row k="End reactions left / right" v={`${conv(s.endReactions.left.force, "N").toFixed(1)} / ${conv(s.endReactions.right.force, "N").toFixed(1)} ${label("N")}`} />
          <Row k="Numerical validity" v={s.numericalValid ? "valid (contact converged, equilibrium checked)" : "NOT valid"} />
          <Row k={s.axial ? "Physical validity (see domain indicators below)" : "Physical validity (small rotations, linear model)"} v="not assessed" />
        </div>
        {s.axial && (
          <div className="rounded-md border border-border/60 p-2">
            <p className="text-xs font-semibold mb-1">Axial restraint (coupled solution)</p>
            {axialRows(s.axial, s, { force: N, stress: mpa, length: m }).map(([k, v]) => <Row key={k} k={k} v={v} />)}
            <p className="mt-1 text-[11px] text-muted-foreground">{COMBINED_NOTE}</p>
          </div>
        )}
        {s.ground && <GroundRows g={s.ground} />}
        <SupportsTable supports={s.supports} />
        <details className="text-[11px] text-muted-foreground">
          <summary className="cursor-pointer">Diagnostics</summary>
          <p>Contact iterations: {s.diagnostics.iterations}; converged: {String(s.diagnostics.converged)}; equilibrium OK: {String(s.diagnostics.equilibriumOk)}</p>
          <p>Normalized residuals: {Object.entries(s.diagnostics.normalizedResiduals).map(([k, v]) => `${k} ${v.toExponential(1)}`).join(", ")}</p>
          {s.diagnostics.messages.map((x, i) => <p key={i}>{x}</p>)}
        </details>
      </CardContent>
    </Card>
  );
};

export default V2ResultsPanel;
