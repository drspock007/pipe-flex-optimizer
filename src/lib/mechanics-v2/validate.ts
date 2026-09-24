// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Strict input validation. Invalid inputs are reported, never silently corrected.

import { BiaxialInput, MAX_SUPPORTS } from "./types";

export function validateInput(input: BiaxialInput): string[] {
  const errors: string[] = [];
  const finite = (k: keyof BiaxialInput) => {
    const v = input[k];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      errors.push(`${k} must be a finite number`);
      return false;
    }
    return true;
  };
  for (const k of ["L", "E", "A", "I", "c", "sigmaAllow"] as const) {
    if (finite(k) && input[k] <= 0) errors.push(`${k} must be strictly positive`);
  }
  finite("hv");
  finite("hl");
  if (finite("q") && input.q < 0) errors.push("q must be >= 0 (downward load)");
  if (finite("numSupports")) {
    const n = input.numSupports;
    if (!Number.isInteger(n) || n < 0 || n > MAX_SUPPORTS) {
      errors.push(`numSupports must be an integer in [0, ${MAX_SUPPORTS}]`);
    }
  }
  if (input.axialMode !== "free" && input.axialMode !== "restrained") {
    errors.push('axialMode must be "free" or "restrained"');
  }
  return errors;
}
