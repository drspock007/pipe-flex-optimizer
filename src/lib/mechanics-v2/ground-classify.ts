// créé par Giovanni Malagnino, 2026-09-26 04:30 CEST (Europe/Rome, UTC+2)
// Classification of one complete ground solve (shared by the ground searches).
// Strict criterion maxStress <= sigmaAllow; an uncertain verdict or a solver
// failure is never treated as "not admissible".

import { solveGroundFixedLength, GroundInput, GroundLimits } from "./ground-solve";
import type { HeightSample } from "./ground-height-types";
import type { BiaxialResult } from "./types";
import type { GroundFailureCause } from "./ground-types";

/** Precise cause of a failed solve (V2-7-R1), never a generic "did not converge". */
export function failureCause(r: BiaxialResult): GroundFailureCause | undefined {
  switch (r.status) {
    case "contact-not-converged": return "contact-not-converged";
    case "incomplete": return r.cause ?? "mesh-not-converged";
    case "numerical-failure": return "numerical-overflow";
    case "solver-error": return "solver-error";
    case "ok": return r.numericalValid ? undefined : r.ground?.precisionLoss ? "precision-loss" : "contact-not-converged";
    default: return undefined;
  }
}

export function classifyGround(input: GroundInput, limits?: GroundLimits): Omit<HeightSample, "hv"> {
  const r = solveGroundFixedLength(input, limits);
  if (r.status !== "ok") return { cls: "failed", maxStress: null, status: r.status, cause: failureCause(r) };
  if (!r.numericalValid) return { cls: "failed", maxStress: r.maxStress, status: "numerically-invalid", cause: failureCause(r) };
  if (r.ground?.criterionUncertain) return { cls: "uncertain", maxStress: r.maxStress, status: "ok" };
  return { cls: r.maxStress <= input.sigmaAllow ? "admissible" : "not-admissible", maxStress: r.maxStress, status: "ok" };
}
