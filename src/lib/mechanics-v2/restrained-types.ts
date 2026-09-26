// créé par Giovanni Malagnino, 2026-09-26 14:30 CEST (Europe/Rome, UTC+2)
// Public data of the axially restrained fixed-length branch (V2-9).
// Model: initially straight pipe, no prestress, u(0) = u(L) = 0, von Karman
// axial strain eps = u' + (z'^2 + y'^2)/2 (small strains, moderate rotations;
// NOT an exact large-rotation kinematics). N constant, tension positive.

import type { EndReaction } from "./types";

/** Resource limits and mesh sequence (elements over the whole length). */
export const RESTRAINED_MIN_ELEMENTS = 32;
export const RESTRAINED_MAX_ELEMENTS = 1024;

export interface RestrainedLevel {
  elements: number;
  N: number; // N
  bendingMax: number; // MPa
  combinedMax: number; // MPa
  maxPenetration: number; // mm (0 without ground)
  axialIterations: number;
  contactIterations: number;
}

export interface AxialReport {
  /** Axial force, tension positive (N). N >= 0 by construction in this model. */
  N: number;
  sigmaAxial: number; // N/A (MPa)
  bendingMax: number; // c/I max hypot(Mv, Ml) (MPa), = maxStress
  /** max_x max(|N/A + sb|, |N/A - sb|) = N/A + max sb since N >= 0 (MPa). */
  combinedMax: number;
  combinedX: number; // mm
  combinedCriterionMet: boolean;
  /** Last refinements change the combined verdict or it lies within the convergence threshold. */
  criterionUncertain: boolean;
  strain: number; // N/(EA), dimensionless (domain indicator, no universal threshold)
  maxSlope: number; // max hypot(z', y'), dimensionless slope, exact on the discrete field (domain indicator)
  compatibilityResidual: number; // |N - EA/(2L) int (z'^2 + y'^2)| (N)
  compatibilityTolerance: number; // N
  axialIterations: number;
  elements: number;
  refinement: RestrainedLevel[];
  precisionLoss: boolean;
  /** Longitudinal end reactions: -N at x = 0 and +N at x = L (N, along x). */
  longitudinalReaction: number;
  lateral: {
    nodes: { y: number; theta: number }[];
    endActions: [number, number, number, number][];
    endReactions: { left: EndReaction; right: EndReaction };
  };
}
