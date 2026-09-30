// créé par Giovanni Malagnino, 2026-09-26 15:20 CEST (Europe/Rome, UTC+2)
// V2-9-R1: field routing, Hermite penetration, exhaustive maxima, references.

import { describe, expect, it } from "vitest";
import { BiaxialSuccess, evaluateAt, sampleCurve, solveBiaxialFixedLength, solveGroundFixedLength } from "..";
import { REF, rel } from "./helpers";
import { hermiteMin } from "../restrained-maxima";
import { memberMinZ } from "../ground-mesh";
import { rootsInClosedUnit, polyMul } from "../poly-roots";
import { restrainedPoint } from "../restrained-fields";
import { calcSectionProperties } from "@/lib/calculations";

const R = { ...REF, axialMode: "restrained" as const };
function ok(over: Record<string, number | string>): BiaxialSuccess {
  const i = { ...R, ...over } as typeof R & { groundZ?: number };
  const r = i.groundZ !== undefined ? solveGroundFixedLength({ ...i, groundZ: i.groundZ }) : solveBiaxialFixedLength(i);
  if (r.status !== "ok") throw new Error(`status ${r.status}`);
  return r;
}

describe("V2-9-R1 field evaluation", () => {
  it("evaluateAt uses the restrained field (reproduction case)", () => {
    const r = ok({ hl: 1500, numSupports: 2, groundZ: 0 });
    const f = evaluateAt(r, 7500);
    expect(Math.abs(f.y - 360.648237)).toBeLessThan(1e-3);
    expect(Math.abs(f.y - 234.375)).toBeGreaterThan(100);
  });
  for (const mode of ["free", "restrained"] as const) {
    it(`point evaluation, sampling, nodes and interfaces agree (${mode})`, () => {
      const r = ok({ axialMode: mode, hl: 800, numSupports: 2 });
      const s = sampleCurve(r, 3);
      for (const p of s) {
        const f = evaluateAt(r, p.x, "left");
        expect(Math.abs(f.z - p.z)).toBeLessThan(1e-9 * 2500);
        expect(Math.abs(f.y - p.y)).toBeLessThan(1e-9 * 2500);
        expect(Math.abs(f.Mv - p.Mv)).toBeLessThan(1e-9 * Math.max(1, Math.abs(p.Mv)) + 1e-6);
      }
      r.nodes.forEach((n) => expect(Math.abs(evaluateAt(r, n.x).z - n.z)).toBeLessThan(1e-9 * 2500));
      if (mode === "restrained") {
        const x = r.members[3].xStart, lf = evaluateAt(r, x, "left"), rt = evaluateAt(r, x, "right");
        expect(Math.abs(lf.y - rt.y)).toBeLessThan(1e-9);
        // Vv = dMv/dx (documented convention), checked by central difference.
        const m = r.members[5], xm = m.xStart + m.length / 2, h = m.length * 1e-4;
        const dM = (evaluateAt(r, xm + h).Mv - evaluateAt(r, xm - h).Mv) / (2 * h);
        expect(rel(evaluateAt(r, xm).Vv, dM)).toBeLessThan(1e-5);
      }
    });
  }
});

describe("V2-9-R1 Hermite penetration", () => {
  it("finds an interior minimum of the cubic", () => {
    expect(hermiteMin(1000, [0, -0.01, 0, 0.01])).toBeCloseTo(-2.5, 9); // symmetric: min at u = 1/2
  });
  it("quartic span term would have changed the penetration decision", () => {
    const l = 1000, EI = 1e9, q = 1, tolPen = 1e-3;
    const cubic = hermiteMin(l, [0, 0, 0, 0]);
    const quartic = memberMinZ(0, 0, 0, 0, l, q, EI);
    expect(-cubic).toBeLessThanOrEqual(tolPen);
    expect(-quartic).toBeGreaterThan(tolPen);
  });
});

describe("V2-9-R1 root isolation", () => {
  const fromRoots = (rs: number[]) => rs.reduce((p, r) => polyMul(p, [-r, 1]), [1]);
  it("roots near the ends, close roots, multiple root, reduced degree", () => {
    expect(rootsInClosedUnit(fromRoots([1e-9, 1 - 1e-9, 0.4, 0.7, 2]))).toEqual(
      expect.arrayContaining([expect.closeTo(1e-9, 12), expect.closeTo(1 - 1e-9, 12), expect.closeTo(0.4, 12), expect.closeTo(0.7, 12)]));
    const close = rootsInClosedUnit(fromRoots([0.5, 0.5 + 1e-5, 0.9]));
    expect(close.length).toBe(3);
    expect(rootsInClosedUnit(fromRoots([0.3, 0.3, 0.8])).some((u) => Math.abs(u - 0.3) < 1e-6)).toBe(true);
    expect(rootsInClosedUnit([0.25, -1, 0, 0, 0, 0])).toEqual([expect.closeTo(0.25, 14)]);
  });
});

describe("V2-9-R1 exhaustive maxima and references", () => {
  it("maxima dominate a dense sampling and are attained", () => {
    const r = ok({ hl: 1500, numSupports: 2, groundZ: 0 });
    let mMax = 0, slope = 0;
    r.members.forEach((_, e) => { for (let k = 0; k <= 200; k++) {
      const p = restrainedPoint(r, e, k / 200); mMax = Math.max(mMax, p.Mres); slope = Math.max(slope, Math.hypot(p.slopeZ, p.slopeY));
    } });
    expect(r.critical.Mres).toBeGreaterThanOrEqual(mMax * (1 - 1e-12));
    expect(rel(r.critical.Mres, mMax)).toBeLessThan(1e-4);
    expect(r.axial!.maxSlope).toBeGreaterThanOrEqual(slope * (1 - 1e-12));
  });
  it("reference A (continuous tension beam)", () => {
    const a = ok({}).axial!;
    expect(rel(a.N, 1525332.48)).toBeLessThan(1e-3);
    expect(rel(a.bendingMax, 1650.815963)).toBeLessThan(3e-3);
    expect(rel(a.combinedMax, 2395.667824)).toBeLessThan(3e-3);
  });
  it("case B and combined uncertainty on both sides of the threshold", () => {
    const sec = calcSectionProperties(114.3, 6.02, 7850, "yellowJacket", 0.94, 950, "4");
    const q = ((sec.weightPerMeter + sec.coatingWeightPerMeter) * 9.81) / 1000;
    const B = { E: 207000, A: sec.A, I: sec.I, c: sec.c, q, hv: 100, hl: 50, sigmaAllow: 287.2 };
    const a = ok({ ...B, groundZ: 0 }).axial!;
    expect(rel(a.N, 8053.3915)).toBeLessThan(5e-3);
    expect(rel(a.combinedMax, 89.06)).toBeLessThan(5e-3);
    for (const g of [{}, { groundZ: 0 }]) {
      const c = ok({ ...B, ...g }).axial!.combinedMax;
      expect(ok({ ...B, ...g, sigmaAllow: c * (1 + 1e-9) }).axial!.criterionUncertain).toBe(true);
      expect(ok({ ...B, ...g, sigmaAllow: c * (1 - 1e-9) }).axial!.criterionUncertain).toBe(true);
      const hi = ok({ ...B, ...g, sigmaAllow: c * 1.5 }).axial!, lo = ok({ ...B, ...g, sigmaAllow: c * 0.5 }).axial!;
      expect([hi.criterionUncertain, hi.combinedCriterionMet, lo.criterionUncertain, lo.combinedCriterionMet]).toEqual([false, true, false, false]);
    }
  });
});
