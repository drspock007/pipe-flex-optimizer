// créé par Giovanni Malagnino, 2026-09-26 14:30 CEST (Europe/Rome, UTC+2)
// Shared wording of the restrained axial mode (V2-9) for the results panel
// and the PDF, so both show the same axial terms, verdict and limits.

import { AxialReport, BiaxialSuccess } from "@/lib/mechanics-v2";

export const RESTRAINED_EXPLANATION = "Axial end separation fixed; initially straight pipe, no prestress";
export const RESTRAINED_SEARCH_UNAVAILABLE =
  "Restrained axial mode is available in Fixed L only: searches (Find L, Min. supports, Find h) are not available with it. Select Free sliding or Fixed L.";
export const RESTRAINED_MODEL_TEXT =
  "Euler-Bernoulli with von Karman axial strain (small strains, moderate rotations; not an exact large-rotation kinematics). N constant, tension positive, u(0) = u(L) = 0.";
export const COMBINED_NOTE =
  "Combined normal stress = N/A +/- c/I hypot(Mv, Ml). Not a code check, not a von Mises stress (no pressure, no shear).";

export interface AxialFormat { force: (n: number) => string; stress: (mpa: number) => string; length: (mm: number) => string }

/** Main verdict: combined criterion in restrained mode, bending criterion otherwise. */
export function verdictText(s: BiaxialSuccess): { met: boolean; uncertain: boolean; label: string } {
  const a = s.axial;
  const uncertain = a ? a.criterionUncertain : !!s.ground?.criterionUncertain;
  const met = a ? a.combinedCriterionMet : s.bendingCriterionMet;
  return { met, uncertain, label: a ? "Combined normal stress criterion" : "Bending criterion" };
}

export function axialRows(a: AxialReport, s: BiaxialSuccess, f: AxialFormat): [string, string][] {
  return [
    ["Axial mode", `Restrained — ${RESTRAINED_EXPLANATION}`],
    ["Axial force N (tension +)", f.force(a.N)],
    ["Axial stress N/A", f.stress(a.sigmaAxial)],
    ["Max resultant bending stress", f.stress(a.bendingMax)],
    ["Max combined normal stress", `${f.stress(a.combinedMax)} at x = ${f.length(a.combinedX)}`],
    ["Combined criterion (governs)", a.criterionUncertain ? "UNCERTAIN (mesh precision)" : a.combinedCriterionMet ? "met" : "NOT met"],
    ["Bending-only criterion (information)", s.bendingCriterionMet ? "met" : "NOT met"],
    ["Longitudinal end reactions", `${f.force(-a.longitudinalReaction)} at x = 0 / ${f.force(a.longitudinalReaction)} at x = L (along x)`],
    ["Lateral end reactions left / right", `${f.force(a.lateral.endReactions.left.force)} / ${f.force(a.lateral.endReactions.right.force)}`],
    ["Axial strain N/(EA) (domain indicator)", a.strain.toExponential(3)],
    ["Max transverse slope hypot(z', y') (domain indicator)", `${a.maxSlope.toFixed(4)} rad`],
    ["Axial compatibility residual", `${f.force(a.compatibilityResidual)} (tol. ${f.force(a.compatibilityTolerance)})`],
    ["Convergence", `mesh converged — ${a.elements} elements, ${a.refinement.length} levels; ${a.axialIterations} axial iterations on the final mesh`],
  ];
}
