// créé par Giovanni Malagnino, 2026-09-25 22:40 CEST (Europe/Rome, UTC+2)
// User-facing wording of Find h with ground (V2-6), shared by the screen and the PDF.
// Unresolved, uncertain or failed portions never read as "not admissible".

import { GroundHeightResult, UnresolvedZone } from "@/lib/mechanics-v2";
import type { StatusText } from "./status-text";

const plural = (n: number) => `${n} installed support${n === 1 ? "" : "s"}`;
const SCOPE = "Domain [max(ground level, -Hcap), Hcap], Hcap = sA L^2/(4 E c): kinematic necessary bound, valid with the ground.";

export function describeGroundHeight(r: GroundHeightResult): StatusText {
  switch (r.status) {
    case "ok": return { tone: "ok", title: `${r.ranges.length} admissible hv range${r.ranges.length > 1 ? "s" : ""} with ground, ${plural(r.scope.numSupports)}`, detail: `${SCOPE} Coverage established at the sampling resolution (see limits).` };
    case "partial": return { tone: "warn", title: `${r.ranges.length} admissible hv range${r.ranges.length > 1 ? "s" : ""} found — some zones unresolved`, detail: "Admissibility inside the unresolved zones is not established." };
    case "no-solution": return { tone: "warn", title: `No admissible hv with ground, ${plural(r.scope.numSupports)}`, detail: r.domain ? `Every evaluation converged and exceeds the allowable. ${SCOPE} Features narrower than the minimum step are not excluded.` : "Ground level above Hcap: hv >= ground level cannot meet the necessary bound." };
    case "unresolved": return { tone: "warn", title: "No admissible hv established — absence NOT proven", detail: "Some zones are unresolved (uncertain verdict or solver failure)." };
    case "incomplete": return { tone: "warn", title: "Search incomplete (resource limit)", detail: r.message };
    case "invalid-input": return { tone: "error", title: "Invalid input", detail: r.errors.join("; ") };
    case "geometry-incompatible": return { tone: "error", title: "Geometric incompatibility", detail: r.message };
    case "not-implemented": return { tone: "info", title: "Not implemented", detail: r.message };
  }
}

export const ZONE_LABEL: Record<UnresolvedZone["reason"], string> = {
  "boundary-transition": "boundary bracket (verdict within mesh precision)",
  "uncertain-verdict": "uncertain verdict",
  "solver-failure": "solver did not converge",
  "narrow-feature-not-excluded": "narrow feature not excluded",
  budget: "not explored (resource limit)",
};

/** Rows (label, value) describing the domain, zones and limits. */
export function groundHeightRows(r: GroundHeightResult, fmt: (mm: number) => string): [string, string][] {
  if (!("ranges" in r)) return [];
  const d = r.diagnostics, rows: [string, string][] = [];
  rows.push(["Searched hv domain", r.domain ? `[${fmt(r.domain.lower)} ; ${fmt(r.domain.upper)}]` : "empty"]);
  rows.push(["Hcap (necessary, not sufficient)", fmt(d.Hcap)]);
  r.ranges.forEach((g, i) => {
    const lo = g.lower.bracket === null ? "domain edge" : `bracket ${fmt(g.lower.bracket)}`;
    const up = g.upper.bracket === null ? "domain edge" : `bracket ${fmt(g.upper.bracket)}`;
    rows.push([`Range ${i + 1} verified bounds`, `${fmt(g.lower.value)} (${lo}) ; ${fmt(g.upper.value)} (${up})`]);
  });
  r.zones.forEach((z) => rows.push([`Zone: ${ZONE_LABEL[z.reason]}`, `${fmt(z.from)} to ${fmt(z.to)}`]));
  rows.push(["Largest admissible hv found", r.largestFound === null ? "none" : `${fmt(r.largestFound)} (verified; not a demonstrated maximum)`]);
  rows.push(["Sampling resolution", `min step ${fmt(d.minStep)}, boundary tol ${fmt(d.boundaryTol)}, ${d.evaluations} solves, ${(d.elapsedMs / 1000).toFixed(1)} s`]);
  return rows;
}

export const GROUND_HEIGHT_LIMITS =
  "Method: grid + adaptive refinement with the complete ground solver at each hv. Stress is not assumed monotone or convex. " +
  "Coverage between samples relies on an estimated slope bound or local monotonicity (not a proof): features narrower than the minimum step cannot be excluded. " +
  "Published bounds are solved admissible samples; the exact boundary lies within the bracket.";
