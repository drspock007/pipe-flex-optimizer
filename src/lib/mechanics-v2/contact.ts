// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Unilateral contact by a primal-feasible active-set method on the condensed
// problem: minimize 0.5 R'CR + g0'R subject to R >= 0 (g = g0 + C R).
// Deterministic rules: the most negative gap enters first (lowest index on ties);
// released contacts are those whose reaction reaches zero during step limiting.

import { factorize } from "./linear-algebra";

export interface ContactOutcome {
  R: number[];
  converged: boolean;
  iterations: number;
  message: string;
}

const gaps = (g0: number[], C: number[][], R: number[]) =>
  g0.map((g, i) => g + C[i].reduce((s, c, j) => s + c * R[j], 0));

export function solveContact(
  g0: number[], C: number[][], tolDisp: number, tolForce: number, maxIter = 200,
): ContactOutcome {
  const n = g0.length;
  const R = new Array<number>(n).fill(0);
  const inSet = new Array<boolean>(n).fill(false);
  let iter = 0;

  while (iter < maxIter) {
    const g = gaps(g0, C, R);
    let enter = -1;
    let worst = -tolDisp;
    for (let i = 0; i < n; i++) {
      if (!inSet[i] && g[i] < worst) {
        worst = g[i];
        enter = i;
      }
    }
    if (enter < 0) return { R, converged: true, iterations: iter, message: "converged" };
    inSet[enter] = true;

    // Inner loop: keep reactions feasible by step limiting.
    while (iter < maxIter) {
      iter++;
      const P = inSet.flatMap((b, i) => (b ? [i] : []));
      if (P.length === 0) break;
      const s = factorize(P.map((i) => P.map((j) => C[i][j]))).solve(P.map((i) => -g0[i]));
      if (s.every((v) => v > 0)) {
        P.forEach((i, k) => (R[i] = s[k]));
        break;
      }
      let alpha = 1;
      P.forEach((i, k) => {
        if (s[k] <= 0) alpha = Math.min(alpha, R[i] / (R[i] - s[k]));
      });
      P.forEach((i, k) => {
        R[i] += alpha * (s[k] - R[i]);
        if (R[i] <= tolForce) {
          R[i] = 0;
          inSet[i] = false;
        }
      });
    }
  }
  return {
    R,
    converged: false,
    iterations: iter,
    message: `Active-set contact did not converge within ${maxIter} iterations`,
  };
}
