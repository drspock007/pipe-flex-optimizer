// créé par Giovanni Malagnino, 2026-09-26 20:05 CEST (Europe/Rome, UTC+2)
// Shared orchestration of Min. supports searches (with ground V2-8, restrained
// V2-12): counts n = 0, 1, ... in order (no bisection), ONE global budget
// (evaluations + time) shared by every count and every final check. Limits are
// checked between evaluations: one point solve already started may exceed the
// time limit slightly (typically < 0.1 s). The per-count step (length search +
// final check) is supplied by the caller; the orchestrator never re-runs a
// check the step already performed.

import type { GroundLengthResult } from "./ground-length-types";
import type { LengthSample } from "./ground-length-types";
import type { MinAxialInfo, GroundMinCandidate, GroundMinDiagnostics, GroundMinResult, GroundMinRow } from "./ground-min-types";

type Ranged = Extract<GroundLengthResult, { ranges: unknown }>;
type Global = Exclude<GroundMinResult, { rows: unknown }>;

/** Result of one count: length search, final-check outcome and its accounting. */
export interface CountStep {
  search: Ranged;
  /** Evaluations of this count, final checks included. */
  evaluations: number;
  finalChecks: number; checkNotes: string[];
  /** L that passed the final check, with its re-solved stress. */
  verified: { L: number; maxStress: number } | null;
  /** True when admissible points remained unchecked for lack of budget. */
  checksCut: boolean;
}

export interface OrchestratorArgs {
  maxSupports: number; maxE: number; maxMs: number; now: () => number;
  scope: { hv: number; hl: number; groundZ: number | null };
  domain: { lower: number; upper: number };
  step: (n: number, leftE: number, leftMs: number) => CountStep | Global;
  onProgress?: (p: { n: number; maxSupports: number; evaluations: number }) => void;
  axial?: MinAxialInfo;
}

export function orchestrateMinSupports(a: OrchestratorArgs): GroundMinResult {
  const { maxSupports, maxE, maxMs, now } = a, t0 = now();
  const rows: GroundMinRow[] = [];
  let used = 0, candidate: GroundMinCandidate | null = null, stop: GroundMinDiagnostics["stopCause"] = "ceiling-reached";

  for (let n = 0; n <= maxSupports; n++) {
    const leftE = maxE - used, leftMs = maxMs - (now() - t0);
    if (leftE <= 0 || leftMs <= 0) { stop = leftE <= 0 ? "evaluation-budget" : "time-budget"; break; }
    a.onProgress?.({ n, maxSupports, evaluations: used });
    const st = a.step(n, leftE, leftMs);
    if (!("search" in st)) return st; // global outcome, independent of n
    const r = st.search;
    used += st.evaluations;
    const adm = r.samples.filter((s) => s.cls === "admissible").length;
    const row: GroundMinRow = {
      n, status: "none-found", evaluations: st.evaluations, admissible: adm,
      uncertain: r.coverage.uncertainEvaluations, failed: r.coverage.failedEvaluations, finalChecks: st.finalChecks, checkNotes: st.checkNotes, search: r,
    };
    if (st.verified) {
      const verifiedSample: LengthSample = { L: st.verified.L, cls: "admissible", maxStress: st.verified.maxStress, status: "ok" };
      candidate = { n, L: st.verified.L, maxStress: st.verified.maxStress, search: r, verifiedSample };
    }
    const allBad = r.samples.length > 0 && r.samples.every((s) => s.cls === "failed" || s.cls === "uncertain");
    row.status = candidate ? "candidate" : adm ? "rejected" : r.status === "incomplete" ? "interrupted" : allBad ? "failed" : "none-found";
    rows.push(row);
    if (candidate) { stop = "candidate-found"; break; }
    if (r.status === "incomplete" || (row.status === "rejected" && st.checksCut)) {
      row.status = "interrupted";
      // Time is the only limit that can be tested unambiguously: the restrained step keeps a
      // final-check reserve, so an evaluation-limited stop may leave used < maxE.
      stop = now() - t0 >= maxMs ? "time-budget" : "evaluation-budget"; break;
    }
  }
  const last = rows.length ? rows[rows.length - 1].n : -1;
  // Every count above the last examined one is listed, whatever the stop cause.
  for (let n = last + 1; n <= maxSupports; n++)
    rows.push({ n, status: "not-examined", evaluations: 0, admissible: 0, uncertain: 0, failed: 0, finalChecks: 0, checkNotes: [], search: null });

  const sum = (k: "admissible" | "uncertain" | "failed") => rows.reduce((s, x) => s + x[k], 0);
  const completion = stop === "candidate-found" || stop === "ceiling-reached" ? "normal" as const : "interrupted" as const;
  const lower = rows.filter((x) => candidate && x.n < candidate.n);
  const minimality = candidate === null
    ? { certified: false, reason: "No candidate found." }
    : candidate.n === 0
    ? { certified: true, reason: "0 is the smallest possible installed count (certified in the model, at the retained numerical precision; length coverage not certified)." }
    : { certified: false, reason: `Lower counts (${lower.map((x) => `${x.n}: ${x.status}`).join(", ")}) were not excluded by a proof over the whole domain; an exploratory search without admissible point is not an impossibility proof.` };
  const common = {
    scope: { maxSupports, ...a.scope }, domain: a.domain, rows, minimality, axial: a.axial,
    lengthCoverage: { certified: false as const }, completion,
    diagnostics: {
      evaluations: used, finalChecks: rows.reduce((s, x) => s + x.finalChecks, 0), admissible: sum("admissible"), uncertain: sum("uncertain"), failed: sum("failed"),
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
