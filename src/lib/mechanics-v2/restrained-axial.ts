// créé par Giovanni Malagnino, 2026-09-26 14:30 CEST (Europe/Rome, UTC+2)
// Coupled axial compatibility + deflection + contact (V2-9), solved jointly.
// Method (documented): convex duality of the reduced energy
//   Pi(d) = 1/2 d'Kd + EA/(8L) (d'Gd)^2 - F'd,  with unilateral constraints.
// Using EA/(8L) S^2 = max_{N>=0} [N S/2 - L N^2/(2EA)], the discrete minimizer
// is the saddle point of a function concave in N. Its derivative in N is
// S(d(N))/2 - L N/EA, where d(N) solves the LINEAR contact problem with
// K + N G. Hence h(N) = N - EA/(2L) S(d(N)) is continuous and non-decreasing,
// h(0) <= 0 and h(EA S(0)/(2L)) >= 0: the unique root is bracketed and found
// by safeguarded regula falsi (Illinois). N >= 0 holds by construction.
// At the root, N = EA/(2L) int (z'^2 + y'^2) dx exactly for the discrete field.

import { PlaneState, RMesh, solvePlane, solveVertical } from "./restrained-state";
import { slopeSquared } from "./restrained-element";

/** Relative tolerance on the compatibility residual |N - EA S/(2L)| (dimensionless, times EA S(0)/(2L)). */
export const AXIAL_COMPAT_REL = 1e-10;
export const AXIAL_MAX_ITER = 200;

export interface AxialOutcome {
  ok: boolean; message: string;
  N: number; S: number; compat: number; tolN: number; iterations: number; contactIterations: number;
  vert: PlaneState; lat: PlaneState; active: boolean[];
}

const slopes = (m: RMesh, d: number[]) => {
  let s = 0;
  for (let e = 0; e < m.x.length - 1; e++) s += slopeSquared(m.x[e + 1] - m.x[e], d.slice(2 * e, 2 * e + 4));
  return s;
};

export function solveAxial(m: RMesh, EA: number, init: boolean[], tolDisp: number, tolForce: number): AxialOutcome {
  const c = EA / (2 * m.L), noFix = m.x.map(() => false);
  let active = init.slice(), contactIterations = 0, iterations = 0;
  let contactFail = false;
  const ev = (N: number) => {
    iterations++;
    const v = solveVertical(m, N, active, tolDisp, tolForce, 50 + 4 * m.x.length);
    contactIterations += v.iterations;
    if (!v.converged) contactFail = true;
    active = v.active;
    const lat = solvePlane(m, N, 0, m.hl, noFix);
    const S = slopes(m, v.state.d) + slopes(m, lat.d);
    return { N, S, h: N - c * S, vert: v.state, lat, active: v.active.slice() };
  };
  const done = (e: ReturnType<typeof ev>, ok: boolean, message: string, tolN: number): AxialOutcome =>
    ({ ok: ok && !contactFail, message: contactFail ? "Vertical contact active set did not converge" : message, N: e.N, S: e.S, compat: Math.abs(e.h), tolN, iterations, contactIterations, vert: e.vert, lat: e.lat, active: e.active });

  const lo0 = ev(0);
  if (contactFail) return done(lo0, false, "", 0);
  if (!(lo0.S > 0)) return done(lo0, Number.isFinite(lo0.S), "no slope: N = 0", 0);
  const Nhi = c * lo0.S;
  const tolN = AXIAL_COMPAT_REL * Nhi;
  if (!Number.isFinite(Nhi)) return done(lo0, false, "Non-finite axial bracket", tolN);
  let lo = lo0, hi = ev(Nhi), side = 0;
  if (Math.abs(hi.h) <= tolN) return done(hi, true, "converged", tolN);
  if (hi.h < 0) return done(hi, false, "Axial bracket not established (h(N_hi) < 0)", tolN);
  while (iterations < AXIAL_MAX_ITER && !contactFail) {
    let N = (lo.N * hi.h - hi.N * lo.h) / (hi.h - lo.h);
    if (!(N > lo.N && N < hi.N)) N = 0.5 * (lo.N + hi.N);
    const mid = ev(N);
    if (Math.abs(mid.h) <= tolN) return done(mid, true, "converged", tolN);
    if (mid.h < 0) { lo = mid; if (side === -1) hi = { ...hi, h: hi.h / 2 }; side = -1; }
    else { hi = mid; if (side === 1) lo = { ...lo, h: lo.h / 2 }; side = 1; }
    if (hi.N - lo.N <= 1e-15 * Nhi) return done(mid, false, "Axial bracket collapsed without meeting the compatibility tolerance", tolN);
  }
  return done(hi, false, `Axial compatibility not converged within ${AXIAL_MAX_ITER} evaluations`, tolN);
}
