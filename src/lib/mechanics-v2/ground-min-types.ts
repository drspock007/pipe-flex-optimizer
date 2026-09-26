// créé par Giovanni Malagnino, 2026-09-26 05:10 CEST (Europe/Rome, UTC+2)
// Public contract of Min. supports WITH a rigid frictionless ground (V2-8).
// Fixed hv, hl, section, material, q, groundZ and length domain [Lmin, Lmax];
// installed counts n = 0, 1, ... ceiling (<= 20) are examined IN ORDER (no
// bisection: support positions change with n, no monotonicity is established).
// Each n runs Find L with ground (exploratory). The search stops at the first n
// whose admissible length passes an independent final check.
// Separate notions: candidate existence, algorithm completion, minimality
// certification, length coverage (never certified).

import type { GroundLengthResult, LengthSample } from "./ground-length-types";
import type { GroundLengthInput } from "./ground-length-types";

export type GroundMinInput = GroundLengthInput;

/** Per-count outcome.
 *  candidate      = verified admissible L passed the final check;
 *  rejected       = admissible samples found but none passed the final check;
 *  none-found     = search finished, no admissible point found (NOT an impossibility proof);
 *  failed         = every evaluation failed or was uncertain;
 *  interrupted    = global budget reached during this count;
 *  not-examined   = global budget reached before this count. */
export type GroundMinRowStatus = "candidate" | "rejected" | "none-found" | "failed" | "interrupted" | "not-examined";

export interface GroundMinRow {
  n: number;
  status: GroundMinRowStatus;
  evaluations: number; admissible: number; uncertain: number; failed: number;
  /** Final checks performed for this count and their failure notes. */
  finalChecks: number; checkNotes: string[];
  /** Length search result (absent for "not-examined"). */
  search: GroundLengthResult | null;
}

export interface GroundMinCandidate {
  n: number;
  /** Verified admissible L that passed the final check (mm), with its stress (MPa). */
  L: number; maxStress: number;
  search: GroundLengthResult;
  verifiedSample: LengthSample;
}

export interface GroundMinDiagnostics {
  evaluations: number; finalChecks: number; admissible: number; uncertain: number; failed: number;
  elapsedMs: number; maxEvaluations: number; maxMs: number;
  examined: number[]; interrupted: number[]; notExamined: number[];
  stopCause: "candidate-found" | "ceiling-reached" | "evaluation-budget" | "time-budget";
}

interface Common {
  /** groundZ null: no ground (restrained without ground, V2-12). */
  scope: { maxSupports: number; hv: number; hl: number; groundZ: number | null };
  /** Restrained only: necessary axial bound, evaluated ONCE (independent of n). */
  axial?: MinAxialInfo;
  domain: { lower: number; upper: number };
  rows: GroundMinRow[];
  /** "certified" only for n = 0 (no smaller count exists); never for n > 0 here. */
  minimality: { certified: boolean; reason: string };
  lengthCoverage: { certified: false };
  completion: "normal" | "interrupted";
  diagnostics: GroundMinDiagnostics;
}

export type GroundMinResult =
  | (Common & { status: "found"; candidate: GroundMinCandidate })
  /** No candidate within the domain and ceiling; absence NOT certified. */
  | (Common & { status: "none-found"; candidate: null })
  | (Common & { status: "incomplete"; candidate: null; message: string })
  | { status: "invalid-input"; errors: string[] }
  | { status: "geometry-incompatible"; message: string }
  | { status: "not-implemented"; message: string }
  /** Restrained: whole domain excluded by the n-independent axial condition (proof). */
  | { status: "impossible"; message: string; axial: MinAxialInfo }
  /** Restrained: Lax equals Lmax within rounding. */
  | { status: "undecidable"; message: string; axial: MinAxialInfo }
  | { status: "numerical-failure"; message: string };

/** Necessary axial condition L >= Lax (restrained), shared by every count. */
export interface MinAxialInfo {
  Lax: number;
  excluded: { lower: number; upper: number } | null;
  sampled: { lower: number; upper: number } | null;
}

/** Global budget of the whole support-count search (all n and final checks). */
export const GM_MAX_EVALUATIONS = 2400;
export const GM_MAX_MS = 45000;
/** Final checks tried per count (admissible samples by increasing stress). */
export const GM_MAX_CHECKS = 5;
/** Restrained Min. supports (V2-12): explicit global budget, final checks
 *  included (NOT 21 x the Find L budget); restrained Find L checks at most
 *  RL_FINAL_CHECKS points per count inside it. */
export const RM_MAX_EVALUATIONS = 2400;
export const RM_MAX_MS = 45000;
