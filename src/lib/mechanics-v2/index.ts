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
export * from "./height-search-types";
export { searchHeightFixedSupports, heightCap } from "./height-search";
export * from "./ground-types";
export { solveGroundFixedLength } from "./ground-solve";
export type { GroundInput, GroundLimits } from "./ground-solve";
export * from "./ground-height-types";
export { searchHeightGround } from "./ground-height-search";
export type { HeightEvaluator } from "./ground-height-search";
export type { GroundHeightLimits } from "./ground-height-search";
export * from "./ground-length-types";
export { searchLengthGround } from "./ground-length-search";
export type { GroundLengthLimits, LengthEvaluator } from "./ground-length-search";
export * from "./ground-min-types";
export { searchMinSupportsGround } from "./ground-min-search";
export type { GroundMinLimits } from "./ground-min-search";
export * from "./restrained-types";
export { sampleRestrained } from "./restrained-fields";
export { solveRestrained } from "./restrained-solve";
export * from "./restrained-height-types";
export { searchHeightRestrained, axialHeightBound, classifyRestrained } from "./restrained-height-search";
export type { RestrainedEvaluator, RestrainedHeightLimits } from "./restrained-height-search";
export * from "./restrained-length-types";
export { searchLengthRestrained, axialLengthBound } from "./restrained-length-search";
export type { RestrainedLengthLimits } from "./restrained-length-search";
