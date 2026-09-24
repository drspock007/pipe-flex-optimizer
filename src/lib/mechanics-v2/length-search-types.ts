// créé par Giovanni Malagnino, 2026-09-24 03:38 CEST (Europe/Rome, UTC+2)
// Public contract of the analytical admissible-length search (0 or 1 support).
// "Admissible" means only: linear bending criterion maxStress <= sigmaAllow.
// Physical validity is not assessed. Non-finite bounds are null, never Infinity.

import { BiaxialInput } from "./types";

/** Engine inputs without imposed length or support count. */
export type LengthSearchInput = Omit<BiaxialInput, "L" | "numSupports">;

/** Only these configurations are covered by this analytical search. */
export type SearchedSupports = 0 | 1;
export const SEARCH_SCOPE = "supports-0-or-1" as const;

export interface LengthBound {
  /** Finite value in mm, or null when the bound is not finite. */
  value: number | null;
  included: boolean;
  /** "finite": value given; "zero-excluded": lower bound L -> 0+; "unbounded": no upper bound. */
  kind: "finite" | "zero-excluded" | "unbounded";
}

export interface StressInfimum {
  sigma: number; // MPa
  attained: boolean;
  /** Where the infimum is approached when not attained. */
  approachedAs: "L-optimum" | "L-to-zero" | "L-to-infinity" | "everywhere";
}

export interface LengthWindow {
  numSupports: SearchedSupports;
  status: "window" | "single-point" | "none";
  lower: LengthBound | null; // null when status = "none"
  upper: LengthBound | null;
  /** Finite optimum, present only when the minimum stress is attained at a unique L. */
  optimum: { Lopt: number; sigmaMin: number } | null;
  infimum: StressInfimum;
  /** Coefficients of sigmaMax(L) = hypot(av/L^2 + b L^2, al/L^2). */
  coefficients: { av: number; al: number; b: number; k: 12 | 48 };
  sigmaAllow: number;
}

export type FixedSupportsSearchResult =
  | { status: "ok"; scope: typeof SEARCH_SCOPE; window: LengthWindow }
  | { status: "invalid-input"; errors: string[] }
  | { status: "not-implemented"; message: string }
  | { status: "numerical-failure"; message: string };

export type MinSupportsSearchResult =
  | {
      status: "found";
      scope: typeof SEARCH_SCOPE;
      numSupports: SearchedSupports;
      window: LengthWindow;
      windows: LengthWindow[]; // every configuration evaluated, in order
    }
  | { status: "no-solution-in-0-or-1-support"; scope: typeof SEARCH_SCOPE; windows: LengthWindow[] }
  | { status: "invalid-input"; errors: string[] }
  | { status: "not-implemented"; message: string }
  | { status: "numerical-failure"; message: string };
