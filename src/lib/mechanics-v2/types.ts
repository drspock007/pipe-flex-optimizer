// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni malagnino, 2026-09-24 03:33 CEST (Europe/Rome, UTC+2)
// Public contract of the V2 biaxial bending engine (fixed length).
// Modifié par Giovanni Malagnino, 2026-09-25 20:10 CEST: optional ground data (V2-5).
// Units used everywhere in this engine: mm, N, MPa, N*mm, mm^2, mm^4.

import type { GroundFailureCause, GroundReport, RefinementLevel } from "./ground-types";

export type AxialMode = "free" | "restrained";

/** Documented upper bound for the number of intermediate vertical supports. */
export const MAX_SUPPORTS = 20;

export interface BiaxialInput {
  L: number; // projected length along x (mm), > 0
  hv: number; // signed vertical end offset, z(L) (mm), positive upward
  hl: number; // signed lateral end offset, y(L) (mm)
  E: number; // Young's modulus (MPa), > 0
  A: number; // cross-section area (mm^2), > 0 (reserved for axial modes)
  I: number; // second moment of area (mm^4), > 0
  c: number; // outer fibre distance (mm), > 0
  q: number; // downward uniform load (N/mm), >= 0
  sigmaAllow: number; // allowable bending stress (MPa), > 0
  numSupports: number; // integer in [0, MAX_SUPPORTS]
  axialMode: AxialMode;
}

export interface MemberResult {
  index: number;
  xStart: number;
  length: number;
  /** [z_i, theta_i, z_j, theta_j] */
  nodalDisplacements: [number, number, number, number];
  /** Member end actions re = ke*de - fe = [Fi, Ci, Fj, Cj]. Ci = -Mv(0), Cj = Mv(l). */
  endActions: { Fi: number; Ci: number; Fj: number; Cj: number };
  EI: number;
  q: number;
}

export interface SupportResult {
  index: number; // 1..n
  x: number;
  level: number; // contact level of the pipe axis zs = hv*x/L
  z: number;
  gap: number; // g = z - zs (>= 0 when admissible)
  reaction: number; // upward positive (>= 0 when admissible)
  active: boolean;
  /** Ground branch: support at the ground level; reaction is the combined support + ground value. */
  sharedWithGround?: boolean;
}

export interface EndReaction {
  force: number; // vertical, upward positive
  couple: number; // nodal couple conjugate to theta = z'
}

export interface CriticalPoint {
  x: number;
  memberIndex: number;
  Mv: number;
  Ml: number;
  Mres: number;
  sigma: number;
  /** Angle of the most tensioned fibre, null when Mres is zero within tolerance. */
  phiTension: number | null;
  phiCompression: number | null;
}

/** Equilibrium residual set, each entry in its own unit. */
export interface EquilibriumSet {
  translation: number; // max |Kd - F - R_applied| over free translation DOFs (N)
  rotation: number; // max |Kd - F| over free rotation DOFs (N*mm)
  globalForce: number; // |sum of vertical reactions - qL| (N)
  globalMoment: number; // |sum of reaction moments about x=0 - qL^2/2| (N*mm)
}

export interface Diagnostics {
  converged: boolean;
  iterations: number;
  contactValid: boolean;
  /** Reference scales: force (N) and moment = force * L (N*mm). */
  scales: { force: number; moment: number; displacement: number };
  residuals: EquilibriumSet;
  /** Tolerances with the same units as residuals. */
  residualTolerances: EquilibriumSet;
  /** Informational only (ground branch): tolerances widened by the round-off estimate; never used for acceptance. */
  roundoffTolerances?: EquilibriumSet;
  /** Dimensionless residuals (raw residual / matching scale). */
  normalizedResiduals: EquilibriumSet;
  equilibriumOk: boolean;
  tolDisp: number;
  tolForce: number;
  messages: string[];
}

/** Physical-domain validity (small rotations, etc.) is not checked in this step. */
export type PhysicalValidity = "not-assessed";

export interface BiaxialSuccess {
  status: "ok";
  input: BiaxialInput;
  L: number;
  nodes: { x: number; z: number; theta: number }[];
  members: MemberResult[];
  supports: SupportResult[];
  endReactions: { left: EndReaction; right: EndReaction };
  critical: CriticalPoint;
  maxStress: number;
  sigmaAllow: number;
  /** Bending stress criterion only: maxStress <= sigmaAllow (no hidden buffer). */
  bendingCriterionMet: boolean;
  /** Numerical validity only: contact convergence + contact conditions + equilibrium. */
  numericalValid: boolean;
  /** Never implied by numericalValid or bendingCriterionMet. */
  physicalValidity: PhysicalValidity;
  diagnostics: Diagnostics;
  /** Present only for the ground-contact branch. */
  ground?: GroundReport;
}

export type BiaxialResult =
  | BiaxialSuccess
  | { status: "invalid-input"; errors: string[] }
  | { status: "not-implemented"; message: string }
  | { status: "solver-error"; message: string }
  | { status: "contact-not-converged"; diagnostics: Diagnostics }
  | { status: "numerical-failure"; message: string; diagnostics?: Diagnostics }
  | { status: "geometry-incompatible"; message: string }
  | { status: "incomplete"; message: string; refinement: RefinementLevel[]; diagnostics?: Diagnostics; cause?: GroundFailureCause };

export interface FieldValues {
  x: number;
  z: number;
  slopeZ: number;
  Mv: number;
  Vv: number;
  y: number;
  slopeY: number;
  Ml: number;
  Vl: number;
}
