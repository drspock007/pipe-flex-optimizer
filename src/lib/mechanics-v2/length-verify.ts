// créé par Giovanni Malagnino, 2026-09-24 03:38 CEST (Europe/Rome, UTC+2)
// Cross-check of an analytical length window against solveBiaxialFixedLength.
// Engine failures (numerical, contact) are reported as failures, never as
// "stress too high". VERIFY_REL_TOL is a resolution tolerance on the stress
// comparison only; it is not a mechanical margin.

import { solveBiaxialFixedLength } from "./solve";
import { analyticSigmaMax } from "./length-search";
import { LengthSearchInput, LengthWindow } from "./length-search-types";

export const VERIFY_REL_TOL = 1e-8;

export interface LengthCheck {
  L: number;
  role: "lower" | "upper" | "optimum" | "interior" | "probe";
  analytic: number;
  engine: number | null;
  engineStatus: string;
  relError: number | null;
  /** Raw engine criterion, unrounded (may be false at a rounded boundary). */
  bendingCriterionMet: boolean | null;
  ok: boolean;
}

/** Finite lengths relevant for checking: bounds, optimum and interior points. */
export function verificationLengths(w: LengthWindow): { L: number; role: LengthCheck["role"] }[] {
  const out: { L: number; role: LengthCheck["role"] }[] = [];
  const lo = w.lower?.value ?? null;
  const hi = w.upper?.value ?? null;
  if (lo !== null) out.push({ L: lo, role: "lower" });
  if (hi !== null) out.push({ L: hi, role: "upper" });
  if (w.optimum) out.push({ L: w.optimum.Lopt, role: "optimum" });
  if (w.status === "window") {
    if (lo !== null && hi !== null) out.push({ L: 0.5 * (lo + hi), role: "interior" }, { L: lo + 0.1 * (hi - lo), role: "interior" });
    else if (lo !== null) out.push({ L: 2 * lo, role: "interior" }, { L: 10 * lo, role: "interior" });
    else if (hi !== null) out.push({ L: 0.5 * hi, role: "interior" }, { L: 0.1 * hi, role: "interior" });
    else out.push({ L: 1000, role: "probe" }, { L: 30000, role: "probe" }); // arbitrary probes, not limits
  }
  return out;
}

export function verifyWindowWithEngine(input: LengthSearchInput, w: LengthWindow): LengthCheck[] {
  const { av, al, b } = w.coefficients;
  return verificationLengths(w).map(({ L, role }) => {
    const analytic = analyticSigmaMax(av, al, b, L);
    const r = solveBiaxialFixedLength({ ...input, L, numSupports: w.numSupports });
    if (r.status !== "ok") {
      return { L, role, analytic, engine: null, engineStatus: r.status, relError: null, bendingCriterionMet: null, ok: false };
    }
    const scale = Math.max(analytic, w.sigmaAllow * 1e-12);
    const relError = Math.abs(r.maxStress - analytic) / scale;
    return {
      L, role, analytic, engine: r.maxStress, engineStatus: r.status, relError,
      bendingCriterionMet: r.bendingCriterionMet, ok: relError <= VERIFY_REL_TOL && r.numericalValid,
    };
  });
}
