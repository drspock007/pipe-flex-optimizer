// créé par Giovanni Malagnino, 2026-09-26 05:35 CEST (Europe/Rome, UTC+2)
// V2-8-R1 audit corrections: not-examined counts, true minimum clearance,
// unexplored domain on interruption.
import { describe, expect, it } from "vitest";
import { GroundMinInput, searchHeightGround, searchLengthGround, searchMinSupportsGround, solveGroundFixedLength } from "..";
import { REF } from "./helpers";

const { L: _L, numSupports: _n, ...BASE } = REF;
const IN: GroundMinInput = { ...BASE, hv: 2500, groundZ: 0, Lmin: 7500, Lmax: 120000 };
const ok = () => ({ cls: "admissible" as const, maxStress: 100, status: "ok" });
const bad = () => ({ cls: "not-admissible" as const, maxStress: 400, status: "ok" });

describe("1. not-examined counts after a candidate", () => {
  const run = (cand: number) => searchMinSupportsGround(IN, 20, { evaluate: (n) => () => (n >= cand ? ok() : bad()), verify: (n) => (n >= cand ? ok() : bad()), grid: 8 });
  for (const cand of [0, 1]) it(`candidate at ${cand}`, () => {
    const r = run(cand);
    if (!("rows" in r)) throw new Error();
    expect(r.rows).toHaveLength(21);
    expect(r.diagnostics.examined).toEqual(Array.from({ length: cand + 1 }, (_, i) => i));
    expect(r.diagnostics.notExamined).toEqual(Array.from({ length: 20 - cand }, (_, i) => i + cand + 1));
    expect(r.completion).toBe("normal");
    expect(r.diagnostics.stopCause).toBe("candidate-found");
  });
});

describe("2. minimum clearance of the exact no-contact path", () => {
  it("ground at the left end: published minimum is 0, not 2500", () => {
    const r = solveGroundFixedLength({ ...REF, L: 30000, hv: 2500, hl: 0, q: 0, numSupports: 0, groundZ: 0 });
    if (r.status !== "ok" || !r.ground) throw new Error(r.status);
    expect(r.ground.method).toBe("exact-no-contact");
    expect(Number.isFinite(r.ground.minClearance)).toBe(true);
    expect(Math.abs(r.ground.minClearance as number)).toBeLessThan(1e-6);
  });
  it("ground strictly below both ends: minimum equals the lowest point minus ground", () => {
    const r = solveGroundFixedLength({ ...REF, L: 30000, hv: 2500, hl: 0, q: 0, numSupports: 0, groundZ: -100 });
    if (r.status !== "ok" || !r.ground) throw new Error(r.status);
    expect(r.ground.method).toBe("exact-no-contact");
    expect(r.ground.minClearance).toBeCloseTo(100, 6);
  });
});

describe("3. unexplored domain on interruption", () => {
  const L = (maxEvaluations: number) => searchLengthGround(IN, 0, { evaluate: ok, maxEvaluations });
  it("zero evaluations: whole domain unexplored, no range", () => {
    const r = L(0);
    if (!("ranges" in r)) throw new Error();
    expect(r.status).toBe("incomplete");
    expect(r.ranges).toHaveLength(0);
    expect(r.zones).toEqual([expect.objectContaining({ reason: "budget", from: 7500, to: 120000 })]);
  });
  it("one evaluation: point at Lmin, never at the upper edge", () => {
    const r = L(1);
    if (!("ranges" in r)) throw new Error();
    expect(r.ranges[0].upper.domainEdge).toBe(false);
    expect(r.ranges[0].lower.domainEdge).toBe(true);
    expect(r.boundaryHits).toEqual(["lower"]);
    expect(r.zones.some((z) => z.reason === "budget" && Math.abs(z.to - 120000) < 1e-6)).toBe(true);
  });
  it("interruption inside the initial grid: tail unexplored", () => {
    const r = L(5);
    if (!("ranges" in r)) throw new Error();
    expect(r.ranges.every((g) => !g.upper.domainEdge)).toBe(true);
    expect(r.boundaryHits).not.toContain("upper");
  });
  it("Find h: single point at the lower bound does not reach Hcap", () => {
    const r = searchHeightGround({ ...REF, groundZ: 0 }, 0, { evaluate: ok, maxEvaluations: 1 });
    if (!("ranges" in r) || !r.domain) throw new Error();
    expect(r.ranges[0].upper.domainEdge).toBe(false);
    expect(r.zones.some((z) => z.reason === "budget" && z.to === r.domain!.upper)).toBe(true);
    const z = searchHeightGround({ ...REF, groundZ: 0 }, 0, { evaluate: ok, maxEvaluations: 0 });
    if (!("ranges" in z) || !z.domain) throw new Error();
    expect(z.zones).toEqual([expect.objectContaining({ reason: "budget", from: z.domain.lower, to: z.domain.upper })]);
  });
});
