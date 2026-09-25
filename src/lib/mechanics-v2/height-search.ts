// créé par Giovanni Malagnino, 2026-09-25 17:40 CEST (Europe/Rome, UTC+2)
// Find h: every signed range of hv meeting the bending criterion at fixed L.
//
// Search domain. |sigma| <= sigmaAllow implies |Mv| <= sigmaAllow I / c, hence
// |z''| <= kappa = sigmaAllow / (E c). With z'(0) = z'(L) = 0:
//   |z'(x)| = |int_0^x z''| <= kappa x  and  |z'(x)| = |int_x^L z''| <= kappa (L - x),
//   |hv| = |int_0^L z'| <= kappa int_0^L min(x, L - x) dx = kappa L^2 / 4 = Hcap.
// Hcap is only a necessary bound limiting the explored domain [-Hcap, Hcap].
//
// Per regime, Mv(x, hv) = hv av(x) + bv(x) and Ml(x) is independent of hv, so
// ||M||^2 is a convex quadratic in hv at every x and the exact spatial maximum
// (member ends + stationarity roots) is convex in hv: one admissible sub-interval
// at most, found by golden section (minimum) and bisection kept on the admissible
// side (crossings). Plot samples never enter these decisions.

import { validateInput } from "./validate";
import { normalizedData } from "./regime-coeffs";
import { physicalSlope } from "./regime";
import { regimeMoments, regimeSigmaMax } from "./regime-stress";
import { TANGENCY_REL_TOL } from "./length-search";
import { walkHeights } from "./height-walk";
import { HeightMinimum, HeightRange, HeightRegimeSummary, HeightSearchInput, HeightSearchResult } from "./height-search-types";

const PHI = (Math.sqrt(5) - 1) / 2;
const MAX_IT = 300;

/** Necessary bound Hcap = sigmaAllow L^2 / (4 E c), evaluated without intermediate overflow. */
export function heightCap(sigmaAllow: number, L: number, E: number, c: number): number {
  const H = (sigmaAllow / E) * (L / c) * (L / 4);
  if (!Number.isFinite(H) || !(H > 0)) throw new RangeError(`Non-representable height cap Hcap (${H})`);
  return H;
}

function convexWindow(f: (h: number) => number, lo: number, hi: number, s: number, abs: number) {
  let a = lo, b = hi, c = b - PHI * (b - a), d = a + PHI * (b - a), fc = f(c), fd = f(d);
  for (let k = 0; k < MAX_IT && b - a > abs; k++) {
    if (fc <= fd) { b = d; d = c; fd = fc; c = b - PHI * (b - a); fc = f(c); }
    else { a = c; c = d; fc = fd; d = a + PHI * (b - a); fd = f(d); }
  }
  const flo = f(lo), fhi = f(hi);
  const [hm, fm] = ([[c, fc], [d, fd], [lo, flo], [hi, fhi]] as [number, number][]).reduce((m, p) => (p[1] < m[1] ? p : m));
  if (fm > s) return { range: null, hm, fm, undecidable: fm - s <= TANGENCY_REL_TOL * s };
  const bisect = (out: number, inn: number) => {
    for (let k = 0; k < MAX_IT; k++) {
      const m = 0.5 * (out + inn);
      if (m === out || m === inn) break;
      if (f(m) <= s) inn = m; else out = m;
    }
    return inn;
  };
  const L = flo <= s ? lo : bisect(lo, hm), U = fhi <= s ? hi : bisect(hi, hm);
  return { range: { lower: { value: L, included: true }, upper: { value: U, included: true } }, hm, fm, undecidable: false };
}

function merge(rs: HeightRange[]): HeightRange[] {
  const out: HeightRange[] = [];
  for (const r of rs) {
    const p = out[out.length - 1];
    if (p && p.upper.value === r.lower.value) p.upper = r.upper;
    else out.push({ lower: { ...r.lower }, upper: { ...r.upper } });
  }
  return out;
}

export function searchHeightFixedSupports(input: HeightSearchInput, numSupports: number): HeightSearchResult {
  const errors = validateInput({ ...input, hv: 0, numSupports });
  if (errors.length) return { status: "invalid-input", errors };
  if (input.axialMode === "restrained") return { status: "not-implemented", message: 'axialMode "restrained" is not implemented' };
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const scope = { numSupports, L: input.L, hl: input.hl };
  try {
    const { L, E, I, c, q, sigmaAllow: s } = input;
    const Hcap = heightCap(s, L, E, c);
    const Lambda = (((q * L) / E) * (L / I)) * L * L;
    if (!Number.isFinite(Lambda)) throw new RangeError("Non-representable load parameter q L^4 / EI");
    const nd = normalizedData(numSupports);
    const walk = walkHeights(nd, Lambda, Hcap, physicalSlope(q, E, I));
    const ranges: HeightRange[] = [], regimes: HeightRegimeSummary[] = [];
    let minimum: HeightMinimum = { sigma: Infinity, hv: 0 }, tangency = 0, ambiguous = 0;
    for (const r of walk.regimes) {
      const polys = regimeMoments({ E, I, c, q, hv: 1, hl: input.hl }, numSupports, r.active, r.coeffs.gamma, r.coeffs.delta);
      const f = (h: number) => regimeSigmaMax(polys.map((p) => ({ ...p, av: p.av.map((v) => v * h) })), L, c, I);
      const w = convexWindow(f, r.lo, r.hi, s, 4 * Number.EPSILON * Hcap);
      if (w.range) ranges.push(w.range);
      if (w.undecidable) tangency++;
      if (r.ambiguous) ambiguous++;
      if (w.fm < minimum.sigma) minimum = { sigma: w.fm, hv: w.hm };
      regimes.push({ activeSet: r.active.map((i) => i + 1), lower: r.lo, upper: r.hi, upperEvents: r.hiEvents, minSigma: w.fm, minAt: w.hm });
    }
    const merged = merge(ranges);
    const diagnostics = {
      Hcap, regimeCount: regimes.length, tangencyUncertainRegimes: tangency, ambiguousRegimes: ambiguous,
      elapsedMs: (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0,
    };
    const common = { scope, regimes, diagnostics };
    if (walk.status === "incomplete") return { status: "incomplete", message: walk.message, partialRanges: merged, ...common };
    if (!merged.length) {
      return tangency
        ? { status: "undecidable", message: "sigmaAllow is within the tangency tolerance below the computed minimum stress", minimum, ...common }
        : { status: "no-solution", minimum, ...common };
    }
    return {
      status: "ok", complete: true, ranges: merged, minimum, physicalValidity: "not-assessed",
      extremes: { min: merged[0].lower.value, max: merged[merged.length - 1].upper.value }, ...common,
    };
  } catch (e) {
    return { status: "numerical-failure", message: (e as Error).message };
  }
}
