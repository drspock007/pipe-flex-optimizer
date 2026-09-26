// créé par Giovanni Malagnino, 2026-09-26 15:20 CEST (Europe/Rome, UTC+2)
// Polynomial helpers (ascending coefficients) and exhaustive real-root
// isolation on the closed interval [0, 1] for any low degree (V2-9-R1).
// Method: recursive derivative splitting. The roots of p' (found recursively)
// cut [0,1] into monotone pieces; each piece with a strict sign change holds
// exactly one simple root, found by bisection to machine precision. Stationary
// points with a tiny scaled residual are kept as (multiple) roots. Degrees are
// reduced only when the leading coefficient is below 1e-15 of the normalized
// scale (its contribution on [0,1] is then below round-off). Every returned
// root is validated by its scaled residual.

export const POLY_RESIDUAL_TOL = 1e-10;
const LEAD_TOL = 1e-15;
const DEDUP = 1e-12;

export const polyEval = (c: ArrayLike<number>, u: number) => { let s = 0; for (let k = c.length - 1; k >= 0; k--) s = s * u + c[k]; return s; };
const polyAbs = (c: number[], u: number) => c.reduceRight((a, v) => a * Math.abs(u) + Math.abs(v), 0);
export const polyDeriv = (c: number[]) => c.slice(1).map((v, k) => (k + 1) * v);
export function polyMul(a: number[], b: number[]): number[] {
  const out = new Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => { out[i + j] += x * y; }));
  return out;
}
export function polyAdd(a: number[], b: number[]): number[] {
  return Array.from({ length: Math.max(a.length, b.length) }, (_, k) => (a[k] ?? 0) + (b[k] ?? 0));
}

/** All real roots of p in [0, 1] (endpoints included), sorted, deduplicated. */
export function rootsInClosedUnit(coeffs: number[]): number[] {
  if (!coeffs.every(Number.isFinite)) throw new RangeError("rootsInClosedUnit: non-finite coefficient");
  const scale = Math.max(0, ...coeffs.map(Math.abs));
  if (!(scale > 0)) return [];
  const c = coeffs.map((v) => v / scale);
  while (c.length > 1 && Math.abs(c[c.length - 1]) <= LEAD_TOL) c.pop();
  if (c.length <= 1) return [];
  const zero = (u: number) => Math.abs(polyEval(c, u)) <= POLY_RESIDUAL_TOL * polyAbs(c, u);
  let cand: number[] = [];
  if (c.length === 2) cand = [-c[0] / c[1]];
  else {
    const crit = rootsInClosedUnit(polyDeriv(c)).filter((u) => u > 0 && u < 1);
    const pts = [0, ...crit, 1];
    cand = pts.filter(zero);
    for (let k = 0; k + 1 < pts.length; k++) {
      let a = pts[k], b = pts[k + 1];
      let fa = polyEval(c, a);
      const fb = polyEval(c, b);
      if (!(b > a) || fa === 0 || fb === 0 || Math.sign(fa) === Math.sign(fb)) continue;
      for (let it = 0; it < 200; it++) {
        const m = 0.5 * (a + b);
        if (!(m > a && m < b)) break;
        const fm = polyEval(c, m);
        if (fm === 0) { a = b = m; break; }
        if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
      }
      cand.push(0.5 * (a + b));
    }
  }
  const valid = cand
    .filter((u) => u >= 0 && u <= 1 && Math.abs(polyEval(c, u)) <= 1e-8 * Math.max(polyAbs(c, u), 1e-300))
    .sort((a, b) => a - b);
  const out: number[] = [];
  for (const u of valid) if (!out.length || u - out[out.length - 1] > DEDUP) out.push(u);
  return out;
}

/** Candidate abscissae for the extrema of p on [0,1]: endpoints + stationary points. */
export const extremaCandidates = (p: number[]) => [0, 1, ...rootsInClosedUnit(polyDeriv(p))];
