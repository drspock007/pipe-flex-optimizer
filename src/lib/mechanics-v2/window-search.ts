// créé par Giovanni Malagnino, 2026-09-25 01:04 CEST (Europe/Rome, UTC+2)
// Admissible ranges inside one regime. sigma(L) is convex in T = L^4, hence
// unimodal in t = ln L. Minimum: bracketed golden-section search in t (stop when
// the bracket is below GOLD_TOL in t, i.e. relative in L, or MAX_IT). Crossings
// with sigmaAllow: bisection in t kept on the admissible side (sigma <= s), stop
// at BISECT_TOL, so tolerances never widen the admissible set. Unbounded sides
// are bracketed by doubling steps in t; leaving the representable range of
// lengths raises an explicit error (no arbitrary length cap).

import { LengthBound } from "./length-search-types";
import { TANGENCY_REL_TOL } from "./length-search";
import { RegimeBound } from "./regime-types";

const GOLD_TOL = 1e-12, BISECT_TOL = 1e-14, MAX_IT = 400, T_LIMIT = 700;
const PHI = (Math.sqrt(5) - 1) / 2;

export interface RegimeMin {
  sigma: number;
  L: number | null;
  attained: boolean;
  approachedAs: "attained" | "L-to-zero" | "L-to-infinity" | "everywhere";
}
export interface LengthRange { lower: LengthBound; upper: LengthBound }
export interface RegimeWindowInput {
  sigma: (L: number) => number;
  lower: RegimeBound; upper: RegimeBound;
  aZero: boolean; bZero: boolean; seed: number; sAllow: number;
}

const fin = (v: number): LengthBound => ({ value: v, included: true, kind: "finite" });

export function searchRegime(w: RegimeWindowInput): { ranges: LengthRange[]; min: RegimeMin } {
  const s = w.sAllow;
  const f = (t: number) => {
    if (Math.abs(t) > T_LIMIT) throw new RangeError("Search left the representable range of lengths");
    return w.sigma(Math.exp(t));
  };
  const tlo = w.lower.kind === "finite" ? Math.log(w.lower.value!) : -Infinity;
  const thi = w.upper.kind === "finite" ? Math.log(w.upper.value!) : Infinity;
  const LB: LengthBound = w.lower.kind === "finite" ? fin(w.lower.value!) : { value: null, included: false, kind: "zero-excluded" };
  const UB: LengthBound = w.upper.kind === "finite" ? fin(w.upper.value!) : { value: null, included: false, kind: "unbounded" };
  const fEnd = (lowerEnd: boolean) => w.sigma((lowerEnd ? w.lower : w.upper).value!);
  if (w.aZero && w.bZero) return { ranges: [{ lower: LB, upper: UB }], min: { sigma: 0, L: null, attained: true, approachedAs: "everywhere" } };

  // Walk from t0 in direction dir while cond(f) holds; returns [last true, first false].
  const march = (t0: number, dir: number, cond: (v: number) => boolean): [number, number] => {
    let prev = t0, h = 1;
    for (let k = 0; k < MAX_IT; k++, h *= 2) {
      const t = t0 + dir * h;
      if (!cond(f(t))) return [prev, t];
      prev = t;
    }
    throw new RangeError("Bracketing did not terminate");
  };

  let tmin: number, fmin: number, min: RegimeMin;
  if (w.bZero || w.aZero) {
    // Monotone: decreasing in L when bZero, increasing when aZero.
    const end = w.bZero ? thi : tlo;
    if (Number.isFinite(end)) { tmin = end; fmin = fEnd(!w.bZero); min = { sigma: fmin, L: Math.exp(end), attained: true, approachedAs: "attained" }; if (w.bZero) min.L = w.upper.value; else min.L = w.lower.value; }
    else { tmin = end; fmin = 0; min = { sigma: 0, L: null, attained: false, approachedAs: w.bZero ? "L-to-infinity" : "L-to-zero" }; }
  } else {
    let x1: number, x2: number;
    if (Number.isFinite(tlo) && Number.isFinite(thi)) [x1, x2] = [tlo, thi];
    else {
      const t0 = Number.isFinite(tlo) ? tlo : Number.isFinite(thi) ? thi : w.seed;
      const f0 = f(t0);
      const up = Number.isFinite(thi) ? false : f(t0 + 1) < f0;
      const dn = !up && !Number.isFinite(tlo) && f(t0 - 1) < f0;
      if (!up && !dn) [x1, x2] = [Number.isFinite(tlo) ? tlo : t0 - 1, Number.isFinite(thi) ? thi : t0 + 1];
      else {
        const dir = up ? 1 : -1;
        let last = t0, fl = f0, h = 1, before = t0;
        for (let k = 0; ; k++, h *= 2) {
          if (k > MAX_IT) throw new RangeError("Minimum bracketing did not terminate");
          const t = Math.max(tlo, Math.min(thi, t0 + dir * h));
          const ft = f(t);
          if (ft >= fl || t === tlo || t === thi) { [x1, x2] = [Math.min(before, t), Math.max(before, t)]; break; }
          before = last; last = t; fl = ft;
        }
      }
    }
    let a = x1, b = x2, c = b - PHI * (b - a), d = a + PHI * (b - a), fc = f(c), fd = f(d);
    for (let k = 0; k < MAX_IT && b - a > GOLD_TOL * Math.max(1, Math.abs(a)); k++) {
      if (fc <= fd) { b = d; d = c; fd = fc; c = b - PHI * (b - a); fc = f(c); }
      else { a = c; c = d; fc = fd; d = a + PHI * (b - a); fd = f(d); }
    }
    const cands: [number, number][] = [[c, fc], [d, fd], [x1, x1 === tlo ? fEnd(true) : f(x1)], [x2, x2 === thi ? fEnd(false) : f(x2)]];
    [tmin, fmin] = cands.reduce((m, p) => (p[1] < m[1] ? p : m));
    const Lm = tmin === tlo ? w.lower.value! : tmin === thi ? w.upper.value! : Math.exp(tmin);
    min = { sigma: fmin, L: Lm, attained: true, approachedAs: "attained" };
  }

  if (fmin > s) {
    const tangent = min.attained && fmin - s <= TANGENCY_REL_TOL * s;
    return { ranges: tangent ? [{ lower: fin(min.L!), upper: fin(min.L!) }] : [], min };
  }
  // Finite admissible interior point.
  let tin = tmin;
  if (!Number.isFinite(tin)) {
    const start = Number.isFinite(tlo) ? tlo : Number.isFinite(thi) ? thi : w.seed;
    tin = f(start) <= s ? start : march(start, w.bZero ? 1 : -1, (v) => v > s)[1];
  }
  const bisect = (tout: number, t: number) => {
    for (let k = 0; k < MAX_IT && Math.abs(t - tout) > BISECT_TOL * Math.max(1, Math.abs(t)); k++) {
      const m = 0.5 * (t + tout);
      if (f(m) <= s) t = m; else tout = m;
    }
    return fin(Math.exp(t));
  };
  const side = (lowerEnd: boolean): LengthBound => {
    const tEnd = lowerEnd ? tlo : thi;
    if (Number.isFinite(tEnd)) {
      if (fEnd(lowerEnd) <= s) return lowerEnd ? LB : UB;
      return bisect(tEnd, tin);
    }
    if (lowerEnd ? w.aZero : w.bZero) return lowerEnd ? LB : UB;
    const [inside, out] = march(tin, lowerEnd ? -1 : 1, (v) => v <= s);
    return bisect(out, inside);
  };
  return { ranges: [{ lower: side(true), upper: side(false) }], min };
}
