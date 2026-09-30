// créé par Giovanni Malagnino, 2026-09-26 14:30 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-26 15:20 CEST: exhaustive extrema (V2-9-R1).
// Exact maxima of the discrete restrained fields, independent of any chart
// resolution. Per element, Mv(u), Ml(u) are the cubics of momentCoeffsN
// (moment reconstructed from the element equilibrium M'' = N w'' - q):
//  - max hypot(Mv, Ml): endpoints + all real roots of Mv Mv' + Ml Ml' (deg <= 5);
//  - max |Mv|: endpoints + roots of Mv' (deg <= 2);
//  - max hypot(z', y'): endpoints + roots of z'z'' + y'y'' (deg <= 3);
//  - min z (Hermite cubic): endpoints + roots of z' (deg <= 2).

import { hermiteCoeffs, momentCoeffsN } from "./restrained-element";
import { extremaCandidates, polyAdd, polyDeriv, polyEval, polyMul } from "./poly-roots";

export interface ElementFields { l: number; x0: number; dz: number[]; dy: number[]; av: number[]; al: number[] }

export interface FieldMax { x: number; Mv: number; Ml: number; Mres: number; MvAbs: number; slope: number }

/** Exact minimum of the Hermite cubic w(u) over the element (same field as charts and compatibility). */
export function hermiteMin(l: number, de: ArrayLike<number>): number {
  const w = hermiteCoeffs(l, de);
  return Math.min(...extremaCandidates(w).map((u) => polyEval(w, u)));
}

export function fieldMaxima(els: ElementFields[], N: number, q: number): FieldMax {
  const best: FieldMax = { x: 0, Mv: 0, Ml: 0, Mres: -1, MvAbs: 0, slope: 0 };
  for (const e of els) {
    const cv = momentCoeffsN(e.l, N, q, e.dz, e.av[0], e.av[1]);
    const cl = momentCoeffsN(e.l, N, 0, e.dy, e.al[0], e.al[1]);
    // d/du (Mv^2 + Ml^2)/2 = Mv Mv' + Ml Ml' ; extremaCandidates differentiates once.
    const m2 = polyAdd(polyMul(cv, cv), polyMul(cl, cl));
    for (const u of extremaCandidates(m2)) {
      const Mv = polyEval(cv, u), Ml = polyEval(cl, u), v = Math.hypot(Mv, Ml);
      if (v > best.Mres) Object.assign(best, { x: e.x0 + u * e.l, Mv, Ml, Mres: v });
    }
    for (const u of extremaCandidates(cv)) best.MvAbs = Math.max(best.MvAbs, Math.abs(polyEval(cv, u)));
    // Slopes dw/dx = (dw/du)/l, quadratics in u.
    const sz = polyDeriv(hermiteCoeffs(e.l, e.dz)).map((v) => v / e.l);
    const sy = polyDeriv(hermiteCoeffs(e.l, e.dy)).map((v) => v / e.l);
    const s2 = polyAdd(polyMul(sz, sz), polyMul(sy, sy));
    for (const u of extremaCandidates(s2)) best.slope = Math.max(best.slope, Math.sqrt(Math.max(0, polyEval(s2, u))));
  }
  return best;
}
