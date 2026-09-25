// créé par Giovanni Malagnino, 2026-09-25 21:15 CEST (Europe/Rome, UTC+2)
// Shared ground-contact wording for the results panel and the PDF, so both
// always show the same reaction terms and convergence explanation.

import { GroundReport } from "@/lib/mechanics-v2";

export const STRESS_CONVERGENCE_TEXT =
  "Stress convergence threshold between successive meshes: max(1e-3 x sigma, 1e-5 x allowable); " +
  "1e-5 x allowable is only the absolute floor. It measures the change between meshes: it is neither a mechanical margin nor a guaranteed error bound.";

/** Reaction rows: [label, value, note]. Signed values are kept as computed (a clamp reaction may be negative). */
export function groundReactionRows(g: GroundReport, fmtN: (v: number) => string): [string, string, string][] {
  const terms: string[] = ["ground"];
  const rows: [string, string, string][] = [
    ["Ground reaction", fmtN(g.totalReaction), "discrete nodal forces at ground nodes"],
  ];
  if (g.combinedReaction !== 0) {
    terms.push("combined support/ground");
    rows.push(["Supports coinciding with the ground", fmtN(g.combinedReaction), "combined, split indeterminate"]);
  }
  if (g.endReaction !== 0) {
    terms.push("clamps");
    rows.push(["Clamped end(s) at ground level", fmtN(g.endReaction), "clamp reaction, signed, not attributed to the ground"]);
  }
  rows.push(["Sum of vertical reactions at ground level (including clamps)", fmtN(g.contactTotal), `= ${terms.join(" + ")}`]);
  return rows;
}
