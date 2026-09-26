// créé par Giovanni Malagnino, 2026-09-26 05:10 CEST (Europe/Rome, UTC+2)
// User-facing wording of Min. supports with ground (V2-8), shared by screen and PDF.
// "Found" and "demonstrated minimal" are kept distinct; only n = 0 is certified.

import { GroundMinResult, GroundMinRowStatus } from "@/lib/mechanics-v2";
import type { StatusText } from "./status-text";

export const ROW_LABEL: Record<GroundMinRowStatus, string> = {
  candidate: "candidate found",
  rejected: "admissible points rejected by the final check",
  "none-found": "no admissible point found",
  failed: "failure (all evaluations failed or uncertain)",
  interrupted: "search interrupted",
  "not-examined": "not examined (search stopped before this count)",
};

export const NOT_CERTIFIED_TITLE = "Smallest support count with a verified solution found — minimum not certified";
export const NONE_TITLE = "No admissible configuration found within the searched length domain and support-count limit — absence of solution not certified";

export function describeGroundMin(r: GroundMinResult): StatusText {
  switch (r.status) {
    case "found": return r.candidate.n === 0
      ? { tone: "ok", title: "0 installed supports suffice — minimum certified (0 is the smallest count); length coverage not certified", detail: r.minimality.reason }
      : { tone: "warn", title: `${NOT_CERTIFIED_TITLE}: ${r.candidate.n} installed support${r.candidate.n === 1 ? "" : "s"}`, detail: r.minimality.reason };
    case "none-found": return { tone: "warn", title: NONE_TITLE, detail: "Exploratory searches without an admissible point do not demonstrate impossibility, inside or outside the domain." };
    case "incomplete": return { tone: "warn", title: "Support-count search interrupted (global budget) — no candidate found so far, absence not certified", detail: r.message };
    case "invalid-input": return { tone: "error", title: "Invalid input", detail: r.errors.join("; ") };
    case "geometry-incompatible": return { tone: "error", title: "Geometric incompatibility", detail: r.message };
    case "not-implemented": return { tone: "info", title: "Not implemented", detail: r.message };
  }
}

const STOP: Record<string, string> = {
  "candidate-found": "stopped at the first count with a verified candidate",
  "ceiling-reached": "support-count ceiling reached",
  "evaluation-budget": "interrupted: global evaluation budget reached",
  "time-budget": "interrupted: global time budget reached",
};
const list = (a: number[]) => (a.length ? a.join(", ") : "none");

export function groundMinRows(r: GroundMinResult, fmt: (mm: number) => string, fmtS: (mpa: number) => string): [string, string][] {
  if (!("rows" in r)) return [];
  const d = r.diagnostics, rows: [string, string][] = [
    ["Searched length domain (exploration, not a mechanical bound)", `[${fmt(r.domain.lower)} ; ${fmt(r.domain.upper)}]`],
    ["Support-count ceiling", `${r.scope.maxSupports} (counts examined in order 0, 1, 2…; no bisection)`],
    ["Candidate", r.status === "found" ? `${r.candidate.n} installed support${r.candidate.n === 1 ? "" : "s"}, verified at L = ${fmt(r.candidate.L)} (${fmtS(r.candidate.maxStress)}, final check passed)` : "none"],
    ["Minimality", `${r.minimality.certified ? "CERTIFIED" : "NOT certified"} — ${r.minimality.reason}`],
    ["Length-search coverage", "NOT certified (exploratory sampling for every count)"],
    ["Algorithm completion", STOP[d.stopCause]],
    ["Counts examined / interrupted / not examined", `${list(d.examined)} / ${list(d.interrupted)} / ${list(d.notExamined)}`],
    ["Evaluations (admissible / uncertain / failed), final checks", `${d.evaluations} (${d.admissible} / ${d.uncertain} / ${d.failed}), ${d.finalChecks}`],
    ["Duration and global budget", `${(d.elapsedMs / 1000).toFixed(1)} s — budget ${d.maxEvaluations} evaluations, ${Math.round(d.maxMs / 1000)} s`],
  ];
  for (const x of r.rows) rows.push([`n = ${x.n}`, `${ROW_LABEL[x.status]}${x.search ? ` — ${x.evaluations} solves, ${x.admissible} admissible, ${x.uncertain} uncertain, ${x.failed} failed` : ""}${x.checkNotes.length ? `; final check failures: ${x.checkNotes.join("; ")}` : ""}`]);
  return rows;
}

export const GROUND_MIN_LIMITS =
  "Method: Find L with ground for n = 0, 1, … under one global budget (evaluations and time, final checks included). The first count whose admissible L passes an independent complete solve (valid, criterion met, not uncertain) is retained. " +
  "Only n = 0 is certified minimal (no smaller count exists). For n > 0 the minimum is NOT certified: an exploratory search without admissible point is not an impossibility proof. " +
  "A point solve already started may exceed the time limit slightly.";
