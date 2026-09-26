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

import type { GroundFailureCause } from "./ground-types";
export type GroundHeightInput = HeightSearchInput & { groundZ: number };

/** Sample classification from a complete ground solve at one hv. */
export type SampleClass = "admissible" | "not-admissible" | "uncertain" | "failed";

export interface HeightSample {
  hv: number; // mm
  cls: SampleClass;
  maxStress: number | null; // MPa, only for converged solves
  status: string; // solver status (or "ok")
  /** Failed samples only: precise failure cause (V2-7-R1). */
  cause?: GroundFailureCause;
}

/** Estimated range bound: a verified admissible sample; bracket = neighbouring sample
 *  on the other side (null when the bound is a domain edge). */
export interface GroundHeightBound { value: number; included: true; bracket: number | null; domainEdge: boolean }
export interface GroundHeightRange { lower: GroundHeightBound; upper: GroundHeightBound }

/** Portion of the domain whose admissibility is not established. */
export interface UnresolvedZone {
  from: number; // mm (a sample value or a domain edge)
  to: number; // mm
  /** "transition-bracket": an admissible and a not-admissible sample, both
   *  decidable, adjacent. If stress is continuous in hv it contains at least
   *  one crossing of the allowable; neither uniqueness of the crossing nor
   *  detection of all ranges is implied. Uncertain / failed samples never form
   *  a transition bracket (they give "uncertain-verdict" / "solver-failure"). */
  reason: "transition-bracket" | "uncertain-verdict" | "solver-failure" | "narrow-feature-not-excluded" | "budget";
  /** "solver-failure" only: distinct failure causes of the samples in the zone. */
  causes?: GroundFailureCause[];
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
  scope: { numSupports: number; L: number; hl: number; groundZ: number | null };
  /** Searched domain (mm); null when empty (groundZ > Hcap). */
  domain: { lower: number; upper: number } | null;
  ranges: GroundHeightRange[];
  zones: UnresolvedZone[];
  samples: HeightSample[];
  /** Largest VERIFIED admissible hv found; not a demonstrated maximum. */
  largestFound: number | null;
  diagnostics: GroundHeightDiagnostics;
}

/** Status = what was found; coverage is reported separately and is NEVER
 *  certified by sampling (estimated slopes are not a proof). */
export interface Coverage {
  certified: false;
  /** "normal" = algorithm finished; "resource-limit" = interrupted. */
  completion: "normal" | "resource-limit";
  uncertainEvaluations: number;
  failedEvaluations: number;
}
type C = Common & { coverage: Coverage };

export type GroundHeightResult =
  /** At least one verified admissible hv; ranges between them are ESTIMATED. */
  | (C & { status: "found" })
  /** No admissible hv found; absence NOT demonstrated (coverage not certified). */
  | (C & { status: "none-found" })
  /** Demonstrated impossibility by an independent necessary condition
   *  (empty domain: groundZ above Hcap). */
  | (C & { status: "impossible" })
  /** Resource limit reached: never means "no solution". */
  | (C & { status: "incomplete"; message: string })
  | { status: "invalid-input"; errors: string[] }
  | { status: "geometry-incompatible"; message: string }
  | { status: "not-implemented"; message: string };

export const GH_GRID = 32; // initial uniform intervals
export const GH_MIN_STEP_DIV = 1024; // minStep = domain width / 1024
export const GH_MAX_EVALUATIONS = 600;
export const GH_MAX_MS = 25000;
export const GH_SLOPE_SAFETY = 2;
