// créé par Giovanni Malagnino, 2026-09-26 04:30 CEST (Europe/Rome, UTC+2)
// Public contract of Find L WITH a rigid frictionless ground (V2-7).
// Fixed hv, hl, section, material, q, supports (x_i = iL/(n+1)) and groundZ;
// L is searched inside an explicit user domain [Lmin, Lmax] (mm). The domain
// is an exploration domain, NOT a mechanical bound: nothing is concluded
// outside it, and an admissible sample at a domain edge means the range may
// continue beyond. Sampling uses u = ln L (domains over several decades).

import type { LengthSearchInput } from "./length-search-types";
import type { Coverage, SampleClass, UnresolvedZone } from "./ground-height-types";
import type { GroundFailureCause } from "./ground-types";

export type GroundLengthInput = LengthSearchInput & { groundZ: number; Lmin: number; Lmax: number };

export interface LengthSample { L: number; cls: SampleClass; maxStress: number | null; status: string; cause?: GroundFailureCause }

/** Bound = verified admissible sample; bracket = neighbouring sample outside
 *  (null at a domain edge); domainEdge = "admissible at search boundary". */
export interface GroundLengthBound { value: number; included: true; bracket: number | null; domainEdge: boolean }
export interface GroundLengthRange { lower: GroundLengthBound; upper: GroundLengthBound }

export interface GroundLengthDiagnostics {
  evaluations: number; elapsedMs: number;
  /** Relative tolerances on L (in ln L): boundary location and minimum step. */
  boundaryTolRel: number; minStepRel: number;
  maxEvaluations: number; maxMs: number;
}

interface Common {
  /** groundZ null: restrained Find L without ground (V2-11). */
  scope: { numSupports: number; hv: number; hl: number; groundZ: number | null };
  domain: { lower: number; upper: number };
  ranges: GroundLengthRange[];
  zones: UnresolvedZone[]; // from / to in mm
  samples: LengthSample[];
  /** Domain edges reached by an admissible sample (range may continue beyond). */
  boundaryHits: ("lower" | "upper")[];
  /** Largest VERIFIED admissible L found; not a demonstrated maximum. */
  largestFound: number | null;
  /** Verified admissible sample with the lowest computed stress (not a global minimum). */
  lowestStress: LengthSample | null;
  diagnostics: GroundLengthDiagnostics;
  coverage: Coverage;
}

export type GroundLengthResult =
  | (Common & { status: "found" })
  /** No admissible L found within the searched domain; absence NOT demonstrated. */
  | (Common & { status: "none-found" })
  | (Common & { status: "incomplete"; message: string })
  /** Restrained only (V2-11): the whole requested domain is excluded by an
   *  independent necessary condition (no sample evaluated). */
  | (Common & { status: "impossible"; message: string })
  | { status: "invalid-input"; errors: string[] }
  | { status: "geometry-incompatible"; message: string }
  | { status: "not-implemented"; message: string };

export const GL_GRID = 32;
export const GL_MIN_STEP_DIV = 1024;
export const GL_MAX_EVALUATIONS = 600;
export const GL_MAX_MS = 25000;
