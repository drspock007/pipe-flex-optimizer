// créé par Giovanni Malagnino, 2026-09-26 04:30 CEST (Europe/Rome, UTC+2)
// Classification of one complete ground solve (shared by the ground searches).
// Strict criterion maxStress <= sigmaAllow; an uncertain verdict or a solver
// failure is never treated as "not admissible".

import { solveGroundFixedLength, GroundInput, GroundLimits } from "./ground-solve";
import type { HeightSample } from "./ground-height-types";

export function classifyGround(input: GroundInput, limits?: GroundLimits): Omit<HeightSample, "hv"> {
  const r = solveGroundFixedLength(input, limits);
  if (r.status !== "ok") return { cls: "failed", maxStress: null, status: r.status };
  if (!r.numericalValid) return { cls: "failed", maxStress: r.maxStress, status: "numerically-invalid" };
  if (r.ground?.criterionUncertain) return { cls: "uncertain", maxStress: r.maxStress, status: "ok" };
  return { cls: r.maxStress <= input.sigmaAllow ? "admissible" : "not-admissible", maxStress: r.maxStress, status: "ok" };
}
