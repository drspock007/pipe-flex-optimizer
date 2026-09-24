// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Direct stiffness assembly of the vertical plane, elimination of prescribed
// end DOFs (Kff df = Ff - Kfc dc) and condensation onto support reactions:
// g = g0 + C R, where C is the support flexibility with clamped ends.

import { factorize, Factorization } from "./linear-algebra";
import { memberLoad, memberStiffness } from "./beam-member";

export interface VerticalSystem {
  nodesX: number[];
  K: number[][];
  F: number[];
  free: number[];
  fixed: number[];
  dc: number[];
  fact: Factorization | null;
  levels: number[]; // contact level of each support
}

export function buildVerticalSystem(
  L: number, hv: number, EI: number, q: number, n: number,
): VerticalSystem {
  const nodesX = Array.from({ length: n + 2 }, (_, i) => (i * L) / (n + 1));
  nodesX[n + 1] = L;
  const nd = 2 * nodesX.length;
  const K = Array.from({ length: nd }, () => new Array<number>(nd).fill(0));
  const F = new Array<number>(nd).fill(0);
  for (let e = 0; e < nodesX.length - 1; e++) {
    const l = nodesX[e + 1] - nodesX[e];
    const ke = memberStiffness(EI, l);
    const fe = memberLoad(q, l);
    for (let a = 0; a < 4; a++) {
      F[2 * e + a] += fe[a];
      for (let b = 0; b < 4; b++) K[2 * e + a][2 * e + b] += ke[a][b];
    }
  }
  const fixed = [0, 1, nd - 2, nd - 1];
  const dc = [0, 0, hv, 0];
  const free = Array.from({ length: nd - 4 }, (_, i) => i + 2);
  const Kff = free.map((i) => free.map((j) => K[i][j]));
  const fact = free.length > 0 ? factorize(Kff) : null;
  const levels = nodesX.slice(1, n + 1).map((x) => (hv * x) / L);
  return { nodesX, K, F, free, fixed, dc, fact, levels };
}

/** Full displacement vector for given upward support forces R (length n). */
export function solveDisplacements(sys: VerticalSystem, R: number[]): number[] {
  const d = new Array<number>(sys.K.length).fill(0);
  sys.fixed.forEach((dof, k) => (d[dof] = sys.dc[k]));
  if (!sys.fact) return d;
  const rhs = sys.free.map((i) => {
    let v = sys.F[i];
    sys.fixed.forEach((c, k) => (v -= sys.K[i][c] * sys.dc[k]));
    return v;
  });
  R.forEach((r, s) => (rhs[2 * s] += r)); // support s+1 z-DOF is free index 2s
  const df = sys.fact.solve(rhs);
  sys.free.forEach((dof, k) => (d[dof] = df[k]));
  return d;
}

/** Condensed contact data: gaps without supports g0 and flexibility C. */
export function condense(sys: VerticalSystem): { g0: number[]; C: number[][] } {
  const n = sys.levels.length;
  const d0 = solveDisplacements(sys, new Array<number>(n).fill(0));
  const g0 = sys.levels.map((zs, s) => d0[2 * (s + 1)] - zs);
  const C = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let j = 0; j < n; j++) {
    const e = new Array<number>(sys.free.length).fill(0);
    e[2 * j] = 1;
    const col = sys.fact!.solve(e);
    for (let i = 0; i < n; i++) C[i][j] = col[2 * i];
  }
  // Enforce exact symmetry (theoretical property of C).
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) C[i][j] = C[j][i] = 0.5 * (C[i][j] + C[j][i]);
  return { g0, C };
}

/** R = K d - F with the original (unreduced) system. */
export function nodalReactions(sys: VerticalSystem, d: number[]): number[] {
  return sys.K.map((row, i) => row.reduce((s, v, j) => s + v * d[j], 0) - sys.F[i]);
}
