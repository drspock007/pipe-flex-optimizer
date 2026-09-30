// créé par Giovanni Malagnino, 2026-09-26 05:10 CEST (Europe/Rome, UTC+2)
// V2-8: Min. supports with ground (simulated orchestration and real solver).
import { describe, expect, it } from "vitest";
import { GroundMinInput, GroundMinResult, searchLengthGround, searchMinSupportsGround, solveBiaxialFixedLength, solveGroundFixedLength } from "..";
import { REF, rel } from "./helpers";

const { L: _L, numSupports: _n, ...BASE } = REF;
const IN: GroundMinInput = { ...BASE, hv: 2500, groundZ: 0, Lmin: 7500, Lmax: 120000 };
type Pub = Extract<GroundMinResult, { rows: unknown }>;
const pub = (r: GroundMinResult): Pub => { if (!("rows" in r)) throw new Error(JSON.stringify(r)); return r; };

type Cls = "admissible" | "not-admissible" | "uncertain" | "failed";
const s = (cls: Cls) => ({ cls, maxStress: cls === "failed" ? null : cls === "admissible" ? 100 : 400, status: cls === "failed" ? "incomplete" : "ok" });
/** Simulated evaluator: per count, a verdict function of L. */
const sim = (f: (n: number, L: number) => Cls) => ({ evaluate: (n: number) => (L: number) => s(f(n, L)), verify: (n: number, L: number) => s(f(n, L)), grid: 8 });

describe("Min. supports with ground: orchestration (simulated)", () => {
  it("candidate at 0: minimality certified, length coverage not certified", () => {
    const r = pub(searchMinSupportsGround(IN, 5, sim(() => "admissible")));
    expect(r.status).toBe("found");
    if (r.status !== "found") return;
    expect(r.candidate.n).toBe(0);
    expect(r.minimality.certified).toBe(true);
    expect(r.lengthCoverage.certified).toBe(false);
    expect(r.rows).toHaveLength(6);
  });
  it("nothing found at 0, candidate at 1: not certified", () => {
    const r = pub(searchMinSupportsGround(IN, 5, sim((n) => (n === 0 ? "not-admissible" : "admissible"))));
    expect(r.status === "found" && r.candidate.n).toBe(1);
    expect(r.minimality.certified).toBe(false);
    expect(r.rows[0].status).toBe("none-found");
  });
  it("failure at a lower count, candidate higher: not certified", () => {
    const r = pub(searchMinSupportsGround(IN, 5, sim((n) => (n < 2 ? "failed" : "admissible"))));
    expect(r.status === "found" && r.candidate.n).toBe(2);
    expect(r.rows.slice(0, 2).map((x) => x.status)).toEqual(["failed", "failed"]);
    expect(r.minimality.certified).toBe(false);
  });
  it("ceiling 0 without candidate: none-found, absence not certified", () => {
    const r = pub(searchMinSupportsGround(IN, 0, sim(() => "not-admissible")));
    expect(r.status).toBe("none-found");
    expect(r.rows).toHaveLength(1);
    expect(r.completion).toBe("normal");
    expect(r.diagnostics.stopCause).toBe("ceiling-reached");
  });
  it("no candidate up to the ceiling", () => {
    const r = pub(searchMinSupportsGround(IN, 3, sim(() => "not-admissible")));
    expect(r.status).toBe("none-found");
    expect(r.rows.map((x) => x.n)).toEqual([0, 1, 2, 3]);
  });
  it("global budget exhausted before the end: partial result, interrupted and unexamined counts", () => {
    const r = pub(searchMinSupportsGround(IN, 6, { ...sim(() => "not-admissible"), maxEvaluations: 20 }));
    expect(r.status).toBe("incomplete");
    expect(r.completion).toBe("interrupted");
    expect(r.diagnostics.evaluations).toBeLessThanOrEqual(20);
    expect(r.diagnostics.interrupted.length + r.diagnostics.notExamined.length).toBeGreaterThan(0);
    expect(r.rows.map((x) => x.n)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it("reduced budget (free, after orchestrator extraction): one interrupted count, the rest not examined", () => {
    const e0 = pub(searchMinSupportsGround(IN, 0, sim(() => "not-admissible"))).diagnostics.evaluations;
    const r = pub(searchMinSupportsGround(IN, 5, { ...sim(() => "not-admissible"), maxEvaluations: 2 * e0 + 3 }));
    expect(r.rows.map((x) => x.status)).toEqual(["none-found", "none-found", "interrupted", "not-examined", "not-examined", "not-examined"]);
    expect(r.diagnostics.interrupted).toEqual([2]);
    expect(r.diagnostics.notExamined).toEqual([3, 4, 5]);
    expect(r.diagnostics.maxEvaluations).toBe(2 * e0 + 3);
  });
  it("final check failed or uncertain: count rejected, search continues; checks are counted", () => {
    const base = sim((n) => (n <= 1 ? "admissible" : "admissible"));
    const r = pub(searchMinSupportsGround(IN, 4, { ...base, verify: (n) => s(n === 0 ? "uncertain" : n === 1 ? "failed" : "admissible") }));
    expect(r.status === "found" && r.candidate.n).toBe(2);
    expect(r.rows[0].status).toBe("rejected");
    expect(r.rows[0].checkNotes[0]).toMatch(/uncertain/);
    expect(r.rows[1].status).toBe("rejected");
    expect(r.minimality.certified).toBe(false);
    expect(r.diagnostics.finalChecks).toBe(5 + 5 + 1);
  });
  it("progress reported for each count in order", () => {
    const seen: number[] = [];
    searchMinSupportsGround(IN, 2, { ...sim(() => "not-admissible"), onProgress: (p) => seen.push(p.n) });
    expect(seen).toEqual([0, 1, 2]);
  });
});

describe("Min. supports with ground: real solver", () => {
  it("zero supports suffice (hv = 1000): certified 0, verified L re-solves admissible", { timeout: 60000 }, () => {
    const r = pub(searchMinSupportsGround({ ...IN, hv: 1000 }, 20));
    if (r.status !== "found") throw new Error(r.status);
    expect(r.candidate.n).toBe(0);
    expect(r.minimality.certified).toBe(true);
    const v = solveGroundFixedLength({ ...IN, hv: 1000, L: r.candidate.L, numSupports: 0 });
    expect(v.status === "ok" && v.numericalValid && v.maxStress <= IN.sigmaAllow).toBe(true);
  });
  it("candidate with several supports (hv = 2500): not certified, lower counts listed", { timeout: 60000 }, () => {
    const r = pub(searchMinSupportsGround(IN, 20));
    if (r.status !== "found") throw new Error(r.status);
    expect(r.candidate.n).toBeGreaterThan(0);
    expect(r.minimality.certified).toBe(false);
    expect(r.rows.filter((x) => x.n !== r.candidate.n).every((x) => x.status !== "candidate")).toBe(true);
    // Same as Find L with ground for that count.
    const g = searchLengthGround(IN, r.candidate.n);
    expect("ranges" in g && g.ranges.length > 0).toBe(true);
  });
  it("inactive ground: candidate stress equals the no-ground engine", { timeout: 60000 }, () => {
    const r = pub(searchMinSupportsGround({ ...IN, groundZ: -1e7 }, 20));
    if (r.status !== "found") throw new Error(r.status);
    const ref = solveBiaxialFixedLength({ ...IN, L: r.candidate.L, numSupports: r.candidate.n });
    if (ref.status !== "ok") throw new Error(ref.status);
    expect(rel(r.candidate.maxStress, ref.maxStress)).toBeLessThan(1e-6);
  });
  it("incompatible geometry is reported before any search", () => {
    expect(searchMinSupportsGround({ ...IN, groundZ: 10 }, 3).status).toBe("geometry-incompatible");
    expect(searchMinSupportsGround(IN, 21).status).toBe("invalid-input");
  });
});
