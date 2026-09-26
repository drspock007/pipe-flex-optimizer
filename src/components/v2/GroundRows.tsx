// créé par Giovanni Malagnino, 2026-09-25 20:10 CEST (Europe/Rome, UTC+2)
// Ground contact results (V2-5). Nodal reactions are discrete forces, not pressures.

import { GroundReport } from "@/lib/mechanics-v2";
import { groundContactRows, groundMethodText, groundReactionRows, STRESS_CONVERGENCE_TEXT } from "@/lib/v2-app/ground-labels";
import { useUnits } from "@/contexts/UnitContext";

const GroundRows = ({ g, hv, L }: { g: GroundReport; hv: number; L: number }) => {
  const { conv, label } = useUnits();
  const rows: [string, string][] = [
    ["Minimum pipe-axis elevation", `${conv(g.level, "mm").toFixed(1)} ${label("mm")}`],
    ...groundReactionRows(g, (v) => `${conv(v, "N").toFixed(1)} ${label("N")}`).map(([k, v, n]) => [`${k} (${n})`, v] as [string, string]),
    ...groundContactRows(g, hv, L, (mm) => `${conv(mm / 1000, "m").toFixed(3)} ${label("m")}`),
    ["Numerical contact points (not installed supports)", String(g.contactNodes)],
    ["Max residual penetration", `${conv(g.maxPenetration, "mm").toExponential(2)} ${label("mm")} (tol. ${conv(g.tolPenetration, "mm").toExponential(1)})`],
    ["Calculation method", groundMethodText(g, (mm) => `${conv(mm, "mm").toFixed(3)} ${label("mm")}`)],
    ["Governing stress criterion vs mesh precision", g.criterionUncertain ? "UNCERTAIN — verdict not decidable at the convergence precision" : "decidable"],
  ];
  return (
    <div className="rounded-md border border-border/60 p-2">
      <p className="text-xs font-semibold mb-1">Ground contact (rigid, horizontal, frictionless — numerical approximation)</p>
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 py-0.5 text-xs border-b border-border/40 last:border-0">
          <span className="text-muted-foreground">{k}</span><span className="font-mono text-right">{v}</span>
        </div>
      ))}
      <p className="mt-1 text-[11px] text-muted-foreground">{STRESS_CONVERGENCE_TEXT}</p>
    </div>
  );
};

export default GroundRows;
