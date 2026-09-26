// créé par Giovanni Malagnino, 2026-09-26 17:30 CEST (Europe/Rome, UTC+2)
// User-facing wording of Find h with axial restraint (V2-10), shared by the screen and the PDF.
// Ranges are estimated, coverage never certified; absence is only claimed when
// an independent necessary condition proves it (with its reason).

import { RestrainedHeightResult } from "@/lib/mechanics-v2";
import type { StatusText } from "./status-text";
import { fmtSmall, groundHeightRows } from "./ground-height-text";

const plural = (n: number) => `${n} installed support${n === 1 ? "" : "s"}`;
const EXPLAIN = "Each range bound is an individually verified admissible hv (complete restrained solver, combined criterion). Points between verified samples are ESTIMATED, not verified; narrower non-admissible pockets may exist.";
const BOUND = "hv^2 + hl^2 <= 2 L^2 sA / E";

export function describeRestrainedHeight(r: RestrainedHeightResult): StatusText {
  const g = "meta" in r && r.meta.groundEnabled ? "with ground" : "without ground";
  switch (r.status) {
    case "found": return { tone: "warn", title: `Estimated admissible hv range${r.ranges.length > 1 ? "s" : ""} (${r.ranges.length}), axial restraint, ${g}, ${plural(r.scope.numSupports)} — search coverage not certified`, detail: EXPLAIN };
    case "none-found": return { tone: "warn", title: "No admissible height found in the searched domain — search coverage not certified", detail: "All converged samples exceed the allowable combined stress (or are unresolved). This does not demonstrate that no admissible hv exists." };
    case "impossible": return r.meta.impossibleReason === "lateral-offset"
      ? { tone: "warn", title: "No admissible hv: demonstrated by the lateral offset alone", detail: `hl^2 > 2 L^2 sA / E: N/A >= E hl^2/(2 L^2) already exceeds the allowable for every hv (necessary axial bound ${BOUND}).` }
      : { tone: "warn", title: "No admissible hv: demonstrated by the necessary axial bound", detail: `Ground level above Hax: every hv >= ground level violates ${BOUND}.` };
    case "incomplete": return { tone: "warn", title: "Search interrupted (resource limit) — coverage not certified", detail: r.message };
    case "undecidable": return { tone: "warn", title: "Numerically undecidable necessary bound", detail: r.message };
    case "numerical-failure": return { tone: "error", title: "Numerical failure", detail: r.message };
    case "invalid-input": return { tone: "error", title: "Invalid input", detail: r.errors.join("; ") };
    case "geometry-incompatible": return { tone: "error", title: "Geometric incompatibility", detail: r.message };
  }
}

const ORIGIN = { "axial-bound": "necessary axial bound", "ground-level": "ground level" } as const;

export function restrainedHeightRows(r: RestrainedHeightResult, fmt: (mm: number) => string, fmtS: (mpa: number) => string): [string, string][] {
  if (!("meta" in r)) return [];
  const m = r.meta, rows: [string, string][] = [["Axial mode", `restrained, ${m.groundEnabled ? "with" : "without"} ground contact`]];
  if (!("ranges" in r)) return [...rows, ["Necessary bound radicand 2L^2 sA/E - hl^2", `${m.bound.radicand.toExponential(4)} mm^2 (tolerance ${m.bound.radicandTol.toExponential(2)} mm^2)`]];
  rows.push(["Fixed length L / lateral offset hl", `${(r.scope.L / 1000).toFixed(3)} m / ${fmt(r.scope.hl)}`]);
  const bound: [string, string] = [`Hax = sqrt(2 L^2 sA / E - hl^2) (necessary: N/A >= E(hv^2+hl^2)/(2L^2); not a bending check)`, m.bound.Hax === null ? "none (radicand < 0)" : fmt(m.bound.Hax)];
  rows.push(...groundHeightRows(r, fmt, bound));
  if (m.domainOrigin) rows.splice(rows.findIndex((x) => x[0] === "Searched hv domain") + 1, 0, ["Domain bound origin", `lower: ${ORIGIN[m.domainOrigin.lower]}; upper: ${ORIGIN[m.domainOrigin.upper]}`]);
  const fc = m.finalCheck;
  rows.push(["Final check of the initial hv", fc.hv !== null ? `${fmt(fc.hv)} re-solved: admissible` : fc.attempts.length ? "no candidate confirmed" : "not performed (no admissible sample)"]);
  fc.attempts.filter((a) => a.cls !== "admissible").forEach((a) => rows.push([`Final check rejected at ${fmt(a.hv)}`, `${a.cls}${a.combinedMax !== null ? `, combined ${fmtS(a.combinedMax)}` : ""}`]));
  rows.push(["Global budget (final check included)", `${m.totalEvaluations} / ${m.budget.maxEvaluations} solves, ${Math.round(m.budget.maxMs / 1000)} s; boundary tol ${fmtSmall(r.diagnostics.boundaryTol, fmt)}`]);
  return rows;
}

export const RESTRAINED_HEIGHT_LIMITS =
  "Method: grid + adaptive refinement; every hv solved by the complete restrained solver (N and contacts recomputed). Admissible only if converged, combined criterion met and verdict not uncertain; bending-only compliance never suffices. " +
  "Combined stress is not assumed monotone, convex or symmetric in hv. Coverage between samples is estimated: never certified. The largest hv found is not a demonstrated maximum. " +
  "The represented hv is always re-solved; its verdict is independent of the estimated range. Model limits: von Karman strain (moderate rotations), linear elastic, no post-yield response.";
