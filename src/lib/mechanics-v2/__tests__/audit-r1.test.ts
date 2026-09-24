// créé par Giovanni Malagnino, 2026-09-24 03:33 CEST (Europe/Rome, UTC+2)
// Targeted tests added after the independent audit (V2-1-R1).

import { describe, expect, it } from "vitest";
import { evaluateAt, sampleCurve, solveBiaxialFixedLength } from "..";
import { rootsInUnit } from "../roots";
import { memberMaximum } from "../biaxial";
import { solveContact } from "../contact";
import { checkEquilibrium } from "../equilibrium";
import { MemberResult } from "../types";
import { REF, solveOk } from "./helpers";

const near = (got: number[], exp: number[], tol = 1e-6) => {
  expect(got.length).toBe(exp.length);
  exp.forEach((e, i) => expect(Math.abs(got[i] - e)).toBeLessThan(tol));
};

describe("A. rootsInUnit", () => {
  it("zero, linear and quadratic polynomials", () => {
    expect(rootsInUnit([0, 0, 0, 0])).toEqual([]);
    expect(rootsInUnit([3])).toEqual([]);
    near(rootsInUnit([-0.25, 1]), [0.25], 1e-14);
    near(rootsInUnit([0.06, -0.5, 1]), [0.2, 0.3], 1e-12);
  });
  it("double root (u-0.02)^2(u-0.93)", () => {
    near(rootsInUnit([-0.00037200000000000004, 0.0376, -0.9700000000000001, 1]), [0.02, 0.93]);
  });
  it("triple root (u-0.3)^3 reported once", () => {
    near(rootsInUnit([-0.027, 0.27, -0.9, 1]), [0.3], 1e-5);
  });
  it("roots close to the bounds are kept", () => {
    const e = 1e-7;
    // (u - e)(u - (1 - e)) expanded
    near(rootsInUnit([e * (1 - e), -1, 1]), [e, 1 - e], 1e-12);
    // (u - e)^2 (u - 0.5): double root near 0
    near(rootsInUnit([-0.5 * e * e, e * e + e, -(2 * e + 0.5), 1]), [e, 0.5], 1e-6);
  });
  it("no duplicates and sorted output", () => {
    const r = rootsInUnit([-0.027, 0.27, -0.9, 1]).concat(rootsInUnit([0.06, -0.5, 1]));
    for (const set of [rootsInUnit([-0.027, 0.27, -0.9, 1]), rootsInUnit([0.06, -0.5, 1])]) {
      for (let i = 1; i < set.length; i++) expect(set[i] - set[i - 1]).toBeGreaterThan(1e-9);
    }
    expect(r.length).toBe(3);
  });
});

describe("B. interior maximum", () => {
  it("Mv = u - u^2, Ml = 0 gives Mres = 0.25 at u = 0.5", () => {
    const m: MemberResult = {
      index: 0, xStart: 0, length: 1, nodalDisplacements: [0, 0, 0, 0],
      endActions: { Fi: 1, Ci: 0, Fj: 1, Cj: 0 }, EI: 1, q: 2,
    };
    const r = memberMaximum(m, 1, 0);
    expect(r.Mres).toBeCloseTo(0.25, 14);
    expect(r.xi).toBeCloseTo(0.5, 10);
  });
});

describe("C. contact", () => {
  it("step limiting releases a contact deterministically", () => {
    const C = [[1.89, 0.35, 0.5], [0.35, 1.81, -0.9], [0.5, -0.9, 1]];
    const g0 = [-0.9, -0.4, -0.6];
    const o = solveContact(g0, C, 1e-12, 1e-12);
    expect(o.converged).toBe(true);
    expect(o.releases).toBeGreaterThan(0);
    near(o.R, [0, 0.94, 1.446], 1e-12);
    const g = g0.map((v, i) => v + C[i].reduce((s, c, j) => s + c * o.R[j], 0));
    expect(g[0]).toBeGreaterThan(0);
    expect(Math.abs(g[1]) + Math.abs(g[2])).toBeLessThan(1e-12);
  });
  it("limit contact with zero gap and zero reaction", () => {
    const o = solveContact([0], [[1]], 1e-12, 1e-12);
    expect(o.converged).toBe(true);
    expect(o.R).toEqual([0]);
    const r = solveOk({ q: 0, hv: 0, numSupports: 1 });
    expect(r.supports[0].reaction).toBe(0);
    expect(Math.abs(r.supports[0].gap)).toBeLessThanOrEqual(r.diagnostics.tolDisp);
    expect(r.numericalValid).toBe(true);
  });
  it("insufficient iteration limit reports non-convergence", () => {
    const o = solveContact([-1, -1], [[1, 0], [0, 1]], 1e-12, 1e-12, 1);
    expect(o.converged).toBe(false);
  });
  it("vertical results are invariant when only hl changes", () => {
    const base = solveOk({ numSupports: 4, hl: 0 });
    for (const hl of [-2000, 300, 1500]) {
      const r = solveOk({ numSupports: 4, hl });
      r.supports.forEach((s, i) => expect(s.reaction).toBe(base.supports[i].reaction));
      r.nodes.forEach((n, i) => expect(n.z).toBe(base.nodes[i].z));
      expect(evaluateAt(r, 0.37 * REF.L).Mv).toBe(evaluateAt(base, 0.37 * REF.L).Mv);
    }
  });
});

describe("D. diagnostics", () => {
  it("force and moment residuals are separated with unit-consistent tolerances", () => {
    const r = solveOk({ numSupports: 5, hl: 400 });
    const { residuals: res, residualTolerances: tol, scales } = r.diagnostics;
    expect(tol.translation).toBeCloseTo(1e-7 * scales.force, 12);
    expect(tol.rotation).toBeCloseTo(1e-7 * scales.moment, 6);
    expect(tol.globalMoment / tol.globalForce).toBeCloseTo(REF.L, 6);
    for (const k of ["translation", "rotation", "globalForce", "globalMoment"] as const) {
      expect(res[k]).toBeLessThanOrEqual(tol[k]);
    }
    expect(r.diagnostics.equilibriumOk).toBe(true);
  });
  it("equilibrium validator fails explicitly", () => {
    const tol = { translation: 1, rotation: 1000, globalForce: 1, globalMoment: 1000 };
    expect(checkEquilibrium({ translation: 0, rotation: 0, globalForce: 0, globalMoment: 0 }, tol).ok).toBe(true);
    const bad = checkEquilibrium({ translation: 0, rotation: 5000, globalForce: 0, globalMoment: NaN }, tol);
    expect(bad.ok).toBe(false);
    expect(bad.failures.length).toBe(2);
  });
  it("overflowing derived quantities give a numerical failure", () => {
    const r = solveBiaxialFixedLength({ ...REF, E: 1e300, I: 1e300 });
    expect(r.status).toBe("numerical-failure");
  });
  it("physical validity stays not-assessed even for large offsets", () => {
    const r = solveOk({ hv: 0.9 * REF.L, q: 0 });
    expect(r.physicalValidity).toBe("not-assessed");
  });
});

describe("Field function guards", () => {
  const r = solveOk({ numSupports: 1, hl: 200 });
  it("evaluateAt rejects invalid x", () => {
    for (const x of [-1, REF.L + 1, NaN, Infinity]) expect(() => evaluateAt(r, x)).toThrow(RangeError);
    expect(() => evaluateAt(r, REF.L)).not.toThrow();
    expect(() => evaluateAt(r, 0)).not.toThrow();
  });
  it("sampleCurve rejects invalid perMember", () => {
    for (const p of [0, -2, 1.5, NaN, Infinity]) expect(() => sampleCurve(r, p)).toThrow(RangeError);
    expect(sampleCurve(r, 1).length).toBe(3);
  });
});
