// créé par Giovanni Malagnino, 2026-09-24 03:33 CEST (Europe/Rome, UTC+2)
// Robust real roots in the open interval (0,1) of a polynomial of degree <= 3.
// Strategy: split [0,1] at stationary points (roots of p'), accept a stationary
// point as a (multiple) root when its scaled residual is tiny, and bisect every
// sub-interval with a strict sign change. Coefficients are never truncated, so
// roots close to 0 or 1 are preserved.
//
// Tolerances (dimensionless, on the normalized polynomial):
//  - RESIDUAL_TOL: |p(u)| <= RESIDUAL_TOL * sum_k |c_k| u^k counts as zero;
//  - DEDUP_TOL: roots closer than this in u are merged;
//  - DISC_TOL: discriminants within DISC_TOL of the term magnitudes count as zero.

export const RESIDUAL_TOL = 1e-10;
export const DEDUP_TOL = 1e-9;
const DISC_TOL = 1e-12;

const evalPoly = (c: number[], u: number) => c.reduceRight((acc, v) => acc * u + v, 0);
const evalAbs = (c: number[], u: number) => c.reduceRight((acc, v) => acc * u + Math.abs(v), 0);
const isZeroAt = (c: number[], u: number) => Math.abs(evalPoly(c, u)) <= RESIDUAL_TOL * evalAbs(c, u);

/** Real roots of c0 + c1 u + c2 u^2 (degree handled explicitly). */
export function quadraticRoots([c0, c1, c2]: number[]): number[] {
  if (c2 === 0) return c1 === 0 ? [] : [-c0 / c1];
  const disc = c1 * c1 - 4 * c2 * c0;
  const mag = c1 * c1 + Math.abs(4 * c2 * c0);
  if (disc < 0 && disc >= -DISC_TOL * mag) return [-c1 / (2 * c2)]; // near-double root
  if (disc < 0) return [];
  const sq = Math.sqrt(disc);
  const t = -0.5 * (c1 + (c1 >= 0 ? sq : -sq));
  const r = [t / c2];
  if (t !== 0) r.push(c0 / t);
  return r;
}

export function rootsInUnit(coeffs: number[]): number[] {
  if (coeffs.length > 4) throw new RangeError("rootsInUnit supports degree <= 3");
  if (!coeffs.every(Number.isFinite)) throw new RangeError("rootsInUnit: non-finite coefficient");
  const scale = Math.max(0, ...coeffs.map(Math.abs));
  // Identically zero (or constant): no isolated root is reported.
  if (!(scale > 0)) return [];
  const c = [0, 0, 0, 0].map((_, k) => (coeffs[k] ?? 0) / scale);
  if (c[1] === 0 && c[2] === 0 && c[3] === 0) return [];

  const d = [c[1], 2 * c[2], 3 * c[3]];
  const inner = quadraticRoots(d).filter((u) => u > 0 && u < 1).sort((a, b) => a - b);
  const pts = [0, ...inner, 1];
  const candidates: number[] = inner.filter((u) => isZeroAt(c, u));

  for (let k = 0; k < pts.length - 1; k++) {
    let a = pts[k];
    let b = pts[k + 1];
    if (b - a <= 0 || isZeroAt(c, a) || isZeroAt(c, b)) continue;
    let fa = evalPoly(c, a);
    const fb = evalPoly(c, b);
    if (Math.sign(fa) === Math.sign(fb)) continue;
    for (let it = 0; it < 200 && b - a > 1e-16; it++) {
      const m = 0.5 * (a + b);
      const fm = evalPoly(c, m);
      if (fm === 0) {
        a = b = m;
        break;
      }
      if (Math.sign(fa) === Math.sign(fm)) {
        a = m;
        fa = fm;
      } else b = m;
    }
    candidates.push(0.5 * (a + b));
  }

  // Validate, sort and deduplicate.
  const valid = candidates
    .filter((u) => u > 0 && u < 1 && Math.abs(evalPoly(c, u)) <= 1e-8 * evalAbs(c, u))
    .sort((a, b) => a - b);
  const out: number[] = [];
  for (const u of valid) if (!out.length || u - out[out.length - 1] > DEDUP_TOL) out.push(u);
  return out;
}
