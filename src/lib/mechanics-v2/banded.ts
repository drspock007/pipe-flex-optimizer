// créé par Giovanni Malagnino, 2026-09-25 20:10 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-26 14:30 CEST: factor/solve split (V2-9, iterative refinement).
// Symmetric positive-definite band matrix and Cholesky solver (A = U^T U).
// Symmetric diagonal equilibration (D A D, unit diagonal) is applied before
// factorization; a non-positive pivot raises LinearSolveError (no regularization).

import { LinearSolveError } from "./linear-algebra";

export class BandMatrix {
  readonly a: Float64Array[];
  constructor(readonly n: number, readonly w: number) {
    this.a = Array.from({ length: n }, () => new Float64Array(w + 1));
  }
  /** Add v to A(i,j) and A(j,i) (stored once). Call once per symmetric pair. */
  add(i: number, j: number, v: number) {
    if (j < i) [i, j] = [j, i];
    this.a[i][j - i] += v;
  }
  get(i: number, j: number): number {
    if (j < i) [i, j] = [j, i];
    const k = j - i;
    return k <= this.w ? this.a[i][k] : 0;
  }
}

const PIVOT_TOL = 1e-14; // on the equilibrated (unit-diagonal) matrix

/** Factorize once; the returned function solves A x = b for any b. */
export function bandFactor(M: BandMatrix): (b: number[]) => number[] {
  const { n, w } = M;
  const D = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const d = M.a[i][0];
    if (!Number.isFinite(d) || d <= 0) throw new LinearSolveError(`Invalid band diagonal at row ${i}: ${d}`);
    D[i] = 1 / Math.sqrt(d);
  }
  const U = Array.from({ length: n }, () => new Float64Array(w + 1));
  for (let i = 0; i < n; i++) {
    for (let k = 0; k <= w && i + k < n; k++) {
      const j = i + k;
      let s = M.a[i][k] * D[i] * D[j];
      for (let p = Math.max(0, j - w); p < i; p++) s -= U[p][i - p] * U[p][j - p];
      if (k === 0) {
        if (!(s > PIVOT_TOL)) throw new LinearSolveError(`Singular or ill-conditioned band system at pivot ${i}`);
        U[i][0] = Math.sqrt(s);
      } else U[i][k] = s / U[i][0];
    }
  }
  return (b: number[]) => {
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = b[i] * D[i];
      for (let p = Math.max(0, i - w); p < i; p++) s -= U[p][i - p] * y[p];
      y[i] = s / U[i][0];
    }
    const xs = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = y[i];
      for (let k = 1; k <= w && i + k < n; k++) s -= U[i][k] * xs[i + k];
      xs[i] = s / U[i][0];
    }
    const x = Array.from(xs, (v, i) => v * D[i]);
    if (!x.every(Number.isFinite)) throw new LinearSolveError("Non-finite band solution");
    return x;
  };
}

export function bandSolve(M: BandMatrix, b: number[]): number[] {
  return bandFactor(M)(b);
}
