// créé par Giovanni Malagnino, 2026-09-24 03:38 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni malagnino, 2026-09-24 03:46 CEST (Europe/Rome, UTC+2)
// Closed-form admissible lengths for 0 supports (k = 12) or 1 central support (k = 48).
// sigmaMax(L) = hypot(av/L^2 + b L^2, al/L^2), av = 6Ec|hv|, al = 6Ec|hl|, b = qc/(kI).
// With T = L^4 and T0 = Lopt^4 = hypot(av,al)/b, tau = T/T0 satisfies
// tau + 1/tau = rho, rho - 2 = (s - sMin)(s + sMin)/(hypot(av,al) b),
// which avoids cancellation (small root = 1/large root) and limits overflow.
// Intermediate products (coefficients, rho, tau) can still overflow for extreme
// inputs: every published finite bound is therefore checked centrally and any
// non-representable value yields an explicit numerical failure, never "unbounded".
// No length sweep and no arbitrary length cap are used.

import { validateInput } from "./validate";
import {
  FixedSupportsSearchResult, LengthSearchInput, LengthWindow, MinSupportsSearchResult,
  SEARCH_SCOPE, SearchedSupports,
} from "./length-search-types";

/** Tangency detection tolerance (relative). It never changes the strict criterion:
 *  s in [sigmaMin, sigmaMin(1+tol)] -> single admissible point at Lopt (sigma <= s);
 *  s in [sigmaMin(1-tol), sigmaMin)  -> "undecidable" (computed candidate above s). */
export const TANGENCY_REL_TOL = 1e-12;

const finiteBound = (value: number, included = true) => ({ value, included, kind: "finite" as const });

/** sqrt(a/b) without forming a/b (avoids intermediate overflow/underflow). */
const sqrtRatio = (a: number, b: number) => Math.sqrt(a) / Math.sqrt(b);

export function analyticSigmaMax(av: number, al: number, b: number, L: number): number {
  const L2 = L * L;
  return Math.hypot(av / L2 + b * L2, al / L2);
}

/** Central guarantee: every "finite" bound is finite and strictly positive. */
function assertFiniteBounds(w: LengthWindow): LengthWindow {
  for (const [name, bound] of [["lower", w.lower], ["upper", w.upper]] as const) {
    if (bound && bound.kind === "finite") {
      const v = bound.value;
      if (v === null || !Number.isFinite(v) || !(v > 0)) {
        throw new RangeError(`Non-representable ${name} bound (${v}) for ${w.numSupports} support(s)`);
      }
    } else if (bound && bound.value !== null) {
      throw new RangeError(`Inconsistent ${name} bound: kind ${bound.kind} with value ${bound.value}`);
    }
  }
  if (w.optimum && !(Number.isFinite(w.optimum.Lopt) && w.optimum.Lopt > 0 && Number.isFinite(w.optimum.sigmaMin))) {
    throw new RangeError("Non-representable optimum");
  }
  return w;
}

function computeWindow(input: LengthSearchInput, n: SearchedSupports): LengthWindow {
  return assertFiniteBounds(computeWindowRaw(input, n));
}

function computeWindowRaw(input: LengthSearchInput, n: SearchedSupports): LengthWindow {
  const { E, c, I, q, hv, hl, sigmaAllow: s } = input;
  const k = n === 0 ? 12 : 48;
  const av = 6 * E * c * Math.abs(hv);
  const al = 6 * E * c * Math.abs(hl);
  const b = (q * c) / (k * I);
  const Hs = Math.hypot(av, al);
  if (![av, al, b, Hs].every(Number.isFinite)) throw new RangeError("Coefficient overflow");
  // Underflow of a non-zero load or offset must not masquerade as an exact zero case.
  if ((q > 0 && b === 0) || (hv !== 0 && av === 0) || (hl !== 0 && al === 0)) {
    throw new RangeError("Coefficient underflow");
  }
  const base = { numSupports: n, coefficients: { av, al, b, k: k as 12 | 48 }, sigmaAllow: s };

  if (Hs === 0 && b === 0) {
    return { ...base, status: "window", lower: { value: null, included: false, kind: "zero-excluded" },
      upper: { value: null, included: false, kind: "unbounded" }, optimum: null,
      infimum: { sigma: 0, attained: true, approachedAs: "everywhere" } };
  }
  if (b === 0) {
    // Offsets only: sigma = Hs / L^2, decreasing towards 0 as L -> infinity.
    return { ...base, status: "window", lower: finiteBound(sqrtRatio(Hs, s)),
      upper: { value: null, included: false, kind: "unbounded" }, optimum: null,
      infimum: { sigma: 0, attained: false, approachedAs: "L-to-infinity" } };
  }
  if (Hs === 0) {
    // Weight only: sigma = b L^2, L = 0 excluded.
    return { ...base, status: "window", lower: { value: null, included: false, kind: "zero-excluded" },
      upper: finiteBound(sqrtRatio(s, b)), optimum: null,
      infimum: { sigma: 0, attained: false, approachedAs: "L-to-zero" } };
  }

  const sigmaMin = Math.sqrt(2 * b) * Math.sqrt(av + Hs);
  const Lopt = Math.pow(Hs, 0.25) / Math.pow(b, 0.25);
  if (!Number.isFinite(sigmaMin) || !Number.isFinite(Lopt) || !(Lopt > 0)) {
    throw new RangeError("Optimum overflow");
  }
  const optimum = { Lopt, sigmaMin };
  const infimum = { sigma: sigmaMin, attained: true, approachedAs: "L-optimum" as const };
  if (s < sigmaMin && sigmaMin - s <= TANGENCY_REL_TOL * sigmaMin) {
    return { ...base, status: "undecidable", lower: null, upper: null, optimum, infimum };
  }
  if (s >= sigmaMin && s - sigmaMin <= TANGENCY_REL_TOL * sigmaMin) {
    return { ...base, status: "single-point", lower: finiteBound(Lopt), upper: finiteBound(Lopt), optimum, infimum };
  }
  if (s < sigmaMin) return { ...base, status: "none", lower: null, upper: null, optimum, infimum };

  const rhoM2 = ((s - sigmaMin) / Hs) * ((s + sigmaMin) / b);
  const tauBig = (rhoM2 + 2 + Math.sqrt(rhoM2 * (rhoM2 + 4))) / 2;
  const r = Math.pow(tauBig, 0.25);
  const Lmin = Lopt / r;
  const Lmax = Lopt * r;
  if (!Number.isFinite(Lmin) || !Number.isFinite(Lmax) || !(Lmin > 0)) {
    throw new RangeError("Bound overflow");
  }
  return { ...base, status: "window", lower: finiteBound(Lmin), upper: finiteBound(Lmax), optimum, infimum };
}

function precheck(input: LengthSearchInput, n: number) {
  const errors = validateInput({ ...input, L: 1, numSupports: n });
  if (n !== 0 && n !== 1) errors.push("numSupports must be 0 or 1 for this analytical search");
  if (errors.length) return { status: "invalid-input" as const, errors };
  if (input.axialMode === "restrained") {
    return { status: "not-implemented" as const, message: 'axialMode "restrained" is available in Fixed L and Find h only: Find L and Min. supports are not available with it' };
  }
  return null;
}

export function searchLengthFixedSupports(input: LengthSearchInput, numSupports: number): FixedSupportsSearchResult {
  const bad = precheck(input, numSupports);
  if (bad) return bad;
  try {
    return { status: "ok", scope: SEARCH_SCOPE, window: computeWindow(input, numSupports as SearchedSupports) };
  } catch (e) {
    return { status: "numerical-failure", message: (e as Error).message };
  }
}

/** Minimum number of supports among the studied configurations {0, 1} only. */
export function searchMinSupportsLength(input: LengthSearchInput): MinSupportsSearchResult {
  const bad = precheck(input, 0);
  if (bad) return bad;
  const windows: LengthWindow[] = [];
  try {
    for (const n of [0, 1] as const) {
      const w = computeWindow(input, n);
      windows.push(w);
      if (w.status === "undecidable") continue;
      if (w.status !== "none") {
        const minimalityCertified = windows.every((x) => x.status !== "undecidable");
        return { status: "found", scope: SEARCH_SCOPE, numSupports: n, window: w, windows, minimalityCertified };
      }
    }
  } catch (e) {
    return { status: "numerical-failure", message: (e as Error).message };
  }
  if (windows.some((w) => w.status === "undecidable")) {
    return { status: "undecidable-in-0-or-1-support", scope: SEARCH_SCOPE, windows };
  }
  return { status: "no-solution-in-0-or-1-support", scope: SEARCH_SCOPE, windows };
}
