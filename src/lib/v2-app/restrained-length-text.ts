// créé par Giovanni Malagnino, 2026-09-26 17:55 CEST (Europe/Rome, UTC+2)
// User-facing wording of Find L with axial restraint (V2-11), screen and PDF.
// Conclusions hold within the searched length domain; coverage never certified;
// impossibility only when the necessary axial condition excludes the whole domain.

import { RestrainedLengthResult } from "@/lib/mechanics-v2";
import type { StatusText } from "./status-text";
import { describeGroundLength, groundLengthRows } from "./ground-length-text";

const BOUND = "L >= Lax = hypot(hv, hl) sqrt(E / (2 sA))";
export const RL_BEST_LABEL = "Lowest computed combined stress among verified samples";

export function describeRestrainedLength(r: RestrainedLengthResult): StatusText {
  const g = "meta" in r && r.meta.groundEnabled ? "with ground" : "without ground";
  switch (r.status) {
    case "found": return { ...describeGroundLength(r), title: `Estimated admissible L range${r.ranges.length > 1 ? "s" : ""} (${r.ranges.length}), axial restraint, ${g}, within the searched length domain — search coverage not certified` };
    case "none-found": return { tone: "warn", title: "No admissible length found within the searched domain (axial restraint) — search coverage not certified", detail: "All converged samples exceed the allowable combined stress or are unresolved. This does not demonstrate that no admissible L exists, neither inside nor outside the searched domain." };
    case "impossible": return { tone: "warn", title: "No admissible L in the searched domain: demonstrated by the necessary axial condition", detail: `${BOUND} exceeds the search maximum length (necessary condition only; outside the domain nothing is concluded).` };
    case "undecidable": return { tone: "warn", title: "Numerically undecidable necessary bound", detail: r.message };
    case "numerical-failure": return { tone: "error", title: "Numerical failure", detail: r.message };
    default: return describeGroundLength(r);
  }
}

export function restrainedLengthRows(r: RestrainedLengthResult, fmt: (mm: number) => string, fmtS: (mpa: number) => string): [string, string][] {
  if (!("meta" in r)) return [];
  const m = r.meta, rows: [string, string][] = [["Axial mode", `restrained, ${m.groundEnabled ? "with" : "without"} ground contact`]];
  rows.push(["Requested length domain (exploration, not a mechanical bound)", `[${fmt(m.requested.lower)} ; ${fmt(m.requested.upper)}]`]);
  rows.push([`Lax = hypot(hv, hl) sqrt(E/(2 sA)) (necessary: N/A >= E(hv^2+hl^2)/(2L^2); not a bending check)`, m.bound.Lax > 0 ? fmt(m.bound.Lax) : "0 (hv = hl = 0: no exclusion)"]);
  rows.push(["Excluded by the necessary condition", m.excluded ? `[${fmt(m.excluded.lower)} ; ${fmt(m.excluded.upper)}${r.status === "impossible" ? "] (whole domain)" : ")"}` : "none"]);
  rows.push(["Sampled length domain", m.sampled ? `[${fmt(m.sampled.lower)} ; ${fmt(m.sampled.upper)}]` : "none"]);
  if (!("ranges" in r)) return rows;
  rows.push(...groundLengthRows(r, fmt, fmtS).filter(([k]) => !k.startsWith("Searched length domain") && !k.startsWith("Lowest computed stress")));
  rows.push([RL_BEST_LABEL, r.lowestStress ? `${fmtS(r.lowestStress.maxStress as number)} at ${fmt(r.lowestStress.L)} (not a global optimum)` : "none"]);
  const fc = m.finalCheck;
  rows.push(["Final check of the initial L", fc.L !== null ? `${fmt(fc.L)} re-solved: admissible` : fc.attempts.length ? "no candidate confirmed" : "not performed (no admissible sample or budget)"]);
  fc.attempts.filter((a) => a.cls !== "admissible").forEach((a) => rows.push([`Final check rejected at ${fmt(a.L)}`, `${a.cls}${a.combinedMax !== null ? `, combined ${fmtS(a.combinedMax)}` : ""}`]));
  rows.push(["Global budget (final check included)", `${m.totalEvaluations} / ${m.budget.maxEvaluations} solves, ${Math.round(m.budget.maxMs / 1000)} s`]);
  return rows;
}

export const RESTRAINED_LENGTH_LIMITS =
  "Method: grid in ln L + adaptive refinement; every L is a new initially straight pipe (no prestress, axial end separation blocked) solved by the complete restrained solver (N, deflection and contacts recomputed; q fixed, total weight qL). " +
  "Admissible only if converged, combined criterion met and verdict not uncertain; bending-only compliance never suffices. Combined stress is not assumed monotone or convex in L. " +
  "Coverage between samples is estimated: never certified. Conclusions hold only within the searched length domain; an admissible sample at a domain edge does not end the range; a first admissible sample next to an unresolved zone is not a mechanical boundary. " +
  "The represented L is always re-solved. Model limits: von Karman strain (moderate rotations), linear elastic, no post-yield response.";
