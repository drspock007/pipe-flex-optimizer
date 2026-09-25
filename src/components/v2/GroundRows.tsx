// créé par Giovanni Malagnino, 2026-09-25 20:10 CEST (Europe/Rome, UTC+2)
// Ground contact results (V2-5). Nodal reactions are discrete forces, not pressures.

import { GroundReport } from "@/lib/mechanics-v2";
import { useUnits } from "@/contexts/UnitContext";

const GroundRows = ({ g }: { g: GroundReport }) => {
  const { conv, label } = useUnits();
  const m = (mm: number) => `${conv(mm / 1000, "m").toFixed(3)}`;
  const zones = g.contactZones.length
    ? g.contactZones.map((z) => (z.xStart === z.xEnd ? `${m(z.xStart)}` : `${m(z.xStart)}–${m(z.xEnd)}`)).join(", ") + ` ${label("m")}`
    : "none (pipe clear of the ground)";
  const rows: [string, string][] = [
    ["Minimum pipe-axis elevation", `${conv(g.level, "mm").toFixed(1)} ${label("mm")}`],
    ["Ground reaction (discrete nodal forces at ground nodes)", `${conv(g.totalReaction, "N").toFixed(1)} ${label("N")}`],
    ...(g.combinedReaction > 0 ? [["Supports coinciding with the ground (combined, split indeterminate)", `${conv(g.combinedReaction, "N").toFixed(1)} ${label("N")}`] as [string, string]] : []),
    ...(g.endReaction !== 0 ? [["Clamped end(s) at ground level (clamp reaction, not attributed to the ground)", `${conv(g.endReaction, "N").toFixed(1)} ${label("N")}`] as [string, string]] : []),
    ["Total vertical contact force (sum of the three above)", `${conv(g.contactTotal, "N").toFixed(1)} ${label("N")}`],
    ["Estimated zones near the ground (graphical grouping)", zones],
    ["Numerical contact points (not installed supports)", String(g.contactNodes)],
    ["Max residual penetration", `${conv(g.maxPenetration, "mm").toExponential(2)} ${label("mm")} (tol. ${conv(g.tolPenetration, "mm").toExponential(1)})`],
    ["Mesh convergence", `${g.converged ? "converged" : "NOT converged"} — ${g.elements} elements, ${g.refinement.length} refinement levels${g.precisionLoss ? ", precision loss" : ""}`],
    ["Bending criterion vs mesh precision", g.criterionUncertain ? "UNCERTAIN — verdict not decidable at the convergence precision" : "decidable"],
  ];
  return (
    <div className="rounded-md border border-border/60 p-2">
      <p className="text-xs font-semibold mb-1">Ground contact (rigid, horizontal, frictionless — numerical approximation)</p>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 py-0.5 text-xs border-b border-border/40 last:border-0">
          <span className="text-muted-foreground">{k}</span><span className="font-mono text-right">{v}</span>
        </div>
      ))}
    </div>
  );
};

export default GroundRows;
