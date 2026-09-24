// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Shared test fixtures for the V2 engine.

import { BiaxialInput, BiaxialSuccess, solveBiaxialFixedLength } from "..";

export const REF: BiaxialInput = {
  L: 30000, hv: 2500, hl: 0, E: 210000,
  A: 2047.8333482348326, I: 3010519.4980650246, c: 57.15,
  q: 0.1577005743975421, sigmaAllow: 287.2, numSupports: 0, axialMode: "free",
};

export function solveOk(over: Partial<BiaxialInput>): BiaxialSuccess {
  const r = solveBiaxialFixedLength({ ...REF, ...over });
  if (r.status !== "ok") throw new Error(`Unexpected status ${r.status}: ${JSON.stringify(r)}`);
  return r;
}

export const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-30);
