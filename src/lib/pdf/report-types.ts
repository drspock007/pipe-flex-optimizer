// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Snapshot of a current, successful V2 result exported to PDF.

import { BiaxialSuccess } from "@/lib/mechanics-v2";

export interface V2Report {
  solution: BiaxialSuccess;
  /** Human-readable search status (search modes only). */
  searchStatus: string | null;
  /** Human-readable admissible ranges (search modes only). */
  ranges: string[];
}
