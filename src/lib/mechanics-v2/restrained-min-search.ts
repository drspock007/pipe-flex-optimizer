// créé par Giovanni Malagnino, 2026-09-26 20:05 CEST (Europe/Rome, UTC+2)
// Min. supports in axial mode "restrained" (V2-12), with or without ground.
// Per count n = 0, 1, ... (no bisection): restrained Find L on the same domain
// with the REMAINING global budget. Its own final check (independent complete
// restrained re-solve, lowest computed combined stress first, at most
// RL_FINAL_CHECKS points) is the candidate check: it is not repeated here and
// its solves are counted in the global budget.
// n-independent outcomes (invalid input, ground incompatibility, axial bound
// excluding the whole domain / undecidable / not representable) are decided
// ONCE, before any count is searched.

import { validateInput } from "./validate";
import { groundIncompatibility } from "./ground-length-search";
import { axialLengthBound, searchLengthRestrained } from "./restrained-length-search";
import type { LengthClassifier } from "./length-sampling";
import type { RestrainedLengthInput } from "./restrained-length-types";
import { GroundMinResult, MinAxialInfo, RM_MAX_EVALUATIONS, RM_MAX_MS } from "./ground-min-types";
import { CountStep, orchestrateMinSupports } from "./min-support-orchestrator";
import { clock } from "./ground-min-search";

export type RestrainedMinInput = RestrainedLengthInput;

export interface RestrainedMinLimits {
  maxEvaluations?: number; maxMs?: number; grid?: number;
  /** Test hook: simulated classifier per count (also used by the final check). */
  evaluate?: (n: number) => LengthClassifier;
  onProgress?: (p: { n: number; maxSupports: number; evaluations: number }) => void;
  now?: () => number;
}

export function searchMinSupportsRestrained(input: RestrainedMinInput, maxSupports: number, limits: RestrainedMinLimits = {}): GroundMinResult {
  if (!Number.isInteger(maxSupports) || maxSupports < 0 || maxSupports > 20) return { status: "invalid-input", errors: ["Support ceiling must be an integer 0..20"] };
  const { Lmin, Lmax, groundZ: gz, hv, hl } = input;
  const errors = validateInput({ ...input, L: 1, numSupports: 0, axialMode: "restrained" });
  if (gz !== undefined && !Number.isFinite(gz)) errors.push("groundZ must be a finite number");
  if (!Number.isFinite(Lmin) || !Number.isFinite(Lmax) || !(Lmin > 0) || !(Lmin < Lmax)) errors.push("Search domain requires finite 0 < Lmin < Lmax");
  if (errors.length) return { status: "invalid-input", errors };
  if (gz !== undefined && (gz > 0 || hv < gz)) return { status: "geometry-incompatible", message: groundIncompatibility(gz, hv) };
  const bound = axialLengthBound(hv, hl, input.E, input.sigmaAllow);
  if (!bound) return { status: "numerical-failure", message: "The axial bound hypot(hv, hl) sqrt(E / (2 sigmaAllow)) is not representable (overflow or underflow)" };
  const { Lax, relTol } = bound;
  const axial: MinAxialInfo = {
    Lax, excluded: Lax > Lmin ? { lower: Lmin, upper: Math.min(Lax, Lmax) } : null,
    sampled: Lax < Lmax && Math.abs(Lax - Lmax) > relTol * Lmax ? { lower: Math.max(Lmin, Lax), upper: Lmax } : null,
  };
  // The bound does not depend on n (supports only add vertical forces): decided once for all counts.
  if (Math.abs(Lax - Lmax) <= relTol * Lmax) return { status: "undecidable", axial, message: "Lax equals the search maximum length within rounding for every support count: the necessary bound neither excludes nor leaves a samplable domain" };
  if (Lax > Lmax) return { status: "impossible", axial, message: `Whole searched domain excluded for every support count by the necessary axial condition L >= Lax = ${Lax.toFixed(1)} mm > Lmax (independent of the installed supports)` };

  const now = limits.now ?? clock;
  const maxE = limits.maxEvaluations ?? RM_MAX_EVALUATIONS, maxMs = limits.maxMs ?? RM_MAX_MS;
  const step = (n: number, leftE: number, leftMs: number) => {
    const r = searchLengthRestrained(input, n, { maxEvaluations: leftE, maxMs: leftMs, grid: limits.grid, evaluate: limits.evaluate?.(n) });
    if (!("ranges" in r)) return r.status === "undecidable" ? { ...r, axial } : r;
    if (r.status === "impossible") return { status: "impossible" as const, message: r.message, axial };
    const fc = r.meta.finalCheck, ok = fc.attempts.find((x) => x.L === fc.L && x.cls === "admissible");
    const adm = r.samples.filter((s) => s.cls === "admissible").length;
    const out: CountStep = {
      search: r, evaluations: r.meta.totalEvaluations, finalChecks: fc.attempts.length,
      checkNotes: fc.attempts.filter((x) => x !== ok).map((x) => `L = ${x.L.toFixed(1)} mm: ${x.cls} (${x.status})`),
      verified: ok && ok.combinedMax !== null ? { L: ok.L, maxStress: ok.combinedMax } : null,
      checksCut: r.status === "incomplete" || (!ok && adm > 0 && fc.attempts.length < Math.min(adm, 3)),
    };
    return out;
  };
  return orchestrateMinSupports({ maxSupports, maxE, maxMs, now, scope: { hv, hl, groundZ: gz ?? null },
    domain: { lower: Lmin, upper: Lmax }, step, onProgress: limits.onProgress, axial });
}
