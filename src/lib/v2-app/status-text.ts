// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-25 17:40 CEST (Europe/Rome, UTC+2): Find h (V2-4).
// User-facing description of V2 search outcomes. Each engine status keeps its
// own wording: an incomplete or undecidable search never reads as "no solution"
// or as a certified minimum.

import { SearchOutcome } from "./protocol";

export type Tone = "ok" | "warn" | "error" | "info";
export interface StatusText { tone: Tone; title: string; detail?: string }

const plural = (n: number) => `${n} installed support${n === 1 ? "" : "s"}`;

export function describeSearch(o: SearchOutcome): StatusText {
  if (o.kind === "findH") {
    const r = o.result;
    switch (r.status) {
      case "ok": return { tone: "ok", title: `${r.ranges.length} admissible hv range${r.ranges.length > 1 ? "s" : ""} with ${plural(r.scope.numSupports)}` };
      case "no-solution": return { tone: "warn", title: `No admissible hv with ${plural(r.scope.numSupports)} at this L`, detail: "Demonstrated: complete regime coverage of the necessary domain |hv| <= Hcap." };
      case "undecidable": return { tone: "warn", title: "Numerically undecidable", detail: "The allowable stress is within the tangency tolerance below the minimum stress. No hv is published; absence of solution is not proven." };
      case "incomplete": return { tone: "warn", title: "Search incomplete", detail: r.message };
      case "invalid-input": return { tone: "error", title: "Invalid input", detail: r.errors.join("; ") };
      case "not-implemented": return { tone: "info", title: "Not implemented", detail: r.message };
      case "numerical-failure": return { tone: "error", title: "Numerical failure", detail: r.message };
    }
  }
  if (o.kind === "searchLength") {
    const r = o.result;
    switch (r.status) {
      case "ok":
        return r.ranges.length
          ? { tone: "ok", title: `${r.ranges.length} admissible length range${r.ranges.length > 1 ? "s" : ""} with ${r.scope.numSupports} installed support${r.scope.numSupports === 1 ? "" : "s"}` }
          : { tone: "warn", title: `No admissible length with ${r.scope.numSupports} installed support${r.scope.numSupports === 1 ? "" : "s"}`, detail: "Demonstrated for this support count (complete regime coverage)." };
      case "undecidable":
        return { tone: "warn", title: "Numerically undecidable", detail: "The allowable stress is within the tangency tolerance below the minimum stress. No admissible length is published; absence of solution is not proven." };
      case "incomplete":
        return { tone: "warn", title: "Search incomplete", detail: r.message };
      case "invalid-input":
        return { tone: "error", title: "Invalid input", detail: r.errors.join("; ") };
      case "not-implemented":
        return { tone: "info", title: "Not implemented", detail: r.message };
      case "numerical-failure":
        return { tone: "error", title: "Numerical failure", detail: r.message };
    }
  }
  const r = o.result;
  switch (r.status) {
    case "found":
      return { tone: "ok", title: `Minimum: ${r.numSupports} installed support${r.numSupports === 1 ? "" : "s"} (certified within 0–${r.evaluated.length - 1})` };
    case "no-solution-in-scope":
      return { tone: "warn", title: `No admissible length with 0 to ${r.maxSupports} installed supports`, detail: "Demonstrated within the studied scope only." };
    case "incomplete":
      return r.candidate
        ? { tone: "warn", title: `${r.candidate.numSupports} installed supports admissible — minimality NOT certified`, detail: r.message }
        : { tone: "warn", title: "Search incomplete", detail: r.message };
    case "invalid-input":
      return { tone: "error", title: "Invalid input", detail: r.errors.join("; ") };
    case "not-implemented":
      return { tone: "info", title: "Not implemented", detail: r.message };
  }
}
