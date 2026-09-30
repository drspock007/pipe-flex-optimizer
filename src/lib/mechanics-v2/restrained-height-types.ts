// créé par Giovanni Malagnino, 2026-09-26 17:30 CEST (Europe/Rome, UTC+2)
// Public contract of Find h in axial mode "restrained" (V2-10), with or without ground.
// Fixed L, hl, section, material, q, supports and optional groundZ; hv is searched.
//
// Necessary axial bound (restrained model only). Compatibility gives
//   N/A = E/(2L) int_0^L (z'^2 + y'^2) dx.
// Cauchy-Schwarz with int z' = hv and int y' = hl (exact on the discrete Hermite
// field too, since nodal values are imposed) gives int z'^2 >= hv^2/L, hence
//   N/A >= E (hv^2 + hl^2) / (2 L^2).
// The combined stress is N/A + max bending >= N/A (N >= 0), so the combined
// criterion requires N/A <= sigmaAllow, i.e. hv^2 + hl^2 <= 2 L^2 sigmaAllow / E.
// Necessary, NOT sufficient; it validates nothing about bending. The free-mode
// curvature bound Hcap is not reused (not derived for this model).

import type { HeightSearchInput } from "./height-search-types";
import type { GroundHeightResult, SampleClass } from "./ground-height-types";

export type RestrainedHeightInput = HeightSearchInput & { groundZ?: number };

export interface AxialHeightBound {
  /** R = 2 L^2 sigmaAllow / E (mm^2) and radicand R - hl^2 (mm^2). */
  R: number;
  radicand: number;
  /** Hax = sqrt(R - hl^2) (mm), null when the radicand is negative. */
  Hax: number | null;
  /** Absolute tolerance on the radicand used to separate proof from indecision (mm^2). */
  radicandTol: number;
}

export interface FinalCheckAttempt { hv: number; cls: SampleClass; combinedMax: number | null; status: string }

export interface RestrainedHeightMeta {
  axialMode: "restrained";
  groundEnabled: boolean;
  bound: AxialHeightBound;
  domainOrigin: { lower: "axial-bound" | "ground-level"; upper: "axial-bound" } | null;
  /** Independent re-solve of the initially represented hv (largest verified admissible first). */
  finalCheck: { hv: number | null; attempts: FinalCheckAttempt[] };
  /** Evaluations including the final check, and the global budget. */
  totalEvaluations: number;
  budget: { maxEvaluations: number; maxMs: number };
  /** Justification when status is "impossible". */
  impossibleReason?: "lateral-offset" | "ground-above-bound";
}

type Ranged = Extract<GroundHeightResult, { ranges: unknown }>;

export type RestrainedHeightResult =
  | (Ranged & { meta: RestrainedHeightMeta })
  /** Radicand negative within its rounding tolerance: neither proof nor search. */
  | { status: "undecidable"; message: string; meta: RestrainedHeightMeta }
  /** Overflow / underflow of the bound: explicit failure, never an artificial domain. */
  | { status: "numerical-failure"; message: string }
  | { status: "invalid-input"; errors: string[] }
  | { status: "geometry-incompatible"; message: string };

/** One global budget per search, final check included (restrained solve ~5-30 ms). */
export const RH_MAX_EVALUATIONS = 500;
export const RH_MAX_MS = 25000;
export const RH_FINAL_CHECKS = 3;
export const RH_GRID = 32;
export const RH_MIN_STEP_DIV = 1024;
