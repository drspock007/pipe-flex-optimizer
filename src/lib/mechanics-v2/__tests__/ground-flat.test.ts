// créé par Giovanni Malagnino, 2026-09-26 18:10 CEST (Europe/Rome, UTC+2)
// V2-11-R1: analytical full-ground-contact solution of the exactly flat case.
import { describe, expect, it } from "vitest";
import { evaluateAt, sampleCurve, searchHeightRestrained, searchLengthRestrained, solveGroundFixedLength } from "..";
import { REF } from "./helpers";

const { L: _L, numSupports: _n, hv: _hv, ...B0 } = REF;
const ms0 = (t: number) => Date.now() - t;
const flat = (o: Record<string, unknown> = {}) => ({ ...REF, hv: 0, hl: 0, groundZ: 0, ...o }) as Parameters<typeof solveGroundFixedLength>[0];

describe("analytical flat-on-ground branch", () => {
  for (const axialMode of ["free", "restrained"] as const)
    for (const numSupports of [0, 3, 20])
      for (const q of [REF.q, 0])
        for (const L of [7500, 30000, 120000])
          it(`${axialMode}, ${numSupports} supports, q=${q}, L=${L}`, () => {
            const s = solveGroundFixedLength(flat({ axialMode, numSupports, q, L }));
            if (s.status !== "ok") throw new Error(s.status);
            const g = s.ground!;
            expect(g.method).toBe("analytical-full-contact");
            expect(g.contactNodes).toBe(0);
            expect(g.refinement).toHaveLength(0);
            expect(g.totalReaction).toBeCloseTo(q * L, 9);
            expect(g.distributedReaction).toBe(q);
            expect(g.contactZones).toEqual([{ xStart: 0, xEnd: L }]);
            expect(s.supports.every((x) => x.reaction === 0 && x.gap === 0)).toBe(true);
            expect([s.endReactions.left.force, s.endReactions.right.couple]).toEqual([0, 0]);
            expect(s.maxStress).toBe(0);
            expect(s.numericalValid && s.bendingCriterionMet).toBe(true);
            for (const p of sampleCurve(s, 4)) expect([p.z, p.y, p.Mv, p.Ml, p.slopeZ, p.sigma].every((v) => v === 0)).toBe(true);
            expect(evaluateAt(s, L / 3).Mv).toBe(0);
            if (axialMode === "restrained") {
              expect(s.axial!.N).toBe(0);
              expect(s.axial!.combinedMax).toBe(0);
              expect(s.axial!.method).toBe("analytical-full-contact");
            } else expect(s.axial).toBeUndefined();
          });

  it("does not trigger for small non-zero offsets or a lower ground", () => {
    for (const o of [{ hv: 1e-9 }, { hl: 1e-9 }, { hl: -1 }, { groundZ: -1e-9 }, { groundZ: -100 }]) {
      const s = solveGroundFixedLength(flat({ axialMode: "restrained", numSupports: 3, ...o }));
      if (s.status === "ok") expect(s.ground?.method).not.toBe("analytical-full-contact");
    }
  });

  it("rejects invalid inputs before the branch", () => {
    expect(solveGroundFixedLength(flat({ q: -1 })).status).toBe("invalid-input");
    expect(solveGroundFixedLength(flat({ L: Number.NaN })).status).toBe("invalid-input");
    expect(solveGroundFixedLength(flat({ groundZ: Number.POSITIVE_INFINITY })).status).toBe("invalid-input");
  });

  it("Find L restrained 7.5-120 m, hv = hl = 0, ground 0, 20 supports: fast, no failure, bound not mechanical", () => {
    const t0 = Date.now();
    const r = searchLengthRestrained({ ...B0, axialMode: "restrained", hv: 0, hl: 0, groundZ: 0, Lmin: 7500, Lmax: 120000 }, 20);
    const ms = Date.now() - t0;
    expect(r.status).toBe("found");
    if (r.status !== "found") return;
    expect(r.samples.filter((x) => x.cls === "failed")).toHaveLength(0);
    expect(r.ranges[0].lower.value).toBe(7500);
    expect(r.ranges[r.ranges.length - 1].upper.value).toBe(120000);
    expect(r.boundaryHits).toEqual(["lower", "upper"]);
    expect(r.ranges[0].lower.domainEdge && r.ranges[0].upper.domainEdge).toBe(true);
    expect(ms).toBeLessThan(5000);
  });

  it("Find h restrained with ground at 0 includes hv = 0 (analytical point)", () => {
    const r = searchHeightRestrained({ ...B0, L: 30000, axialMode: "restrained", hl: 0, groundZ: 0 }, 20);
    if (r.status !== "found") throw new Error(r.status);
    expect(r.ranges[0].lower.value).toBe(0);
  });
});
