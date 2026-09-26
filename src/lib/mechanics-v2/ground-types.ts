// créé par Giovanni Malagnino, 2026-09-25 20:10 CEST (Europe/Rome, UTC+2)
// Ground contact (V2-5): rigid, horizontal, frictionless ground over the whole
// length, acting only in the vertical plane. groundZ is already a pipe-AXIS
// level (physical ground + outer radius incl. coating): no radius is added.
//
// Tolerances (all documented with units):
//  - tolDisp = 1e-8 * dispScale (mm): nodal gap feasibility;
//  - max elements 2048: beyond, round-off of the (N^4-conditioned) beam
//    stiffness pollutes the recovered moments;
//  - contact admission: gap < -1e-12 * dispScale (mm), stricter than tolDisp;
//  - tolForce = 1e-8 * forceScale (N): nodal reaction feasibility;
//  - tolPenetration = 1e-5 * dispScale (mm): max interior penetration allowed;
//  - vertical scales use hv, groundZ, q only (never hl): the vertical
//    problem is independent of the lateral offset;
//  - the stress threshold max(1e-3 sigma, 1e-5 sigmaAllow) (MPa) is a
//    CONVERGENCE criterion between meshes, not a mechanical margin nor a
//    guaranteed error bound; when the last refinements change the verdict
//    maxStress <= sigmaAllow, or |maxStress - sigmaAllow| is within it, the
//    verdict is flagged uncertain (criterionUncertain) instead of certain;
//  - convergence between successive refinements (mesh doubled), required on
//    TWO consecutive comparisons (three meshes) to reject numerical plateaus:
//      |d sigmaMax| and |d sigmaVertical| <= 1e-3 * max(sigma, 1e-2 sigmaAllow) (MPa),
//      |d contactTotal| <= 1e-3 * forceScale (N), contactTotal = ground nodal
//      forces + supports at ground level + clamp ends lying on the ground
//      (these coincide with the ground; only their sum is determinate),
//      |d reaction| <= 1e-3 * forceScale (N) for each other support,
//      |d z| <= 1e-3 * dispScale (mm) at the nodes of the coarsest mesh;
//  - round-off: tolerance widening from |K d| terms must stay below the
//    mechanical budget, otherwise "precision loss" (numericalValid = false).

export const GROUND_CONV_REL = 1e-3;
/** Contact admission threshold = GROUND_ENTER_REL * tolDisp (i.e. 1e-12 * dispScale, mm). */
export const GROUND_ENTER_REL = 1e-4;
/** Stress floor for convergence (fraction of sigmaAllow): absolute resolution 1e-5 * sigmaAllow. */
export const GROUND_STRESS_FLOOR = 1e-2;
export const GROUND_PEN_REL = 1e-5;
/** Resource limit: maximum number of beam elements over the length. */
export const GROUND_MAX_ELEMENTS = 2048;
export const GROUND_MIN_ELEMENTS = 64;

export interface ContactZone { xStart: number; xEnd: number }

export interface RefinementLevel {
  elements: number;
  maxStress: number; // MPa
  groundReaction: number; // N (nodal ground forces only)
  contactTotal: number; // N (ground + shared supports + ends on the ground)
  maxPenetration: number; // mm
  iterations: number;
  contactConverged: boolean;
}

export interface GroundReport {
  level: number; // minimum pipe-axis elevation (mm)
  /** Total vertical ground reaction (N): sum of the discrete nodal ground forces (not a pressure). */
  totalReaction: number;
  /** Reaction at installed supports that coincide with the ground level (N): split not determinable. */
  combinedReaction: number;
  /** Reaction accounting (N), no double counting:
   *  totalReaction    = nodal forces at pure ground nodes (attributed to the ground);
   *  combinedReaction = installed supports coinciding with the ground (support/ground split indeterminate);
   *  endReaction      = imposed clamp ends lying at the ground level: this is the CLAMP reaction,
   *                     not attributed to the ground; clamp/neighbouring-contact split is mesh-dependent;
   *  contactTotal     = sum of the three. Global balance: contactTotal + other end forces
   *                     + non-coinciding support reactions = q L (checked in the residuals).
   *  Clamp-end reactions of ends lying on the ground level (N), e.g. left end when groundZ = 0. */
  endReaction: number;
  /** Mesh-independent total vertical contact force: totalReaction + combinedReaction + endReaction (N). */
  contactTotal: number;
  /** Round-off estimate exceeded the error budget on the final mesh. */
  precisionLoss: boolean;
  /** Estimated zones (graphical grouping of discrete contacts only). */
  contactZones: ContactZone[];
  /** Abscissae (mm) of the discrete numerical contact nodes (ground or shared). */
  contactPoints: number[];
  /** Last refinements change the criterion verdict or it lies within the convergence threshold. */
  criterionUncertain: boolean;
  contactNodes: number; // numerical contact points, NOT installed supports
  maxPenetration: number; // mm
  tolPenetration: number; // mm
  refinement: RefinementLevel[];
  converged: boolean;
  elements: number;
  /** "exact-no-contact": exact no-ground member solution, clearance verified on
   *  every member (no mesh, no refinement). "mesh-refinement": nodal contact mesh. */
  method: "exact-no-contact" | "mesh-refinement";
  /** Exact path only: minimum clearance above the ground over (0, L) (mm). */
  minClearance?: number;
}

/** Known causes of a failed ground solve (never "not admissible"). */
export type GroundFailureCause =
  | "contact-not-converged" | "mesh-not-converged" | "precision-loss" | "numerical-overflow" | "resource-limit" | "solver-error" | "axial-not-converged";
