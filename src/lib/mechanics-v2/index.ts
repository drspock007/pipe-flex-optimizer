// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni malagnino, 2026-09-25 01:04 CEST (Europe/Rome, UTC+2)
// Public entry point of the V2 mechanics engine (not wired to the UI yet).

export * from "./types";
export { solveBiaxialFixedLength } from "./solve";
export { evaluateAt, sampleCurve } from "./fields";
export type { CurveSample } from "./fields";
export * from "./length-search-types";
export { searchLengthFixedSupports, searchMinSupportsLength, analyticSigmaMax, TANGENCY_REL_TOL } from "./length-search";
export { verifyWindowWithEngine, VERIFY_REL_TOL } from "./length-verify";
export type { LengthCheck } from "./length-verify";
export * from "./regime-types";
export { computeRegime, intersectRegime, evaluateRegime, EVENT_REL_TOL, ZERO_REL_TOL, UNCERTAIN_REL_TOL } from "./regime";
export { loadLengthScale } from "./regime";
export * from "./general-search-types";
export { searchLengthGeneral, searchMinSupportsGeneral } from "./general-search";
export type { LengthRange, RegimeMin } from "./window-search";
