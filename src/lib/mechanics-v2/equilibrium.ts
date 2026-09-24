// créé par Giovanni Malagnino, 2026-09-24 03:33 CEST (Europe/Rome, UTC+2)
// Unit-consistent equilibrium residuals and their validator.
// Scales: forceScale F0 (N) = max(qL, 12 EI |h|/L^3, 1e-6); momentScale = F0 * L (N*mm).
// Tolerances are 1e-7 of the matching scale.

import { EquilibriumSet } from "./types";
import { VerticalSystem } from "./vertical-system";

export const EQUILIBRIUM_REL_TOL = 1e-7;

export function equilibriumResiduals(
  sys: VerticalSystem, Rall: number[], R: number[], q: number, L: number,
): EquilibriumSet {
  let translation = 0;
  let rotation = 0;
  sys.free.forEach((dof, k) => {
    // Free index 2s is the translation of support s+1, 2s+1 its rotation.
    if (k % 2 === 0) translation = Math.max(translation, Math.abs(Rall[dof] - R[k / 2]));
    else rotation = Math.max(rotation, Math.abs(Rall[dof]));
  });
  const last = sys.nodesX.length - 1;
  let sumF = Rall[0] + Rall[2 * last];
  let sumM = Rall[1] + Rall[2 * last + 1] + Rall[2 * last] * sys.nodesX[last];
  R.forEach((r, s) => {
    sumF += r;
    sumM += r * sys.nodesX[s + 1];
  });
  return {
    translation,
    rotation,
    globalForce: Math.abs(sumF - q * L),
    globalMoment: Math.abs(sumM - (q * L * L) / 2),
  };
}

export function equilibriumTolerances(forceScale: number, L: number): EquilibriumSet {
  const f = EQUILIBRIUM_REL_TOL * forceScale;
  const m = EQUILIBRIUM_REL_TOL * forceScale * L;
  return { translation: f, rotation: m, globalForce: f, globalMoment: m };
}

export function normalizeResiduals(r: EquilibriumSet, forceScale: number, L: number): EquilibriumSet {
  const m = forceScale * L;
  return {
    translation: r.translation / forceScale,
    rotation: r.rotation / m,
    globalForce: r.globalForce / forceScale,
    globalMoment: r.globalMoment / m,
  };
}

/** Each residual must be finite and within its own tolerance. */
export function checkEquilibrium(r: EquilibriumSet, tol: EquilibriumSet): { ok: boolean; failures: string[] } {
  const failures: string[] = [];
  for (const k of ["translation", "rotation", "globalForce", "globalMoment"] as const) {
    if (!Number.isFinite(r[k]) || !(r[k] <= tol[k])) failures.push(`${k} residual ${r[k]} exceeds ${tol[k]}`);
  }
  return { ok: failures.length === 0, failures };
}
