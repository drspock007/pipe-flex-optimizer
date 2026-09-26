// créé par Giovanni Malagnino, 2026-09-25 21:15 CEST (Europe/Rome, UTC+2)
// Shared ground-contact wording for the results panel and the PDF, so both
// always show the same reaction terms and convergence explanation.

import { GroundFailureCause, GroundReport } from "@/lib/mechanics-v2";

export const STRESS_CONVERGENCE_TEXT =
  "Stress convergence threshold between successive meshes: max(1e-3 x sigma, 1e-5 x allowable); " +
  "1e-5 x allowable is only the absolute floor. It measures the change between meshes: it is neither a mechanical margin nor a guaranteed error bound.";

/** Reaction rows: [label, value, note]. Signed values are kept as computed (a clamp reaction may be negative). */
export function groundReactionRows(g: GroundReport, fmtN: (v: number) => string): [string, string, string][] {
  const terms: string[] = ["ground"];
  if (g.method === "analytical-full-contact") return [
    ["Ground reaction (resultant of the continuous pressure p = q over [0, L])", fmtN(g.totalReaction), "analytical, distributed, no nodal forces"],
    ["Supports and clamped ends", fmtN(0), "analytical: zero shear and moment, no point reactions"],
    ["Sum of vertical reactions at ground level (including clamps)", fmtN(g.contactTotal), "= q L"],
  ];
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

/** V2-7-R1: precise failure causes (replace the generic "did not converge"). */
export const CAUSE_LABEL: Record<GroundFailureCause, string> = {
  "contact-not-converged": "contact not converged",
  "mesh-not-converged": "mesh convergence not established",
  "precision-loss": "precision loss in the equilibrium check",
  "numerical-overflow": "numerical overflow",
  "resource-limit": "resource limit",
  "solver-error": "linear solver error",
  "axial-not-converged": "axial compatibility not converged",
};

/** Method / convergence line: the exact path never claims a mesh convergence. */
export function groundMethodText(g: GroundReport, fmtMm: (mm: number) => string): string {
  if (g.method === "analytical-full-contact")
    return "analytical full-ground-contact solution (exactly flat pipe on the ground, no mesh): z = y = 0, moments 0, continuous contact over [0, L]";
  if (g.method === "exact-no-contact")
    return `exact member solution without ground contact (no mesh): minimum clearance ${g.minClearance === undefined || !Number.isFinite(g.minClearance) ? "n/a" : fmtMm(g.minClearance)} verified on every member`;
  return `mesh ${g.converged ? "converged" : "NOT converged"} — ${g.elements} elements, ${g.refinement.length} refinement levels${g.precisionLoss ? ", precision loss" : ""}`;
}

/** Contact geometry rows: estimated zones and isolated points come from the
 *  computed contact nodes only; clamped ends imposed at the ground level are
 *  listed separately (never shown as a zero-length contact zone). */
export function groundContactRows(g: GroundReport, hv: number, L: number, fmtX: (mm: number) => string, dash = "–"): [string, string][] {
  const tol = Math.max(g.tolPenetration, 1e-9 * Math.max(1, Math.abs(hv)));
  const left = Math.abs(g.level) <= tol, right = Math.abs(g.level - hv) <= tol;
  const isEnd = (x: number) => (left && x <= 1e-9 * L) || (right && x >= L * (1 - 1e-9));
  const zones = g.contactZones.filter((z) => z.xEnd > z.xStart);
  const points = g.contactZones.filter((z) => z.xEnd === z.xStart && !(isEnd(z.xStart) && !g.contactPoints.includes(z.xStart)));
  const ends = [left ? "left end (x = 0)" : "", right ? "right end (x = L)" : ""].filter(Boolean);
  if (g.method === "analytical-full-contact") return [
    ["Contact (analytical, continuous)", `${fmtX(0)} ${dash} ${fmtX(L)} (whole length)`],
    ["Clamped ends imposed at ground level", "left end (x = 0), right end (x = L)"],
  ];
  const none = "No interior ground-contact nodes";
  return [
    ["Estimated contact zones (graphical grouping of computed contacts)", g.contactNodes === 0 ? none : zones.length ? zones.map((z) => `${fmtX(z.xStart)} ${dash} ${fmtX(z.xEnd)}`).join("; ") : "none"],
    ["Isolated contact points", g.contactNodes === 0 ? none : points.length ? points.map((z) => fmtX(z.xStart)).join("; ") : "none"],
    ["Clamped ends imposed at ground level", ends.length ? ends.join(", ") : "none"],
  ];
}
