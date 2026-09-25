// créé par Giovanni Malagnino, 2026-09-25 22:40 CEST (Europe/Rome, UTC+2)
// Public contract of Find h WITH a rigid frictionless ground (V2-6).
// Fixed L, hl, section, material, load, supports and groundZ; hv is searched.
//
// Domain: [max(groundZ, -Hcap), Hcap] with Hcap = sigmaAllow L^2 / (4 E c).
// Hcap applies with the ground: it is purely kinematic. With clamped ends
// (z'(0) = z'(L) = 0) we have int k dx = 0 and hv = int (L - x) k dx, where k
// is the vertical curvature. If sigma <= sigmaAllow then |k| <= K = sigmaAllow/(E c)
// (the biaxial stress is >= its vertical part), and the maximum of
// int (L - x) k under int k = 0, |k| <= K is K L^2 / 4. This holds for ANY
// vertical loading, ground and support reactions included. It is necessary,
// not sufficient, and refers to the exact beam (the solver is discretized).

import type { HeightSearchInput } from "./height-search-types";

export type GroundHeightInput = HeightSearchInput & { groundZ: number };

/** Sample classification from a complete ground solve at one hv. */
export type SampleClass = "admissible" | "not-admissible" | "uncertain" | "failed";

export interface HeightSample {
  hv: number; // mm
  cls: SampleClass;
  maxStress: number | null; // MPa, only for converged solves
  status: string; // solver status (or "ok")
}

/** Published bound: a verified admissible sample; bracket = neighbouring sample
 *  on the other side (null when the bound is a domain edge). */
export interface GroundHeightBound { value: number; included: true; bracket: number | null; domainEdge: boolean }
export interface GroundHeightRange { lower: GroundHeightBound; upper: GroundHeightBound }

/** Portion of the domain whose admissibility is not established. */
export interface UnresolvedZone {
  from: number; // mm (a sample value or a domain edge)
  to: number; // mm
  reason: "boundary-transition" | "uncertain-verdict" | "solver-failure" | "narrow-feature-not-excluded" | "budget";
}

export interface GroundHeightDiagnostics {
  Hcap: number; // mm
  evaluations: number;
  elapsedMs: number;
  /** Boundary location tolerance (mm) and minimum coverage step (mm). */
  boundaryTol: number;
  minStep: number;
  maxEvaluations: number;
  maxMs: number;
}

interface Common {
  scope: { numSupports: number; L: number; hl: number; groundZ: number };
  /** Searched domain (mm); null when empty (groundZ > Hcap). */
  domain: { lower: number; upper: number } | null;
  ranges: GroundHeightRange[];
  zones: UnresolvedZone[];
  samples: HeightSample[];
  /** Largest VERIFIED admissible hv found; not a demonstrated maximum. */
  largestFound: number | null;
  diagnostics: GroundHeightDiagnostics;
}

export type GroundHeightResult =
  /** Coverage established at the sampling resolution, no unresolved zone. */
  | (Common & { status: "ok" })
  /** Ranges found, but some zones are unresolved. */
  | (Common & { status: "partial" })
  /** Every sample converged and is not admissible, no zone left (or empty domain). */
  | (Common & { status: "no-solution" })
  /** No admissible sample, some zones unresolved: absence not established. */
  | (Common & { status: "unresolved" })
  /** Resource limit reached: never means "no solution". */
  | (Common & { status: "incomplete"; message: string })
  | { status: "invalid-input"; errors: string[] }
  | { status: "geometry-incompatible"; message: string }
  | { status: "not-implemented"; message: string };

export const GH_GRID = 32; // initial uniform intervals
export const GH_MIN_STEP_DIV = 1024; // minStep = domain width / 1024
export const GH_MAX_EVALUATIONS = 600;
export const GH_MAX_MS = 25000;
export const GH_SLOPE_SAFETY = 2;
