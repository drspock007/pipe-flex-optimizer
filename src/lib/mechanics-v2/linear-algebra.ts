// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Dense LU factorization with symmetric diagonal equilibration.
// Equilibration D*K*D (D_ii = 1/sqrt|K_ii|) balances translation and rotation DOFs.
// A singular or invalid pivot raises an explicit error: no regularization is applied.

export class LinearSolveError extends Error {}

export interface Factorization {
  n: number;
  solve: (b: number[]) => number[];
}

export function factorize(K: number[][]): Factorization {
  const n = K.length;
  const D = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const kii = K[i][i];
    if (!Number.isFinite(kii) || kii <= 0) {
      throw new LinearSolveError(`Invalid diagonal term at row ${i}: ${kii}`);
    }
    D[i] = 1 / Math.sqrt(kii);
  }
  const a = K.map((row, i) => row.map((v, j) => v * D[i] * D[j]));
  const piv = Array.from({ length: n }, (_, i) => i);
  let maxAbs = 0;
  for (const row of a) for (const v of row) maxAbs = Math.max(maxAbs, Math.abs(v));
  const pivotTol = 1e-13 * Math.max(maxAbs, 1e-300) * Math.max(n, 1);

  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(a[i][k]) > Math.abs(a[p][k])) p = i;
    if (!(Math.abs(a[p][k]) > pivotTol)) {
      throw new LinearSolveError(`Singular or ill-conditioned system at pivot ${k}`);
    }
    if (p !== k) {
      [a[p], a[k]] = [a[k], a[p]];
      [piv[p], piv[k]] = [piv[k], piv[p]];
    }
    for (let i = k + 1; i < n; i++) {
      const f = a[i][k] / a[k][k];
      a[i][k] = f;
      for (let j = k + 1; j < n; j++) a[i][j] -= f * a[k][j];
    }
  }

  const solve = (b: number[]): number[] => {
    if (b.length !== n) throw new LinearSolveError("Right-hand side size mismatch");
    const y = piv.map((pi) => b[pi] * D[pi]);
    for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) y[i] -= a[i][j] * y[j];
    for (let i = n - 1; i >= 0; i--) {
      for (let j = i + 1; j < n; j++) y[i] -= a[i][j] * y[j];
      y[i] /= a[i][i];
    }
    const x = y.map((v, i) => v * D[i]);
    if (!x.every(Number.isFinite)) throw new LinearSolveError("Non-finite solution");
    return x;
  };
  return { n, solve };
}
