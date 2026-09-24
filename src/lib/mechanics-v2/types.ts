// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Public contract of the V2 biaxial bending engine (fixed length).
// Units used everywhere in this engine: mm, N, MPa, N*mm, mm^2, mm^4.

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

export interface Diagnostics {
  converged: boolean;
  iterations: number;
  contactValid: boolean;
  forceResidual: number;
  momentResidual: number;
  freeDofResidual: number;
  tolDisp: number;
  tolForce: number;
  messages: string[];
}

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
  /** Numerical / contact validity of the linear model (independent of the criterion). */
  modelValid: boolean;
  diagnostics: Diagnostics;
}

export type BiaxialResult =
  | BiaxialSuccess
  | { status: "invalid-input"; errors: string[] }
  | { status: "not-implemented"; message: string }
  | { status: "solver-error"; message: string }
  | { status: "contact-not-converged"; diagnostics: Diagnostics };

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
