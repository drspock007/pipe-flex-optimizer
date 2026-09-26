// créé par Giovanni Malagnino, 2026-09-26 17:30 CEST (Europe/Rome, UTC+2)
// Find h in axial mode "restrained" (V2-10), with or without ground. Method:
//  1. Signed domain from the necessary axial bound (restrained-height-types.ts),
//     intersected with hv >= groundZ when the ground is enabled.
//  2. Shared adaptive sampler (ground-sampler.ts); every hv is solved by the
//     complete restrained solver (N and contacts recomputed at each hv).
//  3. Classification on the COMBINED criterion; uncertain verdict first;
//     bending-only compliance is never "admissible".
//  4. Final independent re-solve of the initially represented hv, in the budget.
// Coverage is never certified; a resource limit gives "incomplete".

import { validateInput } from "./validate";
import { solveBiaxialFixedLength } from "./solve";
import { solveGroundFixedLength } from "./ground-solve";
import { failureCause } from "./ground-classify";
import { runSampler } from "./ground-sampler";
import type { HeightSample } from "./ground-height-types";
import {
  AxialHeightBound, FinalCheckAttempt, RestrainedHeightInput, RestrainedHeightMeta, RestrainedHeightResult,
  RH_FINAL_CHECKS, RH_GRID, RH_MAX_EVALUATIONS, RH_MAX_MS, RH_MIN_STEP_DIV,
} from "./restrained-height-types";

export type RestrainedEvaluator = (hv: number) => Omit<HeightSample, "hv">;
export interface RestrainedHeightLimits { maxEvaluations?: number; maxMs?: number; grid?: number; evaluate?: RestrainedEvaluator }

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Necessary bound hv^2 + hl^2 <= 2 L^2 sA / E, computed without cancellation. */
export function axialHeightBound(sigmaAllow: number, L: number, E: number, hl: number): AxialHeightBound | null {
  const R = ((2 * sigmaAllow) / E) * L * L;
  if (!Number.isFinite(R) || R <= 0) return null;
  const s = Math.sqrt(R), a = Math.abs(hl);
  const radicand = (s - a) * (s + a);
  if (!Number.isFinite(radicand)) return null;
  const radicandTol = 64 * Number.EPSILON * Math.max(R, a * a);
  return { R, radicand, radicandTol, Hax: radicand >= 0 ? Math.sqrt(radicand) : null };
}

/** Complete restrained solve at one hv, classified on the combined criterion. */
export function classifyRestrained(input: RestrainedHeightInput & { numSupports: number }, hv: number): Omit<HeightSample, "hv"> {
  const { groundZ, ...b } = input;
  const inp = { ...b, hv, axialMode: "restrained" as const };
  const r = groundZ === undefined ? solveBiaxialFixedLength(inp) : solveGroundFixedLength({ ...inp, groundZ });
  if (r.status !== "ok") return { cls: "failed", maxStress: null, status: r.status, cause: failureCause(r) };
  const ax = r.axial;
  if (!ax) return { cls: "failed", maxStress: null, status: "missing-axial-report", cause: "solver-error" };
  if (!r.numericalValid) return { cls: "failed", maxStress: ax.combinedMax, status: "numerically-invalid", cause: failureCause(r) };
  if (ax.criterionUncertain) return { cls: "uncertain", maxStress: ax.combinedMax, status: "ok" };
  const met = ax.combinedCriterionMet && ax.combinedMax <= input.sigmaAllow;
  return { cls: met ? "admissible" : "not-admissible", maxStress: ax.combinedMax, status: "ok" };
}

export function searchHeightRestrained(input: RestrainedHeightInput, numSupports: number, limits: RestrainedHeightLimits = {}): RestrainedHeightResult {
  const errors = validateInput({ ...input, hv: 0, numSupports, axialMode: "restrained" });
  const gz = input.groundZ;
  if (gz !== undefined && !Number.isFinite(gz)) errors.push("groundZ must be a finite number");
  if (errors.length) return { status: "invalid-input", errors };
  if (gz !== undefined && gz > 0) return { status: "geometry-incompatible", message: `Imposed left end (z = 0) below the minimum pipe-axis elevation ${gz} mm` };
  const bound = axialHeightBound(input.sigmaAllow, input.L, input.E, input.hl);
  if (!bound) return { status: "numerical-failure", message: "The axial bound 2 L^2 sigmaAllow / E is not representable (overflow or underflow)" };

  const maxE = limits.maxEvaluations ?? RH_MAX_EVALUATIONS, maxMs = limits.maxMs ?? RH_MAX_MS;
  const meta: RestrainedHeightMeta = {
    axialMode: "restrained", groundEnabled: gz !== undefined, bound, domainOrigin: null,
    finalCheck: { hv: null, attempts: [] }, totalEvaluations: 0, budget: { maxEvaluations: maxE, maxMs },
  };
  const scope = { numSupports, L: input.L, hl: input.hl, groundZ: gz ?? null };
  const coverage0 = { certified: false as const, completion: "normal" as const, uncertainEvaluations: 0, failedEvaluations: 0 };
  const diag = (Hcap: number, evaluations: number, elapsedMs: number, tol = 0, minStep = 0) => ({ Hcap, evaluations, elapsedMs, boundaryTol: tol, minStep, maxEvaluations: maxE, maxMs });
  const empty = (reason: RestrainedHeightMeta["impossibleReason"]): RestrainedHeightResult => ({
    status: "impossible", scope, domain: null, ranges: [], zones: [], samples: [], largestFound: null,
    diagnostics: diag(bound.Hax ?? 0, 0, 0), coverage: coverage0, meta: { ...meta, impossibleReason: reason },
  });
  if (bound.Hax === null) {
    if (bound.radicand < -bound.radicandTol) return empty("lateral-offset");
    return { status: "undecidable", meta, message: "hl^2 equals 2 L^2 sigmaAllow / E within rounding: the necessary bound neither excludes nor admits hv = 0" };
  }
  const Hax = bound.Hax;
  const lo = gz === undefined ? -Hax : Math.max(gz, -Hax), hi = Hax, W = hi - lo;
  if (W < 0) return empty("ground-above-bound");
  meta.domainOrigin = { lower: gz !== undefined && gz > -Hax ? "ground-level" : "axial-bound", upper: "axial-bound" };

  const t0 = now(), evaluate = limits.evaluate ?? ((hv: number) => classifyRestrained({ ...input, numSupports }, hv));
  const minStep = W / RH_MIN_STEP_DIV, tol = Math.max(1e-6 * W, W > 0 ? Math.min(1e-3, W / 4) : 0);
  const r = runSampler({ lo, hi, grid: limits.grid ?? RH_GRID, minStep, tol, maxEvaluations: Math.max(0, maxE - RH_FINAL_CHECKS),
    maxMs, sigmaAllow: input.sigmaAllow, evaluate });

  // Final check: re-solve the largest verified admissible hv (then the next ones), within the global budget.
  const adm = r.samples.filter((x) => x.cls === "admissible").sort((a, b) => b.hv - a.hv);
  const attempts: FinalCheckAttempt[] = [];
  let checkedHv: number | null = null;
  for (const s of adm) {
    if (attempts.length >= RH_FINAL_CHECKS || r.samples.length + attempts.length >= maxE || now() - t0 > maxMs) break;
    const c = evaluate(s.hv);
    attempts.push({ hv: s.hv, cls: c.cls, combinedMax: c.maxStress, status: c.status });
    if (c.cls === "admissible") { checkedHv = s.hv; break; }
  }
  const elapsed = now() - t0, total = r.samples.length + attempts.length;
  const exhausted = r.exhausted || (adm.length > 0 && checkedHv === null && attempts.length < Math.min(adm.length, RH_FINAL_CHECKS));
  Object.assign(meta, { finalCheck: { hv: checkedHv, attempts }, totalEvaluations: total });
  const common = {
    scope, domain: { lower: lo, upper: hi }, ranges: r.ranges, zones: r.zones, samples: r.samples,
    largestFound: adm.length ? adm[0].hv : null, diagnostics: diag(Hax, total, elapsed, tol, minStep), meta,
    coverage: { certified: false as const, completion: exhausted ? "resource-limit" as const : "normal" as const, uncertainEvaluations: r.uncertain, failedEvaluations: r.failed },
  };
  if (exhausted) return { ...common, status: "incomplete", message: `Resource limit reached (${maxE} evaluations or ${Math.round(maxMs / 1000)} s, final check included): unexplored portions are reported as unresolved` };
  return { ...common, status: r.ranges.length ? "found" : "none-found" };
}
