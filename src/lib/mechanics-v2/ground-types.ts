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
  /** Clamp-end reactions of ends lying on the ground level (N), e.g. left end when groundZ = 0. */
  endReaction: number;
  /** Mesh-independent total vertical contact force: totalReaction + combinedReaction + endReaction (N). */
  contactTotal: number;
  /** Round-off estimate exceeded the error budget on the final mesh. */
  precisionLoss: boolean;
  contactZones: ContactZone[];
  contactNodes: number; // numerical contact points, NOT installed supports
  maxPenetration: number; // mm
  tolPenetration: number; // mm
  refinement: RefinementLevel[];
  converged: boolean;
  elements: number;
}
