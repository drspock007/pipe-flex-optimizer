// créé par Giovanni Malagnino, 2026-09-26 20:05 CEST (Europe/Rome, UTC+2)
// V2-12: Min. supports in axial mode "restrained" (simulated orchestration and real solver).
import { describe, expect, it } from "vitest";
import { GroundMinResult, RestrainedMinInput, searchLengthRestrained, searchMinSupportsGround, searchMinSupportsRestrained, solveBiaxialFixedLength, solveGroundFixedLength } from "..";
import { REF, rel } from "./helpers";

const { L: _L, numSupports: _n, ...BASE } = REF;
const IN: RestrainedMinInput = { ...BASE, axialMode: "restrained", hv: 2500, Lmin: 7500, Lmax: 120000 };
type Pub = Extract<GroundMinResult, { rows: unknown }>;
const pub = (r: GroundMinResult): Pub => { if (!("rows" in r)) throw new Error(JSON.stringify(r)); return r; };
type Cls = "admissible" | "not-admissible" | "uncertain" | "failed";
const s = (cls: Cls) => ({ cls, maxStress: cls === "failed" ? null : cls === "admissible" ? 100 : 400, status: cls === "failed" ? "incomplete" : "ok" });
const sim = (f: (n: number, L: number, k: number) => Cls) => ({
  grid: 8, evaluate: (n: number) => { let k = 0; return (L: number) => s(f(n, L, k++)); },
});

describe("Min. supports restrained: orchestration (simulated)", () => {
  it("candidate at 0: certified; every other count listed not examined", () => {
    const r = pub(searchMinSupportsRestrained(IN, 5, sim(() => "admissible")));
    expect(r.status === "found" && r.candidate.n).toBe(0);
    expect(r.minimality.certified).toBe(true);
    expect(r.rows.slice(1).every((x) => x.status === "not-examined")).toBe(true);
    expect(r.axial?.Lax).toBeGreaterThan(0);
  });
  it("candidate at 1 after none at 0: not certified", () => {
    const r = pub(searchMinSupportsRestrained(IN, 3, sim((n) => (n === 0 ? "not-admissible" : "admissible"))));
    expect(r.status === "found" && r.candidate.n).toBe(1);
    expect(r.minimality.certified).toBe(false);
    expect(r.rows.map((x) => x.status)).toEqual(["none-found", "candidate", "not-examined", "not-examined"]);
  });
  it("failure at lower counts: candidate higher, not certified", () => {
    const r = pub(searchMinSupportsRestrained(IN, 4, sim((n) => (n < 2 ? "failed" : "admissible"))));
    expect(r.status === "found" && r.candidate.n).toBe(2);
    expect(r.rows[0].status).toBe("failed");
    expect(r.minimality.certified).toBe(false);
  });
  it("final check uncertain at n = 0: count rejected, checks counted, search continues", () => {
    const seen = new Map<number, Set<number>>();
    const r = pub(searchMinSupportsRestrained(IN, 3, { grid: 8, evaluate: (n) => (L) => {
      const m = seen.get(n) ?? new Set<number>(); seen.set(n, m);
      const again = m.has(L); m.add(L);
      return s(n === 0 && again ? "uncertain" : "admissible");
    } }));
    expect(r.status === "found" && r.candidate.n).toBe(1);
    expect(r.rows[0].status).toBe("rejected");
    expect(r.rows[0].finalChecks).toBe(3);
    expect(r.rows[0].checkNotes[0]).toMatch(/uncertain/);
    expect(r.diagnostics.finalChecks).toBe(3 + 1);
  });
  it("no candidate, ceiling 0 and ceiling 3", () => {
    expect(pub(searchMinSupportsRestrained(IN, 0, sim(() => "not-admissible"))).rows).toHaveLength(1);
    const r = pub(searchMinSupportsRestrained(IN, 3, sim(() => "not-admissible")));
    expect(r.status).toBe("none-found");
    expect(r.diagnostics.stopCause).toBe("ceiling-reached");
  });
  it("global budget exhausted: interrupted, remaining counts listed", () => {
    const r = pub(searchMinSupportsRestrained(IN, 6, { ...sim(() => "not-admissible"), maxEvaluations: 20 }));
    expect(r.status).toBe("incomplete");
    expect(r.diagnostics.evaluations).toBeLessThanOrEqual(20);
    expect(r.rows.map((x) => x.n)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(r.diagnostics.interrupted.length + r.diagnostics.notExamined.length).toBeGreaterThan(0);
  });
  it("n-independent outcomes are decided once, before any count", () => {
    let calls = 0;
    const count = { evaluate: () => () => { calls++; return s("admissible"); } };
    expect(searchMinSupportsRestrained({ ...IN, hv: 1e6 }, 20, count).status).toBe("impossible");
    expect(searchMinSupportsRestrained({ ...IN, groundZ: 10 }, 20, count).status).toBe("geometry-incompatible");
    expect(searchMinSupportsRestrained(IN, 21, count).status).toBe("invalid-input");
    expect(calls).toBe(0);
  });
});

describe("Min. supports restrained: real solver", () => {
  it("exactly flat pipe on the ground: candidate 0, analytical", { timeout: 60000 }, () => {
    const r = pub(searchMinSupportsRestrained({ ...IN, hv: 0, hl: 0, groundZ: 0 }, 20));
    expect(r.status === "found" && r.candidate.n).toBe(0);
    expect(r.minimality.certified).toBe(true);
    expect(r.diagnostics.failed).toBe(0);
  });
  it("candidate 0 without ground (hv = 0)", { timeout: 60000 }, () => {
    const r = pub(searchMinSupportsRestrained({ ...IN, hv: 0 }, 20));
    expect(r.status === "found" && r.candidate.n).toBe(0);
  });
  it("candidate > 0 (hv = 2500), independent re-solve, same as Find L restrained", { timeout: 60000 }, () => {
    const r = pub(searchMinSupportsRestrained(IN, 20));
    if (r.status !== "found") throw new Error(r.status);
    expect(r.candidate.n).toBeGreaterThan(0);
    expect(r.minimality.certified).toBe(false);
    const v = solveBiaxialFixedLength({ ...IN, L: r.candidate.L, numSupports: r.candidate.n });
    if (v.status !== "ok" || !v.axial) throw new Error("solve");
    expect(v.numericalValid && v.axial.combinedCriterionMet && !v.axial.criterionUncertain).toBe(true);
    expect(rel(v.axial.combinedMax, r.candidate.maxStress)).toBeLessThan(1e-9);
    const g = searchLengthRestrained(IN, r.candidate.n);
    expect("ranges" in g && g.ranges.length > 0).toBe(true);
    // Bending alone passes at n = 0 somewhere but the combined criterion never (V2-11 case): n = 0 has no candidate.
    expect(r.rows[0].status).not.toBe("candidate");
  });
  it("low ground agrees with no ground", { timeout: 60000 }, () => {
    const a = pub(searchMinSupportsRestrained(IN, 20)), b = pub(searchMinSupportsRestrained({ ...IN, groundZ: -1e7 }, 20));
    if (a.status !== "found" || b.status !== "found") throw new Error("status");
    expect(b.candidate.n).toBe(a.candidate.n);
    const g = solveGroundFixedLength({ ...IN, groundZ: -1e7, L: b.candidate.L, numSupports: b.candidate.n });
    expect(g.status === "ok" && g.axial && g.axial.combinedMax <= IN.sigmaAllow).toBe(true);
  });
  it("free Min. supports with ground unchanged (reference)", { timeout: 60000 }, () => {
    const r = pub(searchMinSupportsGround({ ...IN, axialMode: "free", hv: 1000, groundZ: 0 }, 20));
    expect(r.status === "found" && r.candidate.n).toBe(0);
  });
});
