// créé par Giovanni Malagnino, 2026-09-25 22:40 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-25 23:10 CEST: exploratory wording (V2-6 final).
// User-facing wording of Find h with ground (V2-6), shared by the screen and the PDF.
// Sampling never certifies coverage: ranges are "estimated", absence is never
// claimed from samples, and completion / coverage / uncertain / budget are separate.

import { GroundHeightResult, UnresolvedZone } from "@/lib/mechanics-v2";
import type { StatusText } from "./status-text";

const plural = (n: number) => `${n} installed support${n === 1 ? "" : "s"}`;
const EXPLAIN = "Each range bound is an individually verified admissible hv. Points between verified samples are ESTIMATED (adaptive sampling with estimated slopes), not verified; narrower non-admissible pockets may exist.";

export function describeGroundHeight(r: GroundHeightResult): StatusText {
  switch (r.status) {
    case "found": return { tone: "warn", title: `Estimated admissible hv range${r.ranges.length > 1 ? "s" : ""} (${r.ranges.length}) with ground, ${plural(r.scope.numSupports)} — search coverage not certified`, detail: EXPLAIN };
    case "none-found": return { tone: "warn", title: "No admissible height found — search coverage not certified", detail: "All converged samples exceed the allowable (or are unresolved). This does not demonstrate that no admissible hv exists." };
    case "impossible": return { tone: "warn", title: "No admissible hv: demonstrated by the necessary bound", detail: "Ground level above Hcap: hv >= ground level cannot meet the kinematic necessary condition |hv| <= Hcap." };
    case "incomplete": return { tone: "warn", title: "Search interrupted (resource limit) — coverage not certified", detail: r.message };
    case "invalid-input": return { tone: "error", title: "Invalid input", detail: r.errors.join("; ") };
    case "geometry-incompatible": return { tone: "error", title: "Geometric incompatibility", detail: r.message };
    case "not-implemented": return { tone: "info", title: "Not implemented", detail: r.message };
  }
}

export const ZONE_LABEL: Record<UnresolvedZone["reason"], string> = {
  "transition-bracket": "transition bracket (admissible / not admissible, both decidable)",
  "uncertain-verdict": "unresolved: uncertain verdict",
  "solver-failure": "unresolved: solver did not converge",
  "narrow-feature-not-excluded": "unresolved: narrow feature not excluded",
  budget: "unresolved: not explored (resource limit)",
};

/** Rows (label, value) describing status facets, domain, ranges, zones and limits. */
export function groundHeightRows(r: GroundHeightResult, fmt: (mm: number) => string): [string, string][] {
  if (!("ranges" in r)) return [];
  const d = r.diagnostics, c = r.coverage, rows: [string, string][] = [];
  rows.push(["Algorithm completion", c.completion === "normal" ? "finished normally" : "interrupted by resource limit"]);
  rows.push(["Search coverage", "NOT certified (exploratory sampling)"]);
  rows.push(["Uncertain / failed evaluations", `${c.uncertainEvaluations} / ${c.failedEvaluations}`]);
  rows.push(["Searched hv domain", r.domain ? `[${fmt(r.domain.lower)} ; ${fmt(r.domain.upper)}]` : "empty"]);
  rows.push(["Hcap = sA L^2/(4 E c) (necessary, not sufficient)", fmt(d.Hcap)]);
  r.ranges.forEach((g, i) => rows.push([`Estimated range ${i + 1} (verified end samples)`, `${fmt(g.lower.value)} ; ${fmt(g.upper.value)}`]));
  r.zones.forEach((z) => rows.push([`Zone: ${ZONE_LABEL[z.reason]}`, `${fmt(z.from)} to ${fmt(z.to)}`]));
  rows.push(["Largest verified admissible hv found", r.largestFound === null ? "none" : `${fmt(r.largestFound)} (not a demonstrated global maximum)`]);
  rows.push(["Sampling resolution", `min step ${fmt(d.minStep)}, boundary tol ${fmt(d.boundaryTol)}, ${d.evaluations} solves, ${(d.elapsedMs / 1000).toFixed(1)} s`]);
  return rows;
}

export const GROUND_HEIGHT_LIMITS =
  "Method: grid + adaptive refinement with the complete ground solver at each hv. Stress is not assumed monotone or convex. " +
  "Coverage between samples relies on an estimated slope bound or local monotonicity (not a proof): search coverage is never certified. " +
  "A transition bracket contains at least one crossing only if stress is continuous in hv; it proves neither uniqueness nor detection of all ranges. " +
  "The represented hv is always re-solved with the complete solver; its verdict is independent of the estimated range.";
