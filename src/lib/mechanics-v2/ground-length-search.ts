// créé par Giovanni Malagnino, 2026-09-26 04:30 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-26 17:55 CEST: sampling moved to length-sampling.ts (V2-11).
// Find L with a rigid frictionless ground (V2-7). Same exploratory method as
// Find h (ground-sampler.ts) on u = ln L over [ln Lmin, ln Lmax]; each L is
// solved by the complete ground solver (mesh convergence, penetration,
// equilibrium, uncertainty). q stays fixed (total weight qL). Coverage is never
// certified; conclusions hold only within the searched domain.

import { validateInput } from "./validate";
import { GroundLimits } from "./ground-solve";
import { classifyGround } from "./ground-classify";
import { sampleLengths, LengthClassifier } from "./length-sampling";
import { GL_GRID, GL_MAX_EVALUATIONS, GL_MAX_MS, GL_MIN_STEP_DIV, GroundLengthInput, GroundLengthResult } from "./ground-length-types";

export type LengthEvaluator = LengthClassifier;
export interface GroundLengthLimits { maxEvaluations?: number; maxMs?: number; grid?: number; solve?: GroundLimits; evaluate?: LengthEvaluator }

export function searchLengthGround(input: GroundLengthInput, numSupports: number, limits: GroundLengthLimits = {}): GroundLengthResult {
  const { Lmin, Lmax, groundZ, hv } = input;
  const errors = validateInput({ ...input, L: 1, numSupports });
  if (typeof groundZ !== "number" || !Number.isFinite(groundZ)) errors.push("groundZ must be a finite number");
  if (!Number.isFinite(Lmin) || !Number.isFinite(Lmax) || !(Lmin > 0) || !(Lmin < Lmax)) errors.push("Search domain requires finite 0 < Lmin < Lmax");
  if (errors.length) return { status: "invalid-input", errors };
  if (input.axialMode === "restrained") return { status: "not-implemented", message: 'axialMode "restrained": Find L uses searchLengthRestrained (this path is free sliding only)' };
  if (groundZ > 0 || hv < groundZ) return { status: "geometry-incompatible", message: groundIncompatibility(groundZ, hv) };
  const maxE = limits.maxEvaluations ?? GL_MAX_EVALUATIONS, maxMs = limits.maxMs ?? GL_MAX_MS;
  const s = sampleLengths({ Lmin, Ls: Lmin, Lmax, grid: limits.grid ?? GL_GRID, minStepDiv: GL_MIN_STEP_DIV, maxEvaluations: maxE, maxMs, sigmaAllow: input.sigmaAllow,
    evaluate: (L) => (limits.evaluate ? limits.evaluate(L) : classifyGround({ ...input, L, numSupports }, limits.solve)) });
  const common = {
    scope: { numSupports, hv, hl: input.hl, groundZ }, domain: { lower: Lmin, upper: Lmax }, ranges: s.ranges, zones: s.zones, samples: s.samples,
    boundaryHits: s.boundaryHits, largestFound: s.largestFound, lowestStress: s.lowestStress, diagnostics: s.diagnostics, coverage: s.coverage,
  };
  if (s.exhausted) return { ...common, status: "incomplete", message: `Resource limit reached (${maxE} evaluations or ${Math.round(maxMs / 1000)} s): unexplored portions are reported as unresolved` };
  return { ...common, status: s.ranges.length ? "found" : "none-found" };
}

/** Imposed end levels below the ground: z(0) = 0 and z(L) = hv must be >= groundZ. */
export function groundIncompatibility(groundZ: number, hv: number): string {
  const which = [groundZ > 0 ? "left end (z = 0)" : "", hv < groundZ ? `right end (z = hv = ${hv} mm)` : ""].filter(Boolean).join(" and ");
  return `Imposed ${which} below the minimum pipe-axis elevation ${groundZ} mm`;
}
