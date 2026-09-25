// créé par Giovanni Malagnino, 2026-09-25 01:04 CEST (Europe/Rome, UTC+2)
// General admissible-length search: regime traversal + convex search per regime.
// Ranges are merged only across an exactly shared breakpoint admissible on both
// sides. Any numerical failure is reported as such, never as "no solution".

import { validateInput } from "./validate";
import { LengthSearchInput } from "./length-search-types";
import { normalizedData } from "./regime-coeffs";
import { isAmbiguous, loadLengthScale, physicalSlope } from "./regime";
import { walkRegimes } from "./regime-walk";
import { regimeMoments, regimeSigmaMax } from "./regime-stress";
import { RegimeMin, searchRegime } from "./window-search";
import { EvaluatedCount, GeneralFixedResult, GeneralInfimum, GeneralMinResult, GeneralRange, RegimeSummary } from "./general-search-types";
import { MAX_SUPPORTS } from "./types";

const lb = (b: { value: number | null; included: boolean; kind: "finite" | "zero-excluded" | "unbounded" }) =>
  ({ value: b.value, included: b.included, kind: b.kind });

function merge(ranges: GeneralRange[]): GeneralRange[] {
  const out: GeneralRange[] = [];
  for (const r of ranges) {
    const p = out[out.length - 1];
    if (p && p.upper.kind === "finite" && r.lower.kind === "finite" && p.upper.value === r.lower.value) p.upper = r.upper;
    else out.push({ ...r });
  }
  return out;
}

function infimum(mins: RegimeMin[]): GeneralInfimum {
  if (mins.every((m) => m.approachedAs === "everywhere")) return { sigma: 0, attained: true, approachedAs: "everywhere", locations: [] };
  const g = Math.min(...mins.map((m) => m.sigma));
  const best = mins.filter((m) => m.sigma === g);
  const at = best.filter((m) => m.attained && m.L !== null);
  if (at.length) return { sigma: g, attained: true, approachedAs: "attained", locations: [...new Set(at.map((m) => m.L!))] };
  return { sigma: g, attained: false, approachedAs: best[0].approachedAs, locations: [] };
}

export function searchLengthGeneral(input: LengthSearchInput, numSupports: number): GeneralFixedResult {
  const errors = validateInput({ ...input, L: 1, numSupports });
  if (errors.length) return { status: "invalid-input", errors };
  if (input.axialMode === "restrained") return { status: "not-implemented", message: 'axialMode "restrained" is not implemented' };
  const scope = { numSupports };
  try {
    const Lq = loadLengthScale(input.E, input.I, input.q);
    const nd = normalizedData(numSupports);
    const walk = walkRegimes(nd, input.hv, input.q, Lq, physicalSlope(input.q, input.E, input.I));
    const ranges: GeneralRange[] = [], mins: RegimeMin[] = [], regimes: RegimeSummary[] = [];
    for (const r of walk.regimes) {
      const cs = r.coeffs.constraints;
      if (isAmbiguous(cs, { status: "interval", lower: r.lower, upper: r.upper })) {
        throw new RangeError(`Sign ambiguity decides regime [${r.active.map((i) => i + 1)}]`);
      }
      const polys = regimeMoments(input, numSupports, r.active, r.coeffs.gamma, r.coeffs.delta);
      const A = Math.max(0, ...polys.flatMap((p) => [...p.av, ...p.al].map(Math.abs)));
      const B = Math.max(0, ...polys.flatMap((p) => p.bv.map(Math.abs)));
      const res = searchRegime({
        sigma: (L) => regimeSigmaMax(polys, L, input.c, input.I), lower: r.lower, upper: r.upper,
        aZero: A === 0, bZero: B === 0, seed: A > 0 && B > 0 ? (Math.log(A) - Math.log(B)) / 4 : 0,
        sAllow: input.sigmaAllow,
      });
      ranges.push(...res.ranges);
      mins.push(res.min);
      regimes.push({ activeSet: r.active.map((i) => i + 1), lower: lb(r.lower), upper: lb(r.upper), upperEvents: r.upper.events, minSigma: res.min.sigma });
    }
    if (walk.status === "incomplete") {
      return { status: "incomplete", scope, message: walk.message, partialRanges: merge(ranges), regimes };
    }
    return { status: "ok", scope, complete: true, ranges: merge(ranges), infimum: infimum(mins), regimes, physicalValidity: "not-assessed" };
  } catch (e) {
    return { status: "numerical-failure", message: (e as Error).message };
  }
}

/** Smallest installed candidate-support count in [0, maxSupports] with an admissible range. */
export function searchMinSupportsGeneral(input: LengthSearchInput, maxSupports: number): GeneralMinResult {
  if (!Number.isInteger(maxSupports) || maxSupports < 0 || maxSupports > MAX_SUPPORTS) {
    return { status: "invalid-input", errors: [`maxSupports must be an integer in [0, ${MAX_SUPPORTS}]`] };
  }
  const evaluated: EvaluatedCount[] = [];
  for (let n = 0; n <= maxSupports; n++) {
    const r = searchLengthGeneral(input, n);
    if (r.status === "invalid-input" || r.status === "not-implemented") return r;
    if (r.status === "ok" && r.ranges.length) {
      evaluated.push({ numSupports: n, status: "admissible" });
      const failed = evaluated.some((e) => e.status === "incomplete" || e.status === "numerical-failure");
      if (!failed) return { status: "found", minimalityCertified: true, numSupports: n, result: r, evaluated };
      return { status: "incomplete", maxSupports, message: "A lower support count failed: minimality not certified", candidate: { numSupports: n, result: r }, evaluated };
    }
    evaluated.push(r.status === "ok" ? { numSupports: n, status: "no-range" } : { numSupports: n, status: r.status, message: r.message });
  }
  if (evaluated.some((e) => e.status !== "no-range")) {
    return { status: "incomplete", maxSupports, message: "Some support counts failed: absence of solution not demonstrated", candidate: null, evaluated };
  }
  return { status: "no-solution-in-scope", maxSupports, evaluated };
}
