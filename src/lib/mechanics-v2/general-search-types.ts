// créé par Giovanni Malagnino, 2026-09-25 01:04 CEST (Europe/Rome, UTC+2)
// Public contract of the general admissible-length search (0..20 supports).
// "Admissible" means only: linear bending criterion maxStress <= sigmaAllow.
// Physical validity is not assessed. Non-finite bounds are null, never Infinity.

import { LengthBound } from "./length-search-types";
import { RegimeEvent } from "./regime-types";

export interface GeneralRange { lower: LengthBound; upper: LengthBound }

export interface GeneralInfimum {
  sigma: number; // MPa
  attained: boolean;
  approachedAs: "attained" | "L-to-zero" | "L-to-infinity" | "everywhere";
  /** Lengths where the minimum is attained (several = no unique optimum). */
  locations: number[];
}

export interface RegimeSummary {
  activeSet: number[]; // 1-based candidate supports in contact
  lower: LengthBound;
  upper: LengthBound;
  upperEvents: RegimeEvent[];
  minSigma: number;
}

export type GeneralFixedResult =
  | {
      status: "ok";
      scope: { numSupports: number };
      complete: true;
      ranges: GeneralRange[];
      infimum: GeneralInfimum;
      regimes: RegimeSummary[];
      physicalValidity: "not-assessed";
    }
  | {
      /** No admissible range published, but sigmaAllow lies within the tangency
       *  tolerance below a computed minimum: absence of solution is not proven. */
      status: "undecidable";
      scope: { numSupports: number };
      message: string;
      infimum: GeneralInfimum;
      regimes: RegimeSummary[];
    }
  | { status: "incomplete"; scope: { numSupports: number }; message: string; partialRanges: GeneralRange[]; regimes: RegimeSummary[] }
  | { status: "invalid-input"; errors: string[] }
  | { status: "not-implemented"; message: string }
  | { status: "numerical-failure"; message: string };

export interface EvaluatedCount {
  numSupports: number;
  status: "admissible" | "no-range" | "undecidable" | "incomplete" | "numerical-failure";
  message?: string;
}

export type GeneralMinResult =
  | { status: "found"; minimalityCertified: true; numSupports: number; result: Extract<GeneralFixedResult, { status: "ok" }>; evaluated: EvaluatedCount[] }
  | { status: "no-solution-in-scope"; maxSupports: number; evaluated: EvaluatedCount[] }
  | {
      status: "incomplete";
      maxSupports: number;
      message: string;
      /** Admissible count found after a failed lower count: minimality not certified. */
      candidate: { numSupports: number; result: Extract<GeneralFixedResult, { status: "ok" }> } | null;
      evaluated: EvaluatedCount[];
    }
  | { status: "invalid-input"; errors: string[] }
  | { status: "not-implemented"; message: string };
