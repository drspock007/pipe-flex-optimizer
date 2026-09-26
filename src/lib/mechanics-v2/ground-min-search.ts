// créé par Giovanni Malagnino, 2026-09-26 05:10 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-26 20:05 CEST: orchestration shared (min-support-orchestrator.ts, V2-12).
// Min. supports with ground (V2-8), free sliding: Find L with ground for
// n = 0, 1, ... in order under ONE global budget; final check = independent
// complete ground solve of admissible samples by increasing stress.

import { classifyGround } from "./ground-classify";
import { searchLengthGround, LengthEvaluator } from "./ground-length-search";
import type { GroundLimits } from "./ground-solve";
import type { HeightSample } from "./ground-height-types";
import { GM_MAX_CHECKS, GM_MAX_EVALUATIONS, GM_MAX_MS, GroundMinInput, GroundMinResult } from "./ground-min-types";
import { CountStep, orchestrateMinSupports } from "./min-support-orchestrator";

export interface GroundMinLimits {
  maxEvaluations?: number; maxMs?: number; grid?: number; solve?: GroundLimits;
  /** Test hooks: simulated length evaluator and final check per count. */
  evaluate?: (n: number) => LengthEvaluator;
  verify?: (n: number, L: number) => Omit<HeightSample, "hv">;
  /** Called before each count is examined. */
  onProgress?: (p: { n: number; maxSupports: number; evaluations: number }) => void;
  now?: () => number;
}

export const clock = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function searchMinSupportsGround(input: GroundMinInput, maxSupports: number, limits: GroundMinLimits = {}): GroundMinResult {
  if (!Number.isInteger(maxSupports) || maxSupports < 0 || maxSupports > 20) return { status: "invalid-input", errors: ["Support ceiling must be an integer 0..20"] };
  const now = limits.now ?? clock, t0 = now();
  const maxE = limits.maxEvaluations ?? GM_MAX_EVALUATIONS, maxMs = limits.maxMs ?? GM_MAX_MS;
  const verify = (n: number, L: number) => limits.verify ? limits.verify(n, L) : classifyGround({ ...input, L, numSupports: n }, limits.solve);
  const step = (n: number, leftE: number, leftMs: number) => {
    const r = searchLengthGround(input, n, { maxEvaluations: leftE, maxMs: leftMs, grid: limits.grid, solve: limits.solve, evaluate: limits.evaluate?.(n) });
    if (!("ranges" in r)) return r;
    if (r.status === "impossible") return { status: "not-implemented" as const, message: r.message };
    const adm = r.samples.filter((s) => s.cls === "admissible").sort((a, b) => (a.maxStress as number) - (b.maxStress as number));
    const out: CountStep = { search: r, evaluations: r.diagnostics.evaluations, finalChecks: 0, checkNotes: [], verified: null, checksCut: false };
    let used = r.diagnostics.evaluations;
    for (const s of adm.slice(0, GM_MAX_CHECKS)) {
      if (used >= leftE || now() - t0 > maxMs) { out.checksCut = true; break; }
      const v = verify(n, s.L); used++; out.finalChecks++; out.evaluations++;
      if (v.cls === "admissible" && v.maxStress !== null) { out.verified = { L: s.L, maxStress: v.maxStress }; break; }
      out.checkNotes.push(`L = ${s.L.toFixed(1)} mm: ${v.cls}${v.cause ? ` (${v.cause})` : ""}`);
    }
    return out;
  };
  return orchestrateMinSupports({ maxSupports, maxE, maxMs, now, scope: { hv: input.hv, hl: input.hl, groundZ: input.groundZ },
    domain: { lower: input.Lmin, upper: input.Lmax }, step, onProgress: limits.onProgress });
}
