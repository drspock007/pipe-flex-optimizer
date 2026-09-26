// créé par Giovanni Malagnino, 2026-09-26 17:55 CEST (Europe/Rome, UTC+2)
// Public contract of Find L in axial mode "restrained" (V2-11), with or without ground.
// Fixed hv, hl, section, material, q (total weight qL), supports x_i = iL/(n+1)
// at hv i/(n+1), optional groundZ; L searched in the requested domain [Lmin, Lmax].
// Each L is an initially straight pipe of that length (no prestress, axial end
// separation blocked): configurations are compared, no pipe is stretched.
//
// Necessary axial condition (same derivation as restrained-height-types.ts):
//   N/A >= E (hv^2 + hl^2) / (2 L^2)  and  combined >= N/A,
// so the combined criterion requires L >= Lax = hypot(hv, hl) sqrt(E / (2 sA)).
// Necessary, NOT sufficient; says nothing about bending; equality is never
// taken as admissibility (L = Lax itself is sampled and solved like any L).

import type { LengthSearchInput } from "./length-search-types";
import type { GroundLengthResult } from "./ground-length-types";
import type { SampleClass } from "./ground-height-types";

export type RestrainedLengthInput = LengthSearchInput & { groundZ?: number; Lmin: number; Lmax: number };

export interface AxialLengthBound {
  /** Lax (mm); 0 when hv = hl = 0 (no exclusion). */
  Lax: number;
  /** Relative rounding tolerance separating proof from indecision near Lmax. */
  relTol: number;
}

export interface LengthFinalCheckAttempt { L: number; cls: SampleClass; combinedMax: number | null; status: string }

export interface RestrainedLengthMeta {
  axialMode: "restrained";
  groundEnabled: boolean;
  bound: AxialLengthBound;
  requested: { lower: number; upper: number };
  /** Portion [lower, upper) excluded by the necessary condition; null when none. */
  excluded: { lower: number; upper: number } | null;
  /** Domain actually sampled; null when nothing is sampled. */
  sampled: { lower: number; upper: number } | null;
  /** Independent re-solve of the initially represented L (lowest computed combined stress first). */
  finalCheck: { L: number | null; attempts: LengthFinalCheckAttempt[] };
  totalEvaluations: number;
  budget: { maxEvaluations: number; maxMs: number };
}

type Ranged = Extract<GroundLengthResult, { ranges: unknown }>;

export type RestrainedLengthResult =
  | (Ranged & { meta: RestrainedLengthMeta })
  /** Lax equals Lmax within rounding: neither proof nor meaningful sampling. */
  | { status: "undecidable"; message: string; meta: RestrainedLengthMeta }
  /** Overflow / underflow of the bound: explicit failure. */
  | { status: "numerical-failure"; message: string }
  | { status: "invalid-input"; errors: string[] }
  | { status: "geometry-incompatible"; message: string };


/** One global budget per search, final check included. Measured: restrained
 *  solve ~5-30 ms per L, typical searches 60-120 solves (see V2-11 report). */
export const RL_MAX_EVALUATIONS = 500;
export const RL_MAX_MS = 25000;
export const RL_FINAL_CHECKS = 3;
export const RL_GRID = 32;
export const RL_MIN_STEP_DIV = 1024;
