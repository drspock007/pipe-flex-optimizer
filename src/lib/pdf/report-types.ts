// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Snapshot of a current, successful V2 result exported to PDF. Inputs and
// derived properties are those of the request that produced the solution.

import { BiaxialSuccess } from "@/lib/mechanics-v2";
import { AppInputs } from "@/lib/v2-app/inputs";
import { Derived } from "@/lib/v2-app/bridge";

export interface V2Report {
  /** Solve key of the request that produced the solution. */
  key: string;
  inputs: AppInputs;
  derived: Derived;
  solution: BiaxialSuccess;
  /** Human-readable search status (search modes only). */
  searchStatus: string | null;
  /** Human-readable admissible ranges (search modes only). */
  ranges: string[];
}
