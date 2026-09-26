// créé par Giovanni Malagnino, 2026-09-26 05:10 CEST (Europe/Rome, UTC+2)
// Min. supports with ground (V2-8): Find L with ground for n = 0, 1, ... in order,
// under ONE global budget (evaluations + time) shared by all counts and final
// checks. Limits are checked between evaluations: one point solve already
// started may exceed the time limit slightly (typically < 0.1 s).

import { classifyGround } from "./ground-classify";
import { searchLengthGround, LengthEvaluator } from "./ground-length-search";
import type { GroundLimits } from "./ground-solve";
import type { HeightSample } from "./ground-height-types";
import type { LengthSample } from "./ground-length-types";
import { GM_MAX_CHECKS, GM_MAX_EVALUATIONS, GM_MAX_MS, GroundMinCandidate, GroundMinDiagnostics, GroundMinInput, GroundMinResult, GroundMinRow } from "./ground-min-types";

export interface GroundMinLimits {
  maxEvaluations?: number; maxMs?: number; grid?: number; solve?: GroundLimits;
  /** Test hooks: simulated length evaluator and final check per count. */
  evaluate?: (n: number) => LengthEvaluator;
  verify?: (n: number, L: number) => Omit<HeightSample, "hv">;
  /** Called before each count is examined. */
  onProgress?: (p: { n: number; maxSupports: number; evaluations: number }) => void;
  now?: () => number;
}

const clock = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function searchMinSupportsGround(input: GroundMinInput, maxSupports: number, limits: GroundMinLimits = {}): GroundMinResult {
  if (!Number.isInteger(maxSupports) || maxSupports < 0 || maxSupports > 20) return { status: "invalid-input", errors: ["Support ceiling must be an integer 0..20"] };
  const now = limits.now ?? clock, t0 = now();
  const maxE = limits.maxEvaluations ?? GM_MAX_EVALUATIONS, maxMs = limits.maxMs ?? GM_MAX_MS;
  const rows: GroundMinRow[] = [];
  let used = 0, candidate: GroundMinCandidate | null = null, stop: GroundMinDiagnostics["stopCause"] = "ceiling-reached";
  const verify = (n: number, L: number) => limits.verify ? limits.verify(n, L) : classifyGround({ ...input, L, numSupports: n }, limits.solve);

  for (let n = 0; n <= maxSupports; n++) {
    const leftE = maxE - used, leftMs = maxMs - (now() - t0);
    if (leftE <= 0 || leftMs <= 0) { stop = leftE <= 0 ? "evaluation-budget" : "time-budget"; break; }
    limits.onProgress?.({ n, maxSupports, evaluations: used });
    const r = searchLengthGround(input, n, { maxEvaluations: leftE, maxMs: leftMs, grid: limits.grid, solve: limits.solve, evaluate: limits.evaluate?.(n) });
    if (!("ranges" in r)) return r; // invalid input, geometry, not implemented: global
    used += r.diagnostics.evaluations;
    const adm = r.samples.filter((s) => s.cls === "admissible").sort((a, b) => (a.maxStress as number) - (b.maxStress as number));
    const row: GroundMinRow = {
      n, status: "none-found", evaluations: r.diagnostics.evaluations, admissible: adm.length,
      uncertain: r.coverage.uncertainEvaluations, failed: r.coverage.failedEvaluations, finalChecks: 0, checkNotes: [], search: r,
    };
    // Final check: independent complete solve; valid, criterion met, not uncertain.
    for (const s of adm.slice(0, GM_MAX_CHECKS)) {
      if (used >= maxE || now() - t0 > maxMs) break;
      const v = verify(n, s.L); used++; row.finalChecks++;
      if (v.cls === "admissible" && v.maxStress !== null) {
        const verifiedSample: LengthSample = { L: s.L, cls: "admissible", maxStress: v.maxStress, status: "ok" };
        candidate = { n, L: s.L, maxStress: v.maxStress, search: r, verifiedSample };
        break;
      }
      row.checkNotes.push(`L = ${s.L.toFixed(1)} mm: ${v.cls}${v.cause ? ` (${v.cause})` : ""}`);
    }
    const allBad = r.samples.length > 0 && r.samples.every((s) => s.cls === "failed" || s.cls === "uncertain");
    row.status = candidate ? "candidate" : adm.length ? "rejected" : r.status === "incomplete" ? "interrupted" : allBad ? "failed" : "none-found";
    rows.push(row);
    if (candidate) { stop = "candidate-found"; break; }
    if (r.status === "incomplete" || (row.status === "rejected" && row.finalChecks < Math.min(adm.length, GM_MAX_CHECKS))) {
      if (row.status === "rejected") row.status = "interrupted";
      stop = used >= maxE ? "evaluation-budget" : "time-budget"; break;
    }
  }
  const last = rows.length ? rows[rows.length - 1].n : -1;
  // Every count above the last examined one is listed, whatever the stop cause
  // (candidate found = normal stop; budget = interruption, kept in stopCause).
  for (let n = last + 1; n <= maxSupports; n++)
    rows.push({ n, status: "not-examined", evaluations: 0, admissible: 0, uncertain: 0, failed: 0, finalChecks: 0, checkNotes: [], search: null });

  const sum = (k: "admissible" | "uncertain" | "failed") => rows.reduce((a, x) => a + x[k], 0);
  const completion = stop === "candidate-found" || stop === "ceiling-reached" ? "normal" as const : "interrupted" as const;
  const lower = rows.filter((x) => candidate && x.n < candidate.n);
  const minimality = candidate === null
    ? { certified: false, reason: "No candidate found." }
    : candidate.n === 0
    ? { certified: true, reason: "0 is the smallest possible installed count (certified in the model, at the retained numerical precision; length coverage not certified)." }
    : { certified: false, reason: `Lower counts (${lower.map((x) => `${x.n}: ${x.status}`).join(", ")}) were not excluded by a proof over the whole domain; an exploratory search without admissible point is not an impossibility proof.` };
  const common = {
    scope: { maxSupports, hv: input.hv, hl: input.hl, groundZ: input.groundZ }, domain: { lower: input.Lmin, upper: input.Lmax }, rows, minimality,
    lengthCoverage: { certified: false as const }, completion,
    diagnostics: {
      evaluations: used, finalChecks: rows.reduce((a, x) => a + x.finalChecks, 0), admissible: sum("admissible"), uncertain: sum("uncertain"), failed: sum("failed"),
      elapsedMs: now() - t0, maxEvaluations: maxE, maxMs,
      examined: rows.filter((x) => x.status !== "not-examined" && x.status !== "interrupted").map((x) => x.n),
      interrupted: rows.filter((x) => x.status === "interrupted").map((x) => x.n),
      notExamined: rows.filter((x) => x.status === "not-examined").map((x) => x.n), stopCause: stop,
    },
  };
  if (candidate) return { ...common, status: "found", candidate };
  if (completion === "interrupted") return { ...common, status: "incomplete", candidate: null, message: `Global budget reached (${maxE} evaluations or ${Math.round(maxMs / 1000)} s) before the ceiling` };
  return { ...common, status: "none-found", candidate: null };
}
