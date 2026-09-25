// créé par Giovanni Malagnino, 2026-09-25 17:40 CEST (Europe/Rome, UTC+2)
// Public contract of the admissible end-offset search (Find h, V2-4).
// At fixed L, hl, section, material, load and installed support count, every
// signed range of hv (mm, positive upward) meeting maxStress <= sigmaAllow.
// Zero is an ordinary finite value. Physical validity is not assessed.

import { BiaxialInput } from "./types";
import { RegimeEvent } from "./regime-types";

/** Engine inputs without the vertical end offset (searched) nor the support count. */
export type HeightSearchInput = Omit<BiaxialInput, "hv" | "numSupports">;

export interface HeightBound { value: number; included: boolean } // mm, always finite
export interface HeightRange { lower: HeightBound; upper: HeightBound }

export interface HeightRegimeSummary {
  activeSet: number[]; // 1-based supports in contact
  lower: number; // mm
  upper: number; // mm
  upperEvents: RegimeEvent[];
  minSigma: number; // MPa, exact regime minimum over [lower, upper]
  minAt: number; // mm
}

export interface HeightMinimum { sigma: number; hv: number } // global minimum found

export interface HeightDiagnostics {
  /** Hcap = sigmaAllow L^2 / (4 E c): necessary bound |hv| <= Hcap (not sufficient). */
  Hcap: number;
  regimeCount: number;
  /** Regimes whose minimum lies within the tangency tolerance above sigmaAllow. */
  tangencyUncertainRegimes: number;
  /** Regimes whose bound is decided by a sign-uncertain coefficient. */
  ambiguousRegimes: number;
  elapsedMs: number;
}

interface Common {
  scope: { numSupports: number; L: number; hl: number };
  regimes: HeightRegimeSummary[];
  diagnostics: HeightDiagnostics;
}

export type HeightSearchResult =
  | (Common & {
      status: "ok";
      complete: true;
      ranges: HeightRange[];
      /** Most negative and most positive admissible hv. */
      extremes: { min: number; max: number };
      minimum: HeightMinimum;
      physicalValidity: "not-assessed";
    })
  /** Complete coverage of [-Hcap, Hcap] and every regime minimum certainly above sigmaAllow. */
  | (Common & { status: "no-solution"; minimum: HeightMinimum })
  /** No range published but a regime minimum is within the tangency tolerance. */
  | (Common & { status: "undecidable"; message: string; minimum: HeightMinimum })
  | (Common & { status: "incomplete"; message: string; partialRanges: HeightRange[] })
  | { status: "invalid-input"; errors: string[] }
  | { status: "not-implemented"; message: string }
  | { status: "numerical-failure"; message: string };
