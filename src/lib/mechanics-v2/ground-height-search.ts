// créé par Giovanni Malagnino, 2026-09-25 22:40 CEST (Europe/Rome, UTC+2)
// Find h with a rigid frictionless ground (V2-6). Method:
//  1. Domain [max(groundZ, -Hcap), Hcap] (Hcap justified in ground-height-types.ts).
//  2. Uniform grid of GH_GRID intervals, each point solved by the complete
//     ground solver (solveGroundFixedLength) with its own mesh convergence.
//  3. Adaptive refinement: verdict changes are bisected down to boundaryTol;
//     same-verdict intervals are split until covered (ground-height-build.ts)
//     or minStep is reached; solver failures are split down to minStep.
//  4. Every range bound IS a solved admissible sample; points between samples
//     are ESTIMATED, never verified. Coverage is never certified.
// Uncertain or failed evaluations are never used as "not admissible".
// Resource limits (evaluations, time) give "incomplete", never "no solution".

import { validateInput } from "./validate";
import { heightCap } from "./height-search";
import { solveGroundFixedLength, GroundLimits } from "./ground-solve";
import { assemble, needsSplit, slopeBound } from "./ground-height-build";
import {
  GH_GRID, GH_MAX_EVALUATIONS, GH_MAX_MS, GH_MIN_STEP_DIV, GH_SLOPE_SAFETY,
  GroundHeightInput, GroundHeightResult, HeightSample,
} from "./ground-height-types";

/** Injectable evaluator (tests): returns the sample classification at hv. */
export type HeightEvaluator = (hv: number) => Omit<HeightSample, "hv">;
export interface GroundHeightLimits { maxEvaluations?: number; maxMs?: number; grid?: number; solve?: GroundLimits; evaluate?: HeightEvaluator }

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function searchHeightGround(input: GroundHeightInput, numSupports: number, limits: GroundHeightLimits = {}): GroundHeightResult {
  const errors = validateInput({ ...input, hv: 0, numSupports });
  if (typeof input.groundZ !== "number" || !Number.isFinite(input.groundZ)) errors.push("groundZ must be a finite number");
  if (errors.length) return { status: "invalid-input", errors };
  if (input.axialMode === "restrained") return { status: "not-implemented", message: 'axialMode "restrained" is not implemented' };
  if (input.groundZ > 0) return { status: "geometry-incompatible", message: `Imposed left end (z = 0) below the minimum pipe-axis elevation ${input.groundZ} mm` };
  let Hcap: number;
  try { Hcap = heightCap(input.sigmaAllow, input.L, input.E, input.c); }
  catch (e) { return { status: "invalid-input", errors: [(e as Error).message] }; }

  const t0 = now();
  const maxE = limits.maxEvaluations ?? GH_MAX_EVALUATIONS, maxMs = limits.maxMs ?? GH_MAX_MS, N = limits.grid ?? GH_GRID;
  const lo = Math.max(input.groundZ, -Hcap), hi = Hcap, W = hi - lo;
  const minStep = W / GH_MIN_STEP_DIV, tol = Math.max(1e-6 * W, 1e-3);
  const scope = { numSupports, L: input.L, hl: input.hl, groundZ: input.groundZ };
  const diag = () => ({ Hcap, evaluations: map.size, elapsedMs: now() - t0, boundaryTol: tol, minStep, maxEvaluations: maxE, maxMs });
  const map = new Map<number, HeightSample>();
  if (W < 0) return { status: "impossible", scope, domain: null, ranges: [], zones: [], samples: [], largestFound: null, diagnostics: diag(),
    coverage: { certified: false, completion: "normal", uncertainEvaluations: 0, failedEvaluations: 0 } };

  let exhausted = false;
  const evalAt = (hv: number): HeightSample | null => {
    const c = map.get(hv);
    if (c) return c;
    if (map.size >= maxE || now() - t0 > maxMs) { exhausted = true; return null; }
    let s: HeightSample;
    if (limits.evaluate) { s = { hv, ...limits.evaluate(hv) }; map.set(hv, s); return s; }
    const r = solveGroundFixedLength({ ...input, hv, numSupports }, limits.solve);
    if (r.status !== "ok") s = { hv, cls: "failed", maxStress: null, status: r.status };
    else if (!r.numericalValid) s = { hv, cls: "failed", maxStress: r.maxStress, status: "numerically-invalid" };
    else if (r.ground?.criterionUncertain) s = { hv, cls: "uncertain", maxStress: r.maxStress, status: "ok" };
    else s = { hv, cls: r.maxStress <= input.sigmaAllow ? "admissible" : "not-admissible", maxStress: r.maxStress, status: "ok" };
    map.set(hv, s);
    return s;
  };

  if (W === 0) evalAt(lo);
  else for (let i = 0; i <= N; i++) evalAt(i === N ? hi : lo + (W * i) / N);

  const sorted = () => [...map.values()].sort((a, b) => a.hv - b.hv);
  let pending: [number, number][] = [];
  for (let changed = true; changed && !exhausted; ) {
    changed = false;
    const s = sorted(), S = slopeBound(s, input.sigmaAllow, minStep, GH_SLOPE_SAFETY);
    for (let i = 0; i + 1 < s.length; i++) {
      if (!needsSplit(s, i, input.sigmaAllow, S, tol, minStep)) continue;
      if (evalAt(0.5 * (s[i].hv + s[i + 1].hv)) === null) break;
      changed = true;
    }
  }
  const s = sorted(), S = slopeBound(s, input.sigmaAllow, minStep, GH_SLOPE_SAFETY);
  if (exhausted) pending = s.slice(0, -1).flatMap((a, i) => (needsSplit(s, i, input.sigmaAllow, S, tol, minStep) ? [[a.hv, s[i + 1].hv] as [number, number]] : []));
  if (exhausted && s.length && s[s.length - 1].hv < hi) pending.push([s[s.length - 1].hv, hi]); // unexplored tail
  const { zones, ranges } = assemble(s, input.sigmaAllow, S, minStep, pending);
  const adm = s.filter((x) => x.cls === "admissible");
  const coverage = { certified: false as const, completion: exhausted ? "resource-limit" as const : "normal" as const,
    uncertainEvaluations: s.filter((x) => x.cls === "uncertain").length, failedEvaluations: s.filter((x) => x.cls === "failed").length };
  const common = { scope, domain: { lower: lo, upper: hi }, ranges, zones, samples: s, largestFound: adm.length ? adm[adm.length - 1].hv : null, diagnostics: diag(), coverage };
  if (exhausted) return { ...common, status: "incomplete", message: `Resource limit reached (${maxE} evaluations or ${Math.round(maxMs / 1000)} s): unexplored portions are reported as unresolved` };
  return { ...common, status: ranges.length ? "found" : "none-found" };
}
