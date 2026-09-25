// créé par Giovanni Malagnino, 2026-09-25 17:40 CEST (Europe/Rome, UTC+2)
// Strict publication rule: a published hv bound must also satisfy the criterion
// in the reference fixed-length solver (solveBiaxialFixedLength). The regime
// superposition and the solver differ only by rounding; when the solver finds a
// bound above sigmaAllow, the bound is moved inward by bisection on the solver
// criterion (never outward). A range whose every tested point fails is dropped.

import { solveBiaxialFixedLength } from "./solve";
import { BiaxialInput } from "./types";
import { HeightRange, HeightSearchInput } from "./height-search-types";

const MAX_IT = 80;

export function tightenWithSolver(input: HeightSearchInput, n: number, ranges: HeightRange[]): HeightRange[] {
  const ok = (hv: number) => {
    const r = solveBiaxialFixedLength({ ...input, hv, numSupports: n } as BiaxialInput);
    if (r.status !== "ok") throw new RangeError(`Reference solver failed at hv=${hv}: ${r.status}`);
    return r.maxStress <= input.sigmaAllow;
  };
  const out: HeightRange[] = [];
  for (const r of ranges) {
    const lo = r.lower.value, hi = r.upper.value, mid = 0.5 * (lo + hi);
    const inward = (bound: number): number | null => {
      if (ok(bound)) return bound;
      if (!ok(mid)) return null;
      let outP = bound, inP = mid;
      for (let k = 0; k < MAX_IT; k++) {
        const m = 0.5 * (outP + inP);
        if (m === outP || m === inP) break;
        if (ok(m)) inP = m; else outP = m;
      }
      return inP;
    };
    const L = inward(lo), U = lo === hi ? L : inward(hi);
    if (L === null || U === null) continue;
    out.push({ lower: { value: L, included: true }, upper: { value: U, included: true } });
  }
  return out;
}
