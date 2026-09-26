// créé par Giovanni Malagnino, 2026-09-26 04:30 CEST (Europe/Rome, UTC+2)
// User-facing wording of Find L with ground (V2-7), shared by the screen and the PDF.
// Every conclusion is "within the searched length domain"; coverage never certified.

import { GroundLengthResult } from "@/lib/mechanics-v2";
import type { StatusText } from "./status-text";
import { ZONE_LABEL } from "./ground-height-text";

const plural = (n: number) => `${n} installed support${n === 1 ? "" : "s"}`;
const EXPLAIN = "Each range bound is an individually verified admissible L. Points between verified samples are ESTIMATED (adaptive sampling in ln L with estimated slopes), not verified; narrower non-admissible pockets may exist.";
export const EDGE_TEXT = "admissible at search boundary — range may continue beyond";

export function describeGroundLength(r: GroundLengthResult): StatusText {
  switch (r.status) {
    case "found": return { tone: "warn", title: `Estimated admissible L range${r.ranges.length > 1 ? "s" : ""} (${r.ranges.length}) with ground, ${plural(r.scope.numSupports)}, within the searched length domain — search coverage not certified`, detail: EXPLAIN };
    case "none-found": return { tone: "warn", title: "No admissible length found within the searched domain — search coverage not certified", detail: "This does not demonstrate that no admissible L exists, neither inside nor outside the searched domain." };
    case "incomplete": return { tone: "warn", title: "Search interrupted (resource limit) — coverage not certified", detail: r.message };
    case "invalid-input": return { tone: "error", title: "Invalid input", detail: r.errors.join("; ") };
    case "geometry-incompatible": return { tone: "error", title: "Geometric incompatibility", detail: r.message };
    case "not-implemented": return { tone: "info", title: "Not implemented", detail: r.message };
  }
}

const MAX_ZONES = 5;
const pct = (x: number) => `${(x * 100).toPrecision(3)} %`;

export function groundLengthRows(r: GroundLengthResult, fmt: (mm: number) => string, fmtS: (mpa: number) => string): [string, string][] {
  if (!("ranges" in r)) return [];
  const d = r.diagnostics, c = r.coverage, rows: [string, string][] = [];
  rows.push(["Algorithm completion", c.completion === "normal" ? "finished normally" : "interrupted by resource limit"]);
  rows.push(["Search coverage", "NOT certified (exploratory sampling)"]);
  rows.push(["Uncertain / failed evaluations", `${c.uncertainEvaluations} / ${c.failedEvaluations}`]);
  rows.push(["Searched length domain (exploration, not a mechanical bound)", `[${fmt(r.domain.lower)} ; ${fmt(r.domain.upper)}]`]);
  r.ranges.forEach((g, i) => {
    const edges = [g.lower.domainEdge ? "lower" : "", g.upper.domainEdge ? "upper" : ""].filter(Boolean);
    rows.push([`Estimated range ${i + 1} (verified end samples)`, `${fmt(g.lower.value)} ; ${fmt(g.upper.value)}${edges.length ? ` — ${edges.join(" & ")} end ${EDGE_TEXT}` : ""}`]);
  });
  // Readability: at most MAX_ZONES listed per kind, the rest counted.
  for (const reason of [...new Set(r.zones.map((z) => z.reason))]) {
    const zs = r.zones.filter((z) => z.reason === reason);
    zs.slice(0, MAX_ZONES).forEach((z) => rows.push([`Zone: ${ZONE_LABEL[reason]}`, `${fmt(z.from)} to ${fmt(z.to)}`]));
    if (zs.length > MAX_ZONES) rows.push([`Zone: ${ZONE_LABEL[reason]}`, `+ ${zs.length - MAX_ZONES} more between ${fmt(zs[MAX_ZONES].from)} and ${fmt(zs[zs.length - 1].to)}`]);
  }
  rows.push(["Domain limits reached by admissible samples", r.boundaryHits.length ? `${r.boundaryHits.join(" & ")} — ${EDGE_TEXT}` : "none"]);
  rows.push(["Largest verified admissible L found", r.largestFound === null ? "none" : `${fmt(r.largestFound)} (within the searched domain, not a global maximum)`]);
  rows.push(["Lowest computed stress among admissible samples", r.lowestStress ? `${fmtS(r.lowestStress.maxStress as number)} at ${fmt(r.lowestStress.L)} (not a global minimum)` : "none"]);
  rows.push(["Sampling resolution (relative, ln L)", `min step ${pct(d.minStepRel)}, boundary tol ${pct(d.boundaryTolRel)}, ${d.evaluations} solves, ${(d.elapsedMs / 1000).toFixed(1)} s`]);
  return rows;
}

export const GROUND_LENGTH_LIMITS =
  "Method: grid in ln L + adaptive refinement with the complete ground solver at each L (q fixed, total weight qL). Stress is not assumed monotone or convex. " +
  "Coverage between samples relies on estimated slopes or local monotonicity (not a proof): search coverage is never certified. " +
  "Conclusions hold only within the searched length domain; a domain edge is not a mechanical limit. " +
  "The represented L is always re-solved with the complete solver; its verdict is independent of the estimated range.";
