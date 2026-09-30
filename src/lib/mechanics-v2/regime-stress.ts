// créé par Giovanni Malagnino, 2026-09-25 01:04 CEST (Europe/Rome, UTC+2)
// Regime moments by superposition. In a fixed regime, per member and local
// coordinate u in [0,1]:  Mv = av(u)/L^2 + bv(u) L^2,  Ml = al(u)/L^2, with
//   av = EI * (moment of the normalized offset solve with rho = gamma)   (N mm^3)
//   bv = q  * (moment of the normalized unit-load solve with rho = delta) (N / mm)
//   al = 6 EI hl (1 - 2x/L)                                             (N mm^3)
// ||M||^2 = ||a||^2/T + 2 a.b + ||b||^2 T is convex in T = L^4 for every u,
// hence the spatial maximum is convex in T. The maximum is found exactly per
// member (ends + roots of the stationarity cubic), never from plot points.

import { buildVerticalSystem, solveDisplacements } from "./vertical-system";
import { memberEndActions } from "./beam-member";
import { polyMaxResultant } from "./biaxial";

export interface MemberPoly { av: number[]; bv: number[]; al: number[] }
export interface StressData { E: number; I: number; c: number; q: number; hv: number; hl: number }

export function regimeMoments(d: StressData, n: number, active: number[], gamma: number[], delta: number[]): MemberPoly[] {
  const EI = d.E * d.I;
  if (!Number.isFinite(EI)) throw new RangeError("EI overflow");
  const forces = (vals: number[]) => {
    const r = new Array<number>(n).fill(0);
    active.forEach((i, k) => (r[i] = vals[k]));
    return r;
  };
  const sH = buildVerticalSystem(1, d.hv, 1, 0, n);
  const dH = solveDisplacements(sH, forces(gamma));
  const sB = buildVerticalSystem(1, 0, 1, 1, n);
  const dB = solveDisplacements(sB, forces(delta));
  const polys = Array.from({ length: n + 1 }, (_, e) => {
    const x0 = sH.nodesX[e];
    const l = sH.nodesX[e + 1] - x0;
    const [FiH, CiH] = memberEndActions(1, 0, l, dH.slice(2 * e, 2 * e + 4));
    const [FiB, CiB] = memberEndActions(1, 1, l, dB.slice(2 * e, 2 * e + 4));
    return {
      av: [-CiH * EI, FiH * l * EI, 0],
      bv: [-CiB * d.q, FiB * l * d.q, ((-l * l) / 2) * d.q],
      al: [6 * EI * d.hl * (1 - 2 * x0), -12 * EI * d.hl * l],
    };
  });
  if (!polys.every((p) => [...p.av, ...p.bv, ...p.al].every(Number.isFinite))) {
    throw new RangeError("Non-finite regime moment coefficient");
  }
  return polys;
}

/** Exact maximum bending stress (MPa) of the regime at length L. */
export function regimeSigmaMax(polys: MemberPoly[], L: number, c: number, I: number): number {
  const s = L * L;
  let best = 0;
  for (const p of polys) {
    const mv = p.av.map((v, k) => v / s + p.bv[k] * s);
    const ml = p.al.map((v) => v / s);
    if (!mv.every(Number.isFinite) || !ml.every(Number.isFinite)) {
      throw new RangeError(`Non-representable moments at L=${L}`);
    }
    best = Math.max(best, polyMaxResultant(mv, ml).Mres);
  }
  const sigma = (best / I) * c;
  if (!Number.isFinite(sigma)) throw new RangeError(`Non-representable stress at L=${L}`);
  return sigma;
}
