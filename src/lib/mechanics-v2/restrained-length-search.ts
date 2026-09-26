// créé par Giovanni Malagnino, 2026-09-26 17:55 CEST (Europe/Rome, UTC+2)
// Find L in axial mode "restrained" (V2-11), with or without ground. Method:
//  1. Necessary axial bound Lax (restrained-length-types.ts): [Lmin, Lax) is
//     excluded by proof; the whole domain only when Lax > Lmax beyond rounding.
//  2. Shared ln L sampling (length-sampling.ts); every L solved by the complete
//     restrained solver and classified on the combined criterion
//     (classifyRestrained: uncertain first, bending-only never admissible).
//  3. Final independent re-solve of the lowest computed combined stress sample
//     (then the next ones), inside ONE global budget.
// Coverage is never certified; a resource limit gives "incomplete".

import { validateInput } from "./validate";
import { classifyRestrained } from "./restrained-height-search";
import { groundIncompatibility } from "./ground-length-search";
import { sampleLengths, LengthClassifier } from "./length-sampling";
import {
  AxialLengthBound, LengthFinalCheckAttempt, RestrainedLengthInput, RestrainedLengthMeta, RestrainedLengthResult,
  RL_FINAL_CHECKS, RL_GRID, RL_MAX_EVALUATIONS, RL_MAX_MS, RL_MIN_STEP_DIV,
} from "./restrained-length-types";

export interface RestrainedLengthLimits { maxEvaluations?: number; maxMs?: number; grid?: number; evaluate?: LengthClassifier }

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Lax = hypot(hv, hl) sqrt(E / (2 sA)), computed without overflow in the squares. */
export function axialLengthBound(hv: number, hl: number, E: number, sigmaAllow: number): AxialLengthBound | null {
  const k = Math.sqrt(E / (2 * sigmaAllow)), Lax = Math.hypot(hv, hl) * k;
  if (!Number.isFinite(k) || !(k > 0) || !Number.isFinite(Lax)) return null;
  return { Lax, relTol: 16 * Number.EPSILON };
}

export function searchLengthRestrained(input: RestrainedLengthInput, numSupports: number, limits: RestrainedLengthLimits = {}): RestrainedLengthResult {
  const { Lmin, Lmax, groundZ: gz, hv } = input;
  const errors = validateInput({ ...input, L: 1, numSupports, axialMode: "restrained" });
  if (gz !== undefined && !Number.isFinite(gz)) errors.push("groundZ must be a finite number");
  if (!Number.isFinite(Lmin) || !Number.isFinite(Lmax) || !(Lmin > 0) || !(Lmin < Lmax)) errors.push("Search domain requires finite 0 < Lmin < Lmax");
  if (errors.length) return { status: "invalid-input", errors };
  if (gz !== undefined && (gz > 0 || hv < gz)) return { status: "geometry-incompatible", message: groundIncompatibility(gz, hv) };
  const bound = axialLengthBound(hv, input.hl, input.E, input.sigmaAllow);
  if (!bound) return { status: "numerical-failure", message: "The axial bound hypot(hv, hl) sqrt(E / (2 sigmaAllow)) is not representable (overflow or underflow)" };

  const maxE = limits.maxEvaluations ?? RL_MAX_EVALUATIONS, maxMs = limits.maxMs ?? RL_MAX_MS;
  const { Lax, relTol } = bound;
  const meta: RestrainedLengthMeta = {
    axialMode: "restrained", groundEnabled: gz !== undefined, bound, requested: { lower: Lmin, upper: Lmax },
    excluded: Lax > Lmin ? { lower: Lmin, upper: Math.min(Lax, Lmax) } : null, sampled: null,
    finalCheck: { L: null, attempts: [] }, totalEvaluations: 0, budget: { maxEvaluations: maxE, maxMs },
  };
  const scope = { numSupports, hv, hl: input.hl, groundZ: gz ?? null };
  if (Math.abs(Lax - Lmax) <= relTol * Lmax) return { status: "undecidable", meta, message: "Lax equals the search maximum length within rounding: the necessary bound neither excludes nor leaves a samplable domain" };
  const empty = { scope, domain: { lower: Lmin, upper: Lmax }, ranges: [], zones: [], samples: [], boundaryHits: [], largestFound: null, lowestStress: null,
    diagnostics: { evaluations: 0, elapsedMs: 0, boundaryTolRel: 0, minStepRel: 0, maxEvaluations: maxE, maxMs },
    coverage: { certified: false as const, completion: "normal" as const, uncertainEvaluations: 0, failedEvaluations: 0 } };
  if (Lax > Lmax) return { ...empty, meta, status: "impossible", message: `Whole searched domain excluded by the necessary axial condition: L >= Lax = ${Lax.toFixed(1)} mm > Lmax` };

  const Ls = Math.max(Lmin, Lax);
  meta.sampled = { lower: Ls, upper: Lmax };
  const t0 = now();
  const { Lmin: _a, Lmax: _b, ...solveInput } = input;
  const evaluate = limits.evaluate ?? ((L: number) => classifyRestrained({ ...solveInput, L, numSupports }, hv));
  const s = sampleLengths({ Lmin, Ls, Lmax, grid: limits.grid ?? RL_GRID, minStepDiv: RL_MIN_STEP_DIV,
    maxEvaluations: Math.max(0, maxE - RL_FINAL_CHECKS), maxMs, sigmaAllow: input.sigmaAllow, evaluate });

  // Final check: lowest computed combined stress first, within the global budget.
  const adm = [...s.admissible].sort((a, b) => (a.maxStress as number) - (b.maxStress as number));
  const attempts: LengthFinalCheckAttempt[] = [];
  let checked: number | null = null;
  for (const x of adm) {
    if (attempts.length >= RL_FINAL_CHECKS || s.samples.length + attempts.length >= maxE || now() - t0 > maxMs) break;
    const c = evaluate(x.L);
    attempts.push({ L: x.L, cls: c.cls, combinedMax: c.maxStress, status: c.status });
    if (c.cls === "admissible") { checked = x.L; break; }
  }
  const total = s.samples.length + attempts.length;
  const exhausted = s.exhausted || (adm.length > 0 && checked === null && attempts.length < Math.min(adm.length, RL_FINAL_CHECKS));
  Object.assign(meta, { finalCheck: { L: checked, attempts }, totalEvaluations: total });
  const common = {
    ...empty, ranges: s.ranges, zones: s.zones, samples: s.samples, boundaryHits: s.boundaryHits, largestFound: s.largestFound, lowestStress: s.lowestStress,
    diagnostics: { ...s.diagnostics, evaluations: total, elapsedMs: now() - t0, maxEvaluations: maxE },
    coverage: { ...s.coverage, completion: exhausted ? "resource-limit" as const : "normal" as const }, meta,
  };
  if (exhausted) return { ...common, status: "incomplete", message: `Resource limit reached (${maxE} evaluations or ${Math.round(maxMs / 1000)} s, final check included): unexplored portions are reported as unresolved` };
  return { ...common, status: s.ranges.length ? "found" : "none-found" };
}
