// créé par Giovanni Malagnino, 2026-09-25 20:10 CEST (Europe/Rome, UTC+2)
// Ground contact (V2-5): rigid, horizontal, frictionless ground over the whole
// length, acting only in the vertical plane. groundZ is already a pipe-AXIS
// level (physical ground + outer radius incl. coating): no radius is added.
//
// Tolerances (all documented with units):
//  - tolDisp = 1e-8 * dispScale (mm): nodal gap feasibility;
//  - max elements 2048: beyond, round-off of the (N^4-conditioned) beam
//    stiffness pollutes the recovered moments;
//  - tolForce = 1e-8 * forceScale (N): nodal reaction feasibility;
//  - tolPenetration = 1e-5 * dispScale (mm): max interior penetration allowed;
//  - convergence between successive refinements (mesh doubled):
//      |d sigmaMax| <= 1e-3 * max(sigmaMax, 1e-3 sigmaAllow)  (MPa),
//      |d reaction| <= 1e-3 * forceScale (N) for ground total (+ reactions of supports
//      coinciding with the ground, whose split is indeterminate) and each other support,
//      |d z| <= 1e-3 * dispScale (mm) at the nodes of the coarsest mesh.

export const GROUND_CONV_REL = 1e-3;
export const GROUND_PEN_REL = 1e-5;
/** Resource limit: maximum number of beam elements over the length. */
export const GROUND_MAX_ELEMENTS = 2048;
export const GROUND_MIN_ELEMENTS = 64;

export interface ContactZone { xStart: number; xEnd: number }

export interface RefinementLevel {
  elements: number;
  maxStress: number; // MPa
  groundReaction: number; // N
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
  contactZones: ContactZone[];
  contactNodes: number; // numerical contact points, NOT installed supports
  maxPenetration: number; // mm
  tolPenetration: number; // mm
  refinement: RefinementLevel[];
  converged: boolean;
  elements: number;
}
