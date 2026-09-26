// créé par Giovanni Malagnino, 2026-09-25 00:54 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni malagnino, 2026-09-25 01:04 CEST (Europe/Rome, UTC+2)
// Contact regime for an imposed active set, by linearity in u = x/L.
// Coefficients come from two independent normalized solves (regime-coeffs.ts).
// Intervals are computed in the scaled variable Lambda = (L / Lq)^4 with
// Lq = (EI/q)^(1/4), so a tiny load never vanishes through q/EI underflow.
// No length sampling or fitting is used; the interval is exact in T.

import { validateInput } from "./validate";
import { normalizedData, PhysicalSlope, regimeCoefficients } from "./regime-coeffs";
import { intersectAffine } from "./regime-interval";
import { RegimeConstraint, RegimeInput, RegimeInterval, RegimeResult } from "./regime-types";

export { EVENT_REL_TOL } from "./regime-interval";
export { ZERO_REL_TOL, UNCERTAIN_REL_TOL } from "./regime-coeffs";

const qr = (x: number) => Math.sqrt(Math.sqrt(x));

/** Lq = (EI/q)^(1/4) (mm) without forming EI/q; null when q = 0. */
export function loadLengthScale(E: number, I: number, q: number): number | null {
  if (q === 0) return null;
  const Lq = (qr(E) * qr(I)) / qr(q);
  if (!Number.isFinite(Lq) || !(Lq > 0)) throw new RangeError(`Non-representable load length scale (${Lq})`);
  return Lq;
}

export const physicalSlope = (q: number, E: number, I: number): PhysicalSlope => (s) => {
  if (s === 0) return { slope: 0, ok: true };
  const v = ((s * q) / E) / I;
  return Number.isFinite(v) && v !== 0 ? { slope: v, ok: true } : { slope: 0, ok: false };
};

function validate(input: RegimeInput): string[] {
  const errors = validateInput({ ...input, L: 1 });
  const n = input.numSupports;
  if (!Array.isArray(input.activeSet)) return [...errors, "activeSet must be an array"];
  const seen = new Set<number>();
  for (const i of input.activeSet) {
    if (!Number.isInteger(i) || i < 1 || i > n) errors.push(`active index ${i} must be an integer in [1, ${n}]`);
    else if (seen.has(i)) errors.push(`duplicate active index ${i}`);
    seen.add(i);
  }
  return errors;
}

/** Exact intersection of T > 0 with constant + slope * T >= 0 (physical slopes). */
export function intersectRegime(cs: (Pick<RegimeConstraint, "kind" | "support" | "constant" | "slope"> & Partial<RegimeConstraint>)[]): RegimeInterval {
  return intersectAffine(cs.map((c) => ({ ...c, s: c.slope })), 1);
}

/** True when a sign-uncertain coefficient is binding or decides feasibility. */
export function isAmbiguous(cs: RegimeConstraint[], iv: RegimeInterval): boolean {
  const ev = [...(iv.lower?.events ?? []), ...(iv.upper?.events ?? [])];
  return cs.some((c) => c.signUncertain &&
    (c.scaledSlope === 0 || ev.some((e) => e.support === c.support)));
}

export function computeRegime(input: RegimeInput): RegimeResult {
  const errors = validate(input);
  if (errors.length) return { status: "invalid-input", errors };
  if (input.axialMode === "restrained") {
    return { status: "not-implemented", message: 'axialMode "restrained" is available in Fixed L and Find h only: Find L and Min. supports are not available with it' };
  }
  try {
    const Lq = loadLengthScale(input.E, input.I, input.q);
    const activeSet = [...input.activeSet].sort((x, y) => x - y);
    const co = regimeCoefficients(normalizedData(input.numSupports), input.hv, activeSet.map((i) => i - 1),
      input.q > 0, physicalSlope(input.q, input.E, input.I));
    const interval = intersectAffine(co.constraints.map((c) => ({ ...c, s: c.scaledSlope })), Lq ?? 1);
    return {
      status: "ok", numSupports: input.numSupports, activeSet, constraints: co.constraints, interval,
      loadLengthScale: Lq, ambiguous: isAmbiguous(co.constraints, interval), physicalValidity: "not-assessed",
    };
  } catch (e) {
    return { status: "numerical-failure", message: (e as Error).message };
  }
}

/** Physical gaps (mm) and reactions (N) of the regime at length L (for checks only). */
export function evaluateRegime(input: RegimeInput, cs: RegimeConstraint[], L: number) {
  const Lq = loadLengthScale(input.E, input.I, input.q);
  const Lam = Lq === null ? 0 : ((L / Lq) ** 2) ** 2;
  return cs.map((c) => {
    const v = c.constant + c.scaledSlope * Lam;
    return { kind: c.kind, support: c.support, value: c.kind === "gap" ? v : v * (input.E / L) * (input.I / L) / L };
  });
}
