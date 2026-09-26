// créé par Giovanni Malagnino, 2026-09-25 22:40 CEST (Europe/Rome, UTC+2)
// Find h with ground (V2-6): sample tests and assembly of ranges / zones.
// Stress is NOT assumed monotone or convex in hv (contact changes). An interval
// between two samples of the same verdict is accepted as covered when either
//  - an estimated Lipschitz bound (max observed slope x GH_SLOPE_SAFETY) rules
//    out a sign change inside it, or
//  - the stress is locally monotone (same slope sign on the interval and its
//    neighbours).
// Both are estimates, not proofs: features narrower than minStep cannot be
// excluded by sampling; intervals that still fail at minStep are reported as
// "narrow-feature-not-excluded" zones.

import { GroundHeightRange, HeightSample, UnresolvedZone } from "./ground-height-types";

export const known = (s: HeightSample) => s.cls === "admissible" || s.cls === "not-admissible";
const f = (s: HeightSample, sa: number) => (s.maxStress as number) - sa;
const slope = (a: HeightSample, b: HeightSample, sa: number) => (f(b, sa) - f(a, sa)) / (b.hv - a.hv);

/** Estimated slope bound (MPa/mm) from pairs no narrower than minStep (avoids mesh noise). */
export function slopeBound(s: HeightSample[], sa: number, minStep: number, safety: number): number {
  let m = 0;
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1], b = s[i];
    if (known(a) && known(b) && b.hv - a.hv >= 0.99 * minStep) m = Math.max(m, Math.abs(slope(a, b, sa)));
  }
  return safety * m;
}

/** Same-verdict interval s[i], s[i+1] covered (no hidden sign change) under the estimates. */
export function coveredSame(s: HeightSample[], i: number, sa: number, S: number): boolean {
  const a = s[i], b = s[i + 1], w = b.hv - a.hv, fa = f(a, sa), fb = f(b, sa);
  if (a.cls === "admissible" ? (fa + fb + S * w) / 2 <= 0 : (fa + fb - S * w) / 2 > 0) return true;
  const sg = Math.sign(slope(a, b, sa));
  if (sg === 0) return false;
  const nb = [i - 1, i + 1].filter((k) => k >= 0 && k + 1 < s.length && known(s[k]) && known(s[k + 1]));
  return nb.length > 0 && nb.every((k) => Math.sign(slope(s[k], s[k + 1], sa)) === sg);
}

/** Split decision for the interval s[i], s[i+1]. */
export function needsSplit(s: HeightSample[], i: number, sa: number, S: number, tol: number, minStep: number): boolean {
  const a = s[i], b = s[i + 1], w = b.hv - a.hv;
  if (w <= tol) return false;
  const ka = known(a), kb = known(b);
  if (a.cls === "failed" || b.cls === "failed") return w > minStep * 1.000001;
  if (!ka && !kb) return false; // inside an uncertain band
  if (!ka || !kb || a.cls !== b.cls) return true; // locate the boundary / band edge
  if (w <= minStep * 1.000001) return false;
  return !coveredSame(s, i, sa, S);
}

/** Zones and ranges from the final sorted samples. */
/** dom = true domain bounds: domainEdge only when a range end IS a domain bound
 *  (first/last sample are not domain bounds after an interruption). */
export function assemble(s: HeightSample[], sa: number, S: number, minStep: number, pending: [number, number][], dom?: [number, number]) {
  const isLo = (v: number) => (dom ? v === dom[0] : true), isHi = (v: number) => (dom ? v === dom[1] : true);
  const zones: UnresolvedZone[] = [];
  const flagged = new Set<number>(); // pair index i -> (i, i+1) not covered
  for (let i = 0; i + 1 < s.length; i++) {
    const a = s[i], b = s[i + 1], w = b.hv - a.hv;
    if (known(a) && known(b) && a.cls === b.cls && w > 0.49 * minStep && !coveredSame(s, i, sa, S)) {
      flagged.add(i);
      zones.push({ from: a.hv, to: b.hv, reason: "narrow-feature-not-excluded" });
    }
  }
  // Runs of uncertain / failed samples, bounded by their neighbours.
  for (let i = 0; i < s.length; ) {
    if (known(s[i])) { i++; continue; }
    let j = i;
    while (j + 1 < s.length && !known(s[j + 1])) j++;
    const L = s[i - 1], R = s[j + 1], run = s.slice(i, j + 1);
    const reason = run.some((x) => x.cls === "failed") ? "solver-failure"
      : "uncertain-verdict"; // never a transition bracket

    const causes = [...new Set(run.flatMap((x) => (x.cls === "failed" && x.cause ? [x.cause] : [])))];
    zones.push({ from: L ? L.hv : s[i].hv, to: R ? R.hv : s[j].hv, reason, ...(reason === "solver-failure" ? { causes } : {}) });
    i = j + 1;
  }
  // Transition brackets: adjacent decidable admissible / not-admissible pairs.
  for (let i = 0; i + 1 < s.length; i++) {
    const a = s[i], b = s[i + 1];
    if (known(a) && known(b) && a.cls !== b.cls) zones.push({ from: a.hv, to: b.hv, reason: "transition-bracket" });
  }
  for (const [a, b] of pending) zones.push({ from: a, to: b, reason: "budget" });
  zones.sort((x, y) => x.from - y.from);
  // Merge contiguous zones with the same reason (display only).
  for (let k = zones.length - 1; k > 0; k--) {
    if (zones[k].reason === zones[k - 1].reason && zones[k].from <= zones[k - 1].to) {
      zones[k - 1].to = Math.max(zones[k - 1].to, zones[k].to);
      if (zones[k].causes) zones[k - 1].causes = [...new Set([...(zones[k - 1].causes ?? []), ...zones[k].causes])];
      zones.splice(k, 1);
    }
  }

  const ranges: GroundHeightRange[] = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i].cls !== "admissible") continue;
    let j = i;
    while (j + 1 < s.length && s[j + 1].cls === "admissible" && !flagged.has(j) && !pending.some(([a]) => a === s[j].hv)) j++;
    ranges.push({
      lower: { value: s[i].hv, included: true, bracket: i > 0 ? s[i - 1].hv : null, domainEdge: i === 0 && isLo(s[i].hv) },
      upper: { value: s[j].hv, included: true, bracket: j + 1 < s.length ? s[j + 1].hv : null, domainEdge: j === s.length - 1 && isHi(s[j].hv) },
    });
    i = j;
  }
  return { zones, ranges };
}

/** Zones that leave admissibility unresolved (transition brackets are not). */
export const openZones = (z: UnresolvedZone[]) => z.filter((x) => x.reason !== "transition-bracket");
