// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni malagnino, 2026-09-24 03:33 CEST (Europe/Rome, UTC+2)
// Support, contact, continuity, equilibrium and numerical reference tests.

import { describe, expect, it } from "vitest";
import { evaluateAt, sampleCurve } from "..";
import { buildVerticalSystem, condense } from "../vertical-system";
import { factorize } from "../linear-algebra";
import { REF, rel, solveOk } from "./helpers";

const { L, E, I, q } = REF;
const EI = E * I;

describe("mechanics-v2 supports and contact", () => {
  it("central support: R = qL/2, z = hv/2, rotation free", () => {
    const hv = 2500;
    const r = solveOk({ numSupports: 1, hv });
    const s = r.supports[0];
    expect(s.active).toBe(true);
    expect(rel(s.reaction, (q * L) / 2)).toBeLessThan(1e-9);
    expect(rel(s.z, hv / 2)).toBeLessThan(1e-12);
    expect(rel(r.nodes[1].theta, (3 * hv) / (2 * L))).toBeLessThan(1e-9);
  });

  it("exact release case: second contact carries no reaction", () => {
    const hv = 1000;
    const r = solveOk({ q: 0, hv, numSupports: 2 });
    const [s1, s2] = r.supports;
    expect(s1.active).toBe(true);
    expect(rel(s1.reaction, (81 / 4) * EI * hv / L ** 3)).toBeLessThan(1e-9);
    expect(s2.active).toBe(false);
    expect(s2.reaction).toBe(0);
    expect(rel(s2.gap, hv / 8)).toBeLessThan(1e-9);
    // Forcing both contacts would require a forbidden (negative) reaction.
    const { g0, C } = condense(buildVerticalSystem(L, hv, EI, 0, 2));
    const forced = factorize(C).solve(g0.map((g) => -g));
    expect(forced[1]).toBeLessThan(0);
  });

  it("lateral plane is independent of the number of supports", () => {
    const base = solveOk({ hl: 1000, numSupports: 0 });
    for (const n of [1, 3, 7]) {
      const r = solveOk({ hl: 1000, numSupports: n });
      for (const x of [0, 0.21 * L, 0.5 * L, L]) {
        expect(evaluateAt(r, x).Ml).toBeCloseTo(evaluateAt(base, x).Ml, 6);
        expect(evaluateAt(r, x).y).toBeCloseTo(evaluateAt(base, x).y, 9);
      }
    }
  });

  it("maximum does not depend on display sampling", () => {
    const r = solveOk({ hl: 700, numSupports: 3, hv: 400 });
    for (const n of [1, 5, 50, 500]) {
      const smax = Math.max(...sampleCurve(r, n).map((p) => p.sigma));
      expect(smax).toBeLessThanOrEqual(r.maxStress * (1 + 1e-12));
    }
    expect(solveOk({ hl: 700, numSupports: 3, hv: 400 }).maxStress).toBe(r.maxStress);
  });

  it("continuity at supports, shear jump and global equilibrium", () => {
    const r = solveOk({ hl: 500, numSupports: 3, hv: 800 });
    const scaleM = (q * L * L) / 12;
    for (const s of r.supports) {
      const a = evaluateAt(r, s.x, "left");
      const b = evaluateAt(r, s.x, "right");
      expect(Math.abs(a.z - b.z)).toBeLessThan(1e-9);
      expect(Math.abs(a.slopeZ - b.slopeZ)).toBeLessThan(1e-12);
      expect(Math.abs(a.Mv - b.Mv)).toBeLessThan(1e-8 * scaleM);
      expect(Math.abs(b.Vv - a.Vv - s.reaction)).toBeLessThan(1e-8 * q * L);
      expect(s.gap).toBeGreaterThanOrEqual(-r.diagnostics.tolDisp);
      expect(s.reaction).toBeGreaterThanOrEqual(0);
    }
    const sumR = r.endReactions.left.force + r.endReactions.right.force +
      r.supports.reduce((t, s) => t + s.reaction, 0);
    expect(rel(sumR, q * L)).toBeLessThan(1e-10);
    const sumM = r.endReactions.left.couple + r.endReactions.right.couple + r.endReactions.right.force * L +
      r.supports.reduce((t, s) => t + s.reaction * s.x, 0);
    expect(rel(sumM, (q * L * L) / 2)).toBeLessThan(1e-10);
    expect(r.numericalValid).toBe(true);
    expect(r.physicalValidity).toBe("not-assessed");
  });

  it("numerical references (linear model)", () => {
    const cases = [
      { hl: 0, n: 0, s: 424.5523905204 },
      { hl: 0, n: 1, s: 256.1568476301 },
      { hl: 1000, n: 0, s: 432.0258469081 },
      { hl: 1000, n: 1, s: 268.361567084 },
    ];
    for (const k of cases) {
      const r = solveOk({ hl: k.hl, numSupports: k.n });
      expect(Math.abs(r.maxStress - k.s)).toBeLessThan(1e-7);
      expect(Math.abs(r.critical.x - L)).toBeLessThan(1e-6);
      expect(r.bendingCriterionMet).toBe(r.maxStress <= REF.sigmaAllow);
    }
    const r = solveOk({ numSupports: 1 });
    expect(Math.abs(r.endReactions.left.force - 480.2997584331)).toBeLessThan(1e-6);
    expect(Math.abs(r.supports[0].reaction - 2365.5086159631)).toBeLessThan(1e-6);
    expect(Math.abs(r.endReactions.right.force - 1885.2088575301)).toBeLessThan(1e-6);
  });
});
