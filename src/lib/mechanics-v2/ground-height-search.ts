// créé par Giovanni Malagnino, 2026-09-25 22:40 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-26 04:30 CEST: sampling loop moved to ground-sampler.ts (V2-7).
// Find h with a rigid frictionless ground (V2-6). Method:
//  1. Domain [max(groundZ, -Hcap), Hcap] (Hcap justified in ground-height-types.ts).
//  2. Grid + adaptive refinement (ground-sampler.ts), each point solved by the
//     complete ground solver with its own mesh convergence (ground-classify.ts).
//  3. Every range bound IS a solved admissible sample; points between samples
//     are ESTIMATED, never verified. Coverage is never certified.
// Uncertain or failed evaluations are never used as "not admissible".
// Resource limits (evaluations, time) give "incomplete", never "no solution".

import { validateInput } from "./validate";
import { heightCap } from "./height-search";
import { GroundLimits } from "./ground-solve";
import { classifyGround } from "./ground-classify";
import { runSampler } from "./ground-sampler";
import { GH_GRID, GH_MAX_EVALUATIONS, GH_MAX_MS, GH_MIN_STEP_DIV, GroundHeightInput, GroundHeightResult, HeightSample } from "./ground-height-types";

/** Injectable evaluator (tests): returns the sample classification at hv. */
export type HeightEvaluator = (hv: number) => Omit<HeightSample, "hv">;
export interface GroundHeightLimits { maxEvaluations?: number; maxMs?: number; grid?: number; solve?: GroundLimits; evaluate?: HeightEvaluator }

export function searchHeightGround(input: GroundHeightInput, numSupports: number, limits: GroundHeightLimits = {}): GroundHeightResult {
  const errors = validateInput({ ...input, hv: 0, numSupports });
  if (typeof input.groundZ !== "number" || !Number.isFinite(input.groundZ)) errors.push("groundZ must be a finite number");
  if (errors.length) return { status: "invalid-input", errors };
  if (input.axialMode === "restrained") return { status: "not-implemented", message: 'axialMode "restrained": this free-mode search does not apply; Find h in restrained mode uses searchHeightRestrained' };
  if (input.groundZ > 0) return { status: "geometry-incompatible", message: `Imposed left end (z = 0) below the minimum pipe-axis elevation ${input.groundZ} mm` };
  let Hcap: number;
  try { Hcap = heightCap(input.sigmaAllow, input.L, input.E, input.c); }
  catch (e) { return { status: "invalid-input", errors: [(e as Error).message] }; }

  const maxE = limits.maxEvaluations ?? GH_MAX_EVALUATIONS, maxMs = limits.maxMs ?? GH_MAX_MS;
  const lo = Math.max(input.groundZ, -Hcap), hi = Hcap, W = hi - lo;
  const minStep = W / GH_MIN_STEP_DIV, tol = Math.max(1e-6 * W, 1e-3);
  const scope = { numSupports, L: input.L, hl: input.hl, groundZ: input.groundZ };
  const diag = (evaluations: number, elapsedMs: number) => ({ Hcap, evaluations, elapsedMs, boundaryTol: tol, minStep, maxEvaluations: maxE, maxMs });
  if (W < 0) return { status: "impossible", scope, domain: null, ranges: [], zones: [], samples: [], largestFound: null, diagnostics: diag(0, 0),
    coverage: { certified: false, completion: "normal", uncertainEvaluations: 0, failedEvaluations: 0 } };

  const r = runSampler({ lo, hi, grid: limits.grid ?? GH_GRID, minStep, tol, maxEvaluations: maxE, maxMs, sigmaAllow: input.sigmaAllow,
    evaluate: limits.evaluate ?? ((hv) => classifyGround({ ...input, hv, numSupports }, limits.solve)) });
  const adm = r.samples.filter((x) => x.cls === "admissible");
  const coverage = { certified: false as const, completion: r.exhausted ? "resource-limit" as const : "normal" as const, uncertainEvaluations: r.uncertain, failedEvaluations: r.failed };
  const common = { scope, domain: { lower: lo, upper: hi }, ranges: r.ranges, zones: r.zones, samples: r.samples,
    largestFound: adm.length ? adm[adm.length - 1].hv : null, diagnostics: diag(r.samples.length, r.elapsedMs), coverage };
  if (r.exhausted) return { ...common, status: "incomplete", message: `Resource limit reached (${maxE} evaluations or ${Math.round(maxMs / 1000)} s): unexplored portions are reported as unresolved` };
  return { ...common, status: r.ranges.length ? "found" : "none-found" };
}
