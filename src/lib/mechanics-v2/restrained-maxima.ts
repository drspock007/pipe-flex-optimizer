// créé par Giovanni Malagnino, 2026-09-26 14:30 CEST (Europe/Rome, UTC+2)
// Maxima of the discrete restrained fields (independent of chart samples).
// Per element Mv(u), Ml(u) are cubics (momentCoeffsN); |M|^2 has degree 6, so
// it is sampled at RESTRAINED_MAX_SAMPLES + 1 points and every local sample
// maximum is refined by golden-section search on its two neighbouring cells.

import { hermiteAt, momentCoeffsN, poly } from "./restrained-element";
import { RESTRAINED_MAX_SAMPLES } from "./restrained-types";

export interface ElementFields { l: number; x0: number; dz: number[]; dy: number[]; av: number[]; al: number[] }

export interface FieldMax { x: number; Mv: number; Ml: number; Mres: number; MvAbs: number; slope: number }

export function fieldMaxima(els: ElementFields[], N: number, q: number): FieldMax {
  const best: FieldMax = { x: 0, Mv: 0, Ml: 0, Mres: -1, MvAbs: 0, slope: 0 };
  const S = RESTRAINED_MAX_SAMPLES;
  for (const e of els) {
    const cv = momentCoeffsN(e.l, N, q, e.dz, e.av[0], e.av[1]);
    const cl = momentCoeffsN(e.l, N, 0, e.dy, e.al[0], e.al[1]);
    const f = (u: number) => Math.hypot(poly(cv, u), poly(cl, u));
    const vals = Array.from({ length: S + 1 }, (_, k) => f(k / S));
    for (let k = 0; k <= S; k++) {
      const u = k / S;
      best.MvAbs = Math.max(best.MvAbs, Math.abs(poly(cv, u)));
      best.slope = Math.max(best.slope, Math.hypot(hermiteAt(e.l, e.dz, u).slope, hermiteAt(e.l, e.dy, u).slope));
      if ((k > 0 && vals[k] < vals[k - 1]) || (k < S && vals[k] < vals[k + 1])) continue;
      let a = Math.max(0, (k - 1) / S), b = Math.min(1, (k + 1) / S);
      const g = (Math.sqrt(5) - 1) / 2;
      for (let it = 0; it < 60; it++) {
        const c1 = b - g * (b - a), c2 = a + g * (b - a);
        if (f(c1) >= f(c2)) b = c2; else a = c1;
      }
      const cand = [u, 0.5 * (a + b)];
      for (const uu of cand) {
        const v = f(uu);
        if (v > best.Mres) Object.assign(best, { x: e.x0 + uu * e.l, Mv: poly(cv, uu), Ml: poly(cl, uu), Mres: v });
        best.MvAbs = Math.max(best.MvAbs, Math.abs(poly(cv, uu)));
      }
    }
  }
  return best;
}
