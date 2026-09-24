// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Public entry point of the V2 mechanics engine (not wired to the UI yet).

export * from "./types";
export { solveBiaxialFixedLength } from "./solve";
export { evaluateAt, sampleCurve } from "./fields";
export type { CurveSample } from "./fields";
