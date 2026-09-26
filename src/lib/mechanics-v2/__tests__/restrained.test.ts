// créé par Giovanni Malagnino, 2026-09-26 14:30 CEST (Europe/Rome, UTC+2)
// V2-9: axially restrained fixed-length solver. References are independent of
// the solver: closed-form tension beam (exponential basis), cubic small-
// amplitude limit, Simpson quadrature of slopes, rotation invariance, balances.

import { describe, expect, it } from "vitest";
import { BiaxialSuccess, solveBiaxialFixedLength, solveGroundFixedLength, solveRestrained } from "..";
import { REF, rel } from "./helpers";

const R = { ...REF, axialMode: "restrained" as const };
function ok(over: Record<string, number>): BiaxialSuccess {
  const r = "groundZ" in over ? solveGroundFixedLength({ ...R, groundZ: 0, ...over }) : solveBiaxialFixedLength({ ...R, ...over });
  if (r.status !== "ok") throw new Error(`status ${r.status}: ${JSON.stringify(r).slice(0, 300)}`);
  return r;
}

/** Simpson integral of (z'^2 + y'^2) from nodal Hermite data (independent of kgDot). */
function slopeIntegral(r: BiaxialSuccess): number {
  let s = 0;
  const ln = r.axial!.lateral.nodes;
  r.members.forEach((m, e) => {
    const l = m.length, [zi, ti, zj, tj] = m.nodalDisplacements;
    const yi = ln[e].y, ui = ln[e].theta, yj = ln[e + 1].y, uj = ln[e + 1].theta;
    const d = (a: number, b: number, c: number, dd: number, u: number) =>
      ((-6 * u + 6 * u * u) * a + (6 * u - 6 * u * u) * c) / l + (1 - 4 * u + 3 * u * u) * b + (-2 * u + 3 * u * u) * dd;
    const f = (u: number) => d(zi, ti, zj, tj, u) ** 2 + d(yi, ui, yj, uj, u) ** 2;
    const K = 8;
    for (let k = 0; k < K; k++) {
      const a = k / K, b = (k + 1) / K;
      s += ((b - a) * l / 6) * (f(a) + 4 * f((a + b) / 2) + f(b)); // exact for degree 4
    }
  });
  return s;
}

/** Closed-form clamped tension beam: EI w'''' - N w'' = -q, w(0)=w'(0)=w'(L)=0, w(L)=h. */
function tensionBeam(N: number, EI: number, L: number, h: number, q: number) {
  const k = Math.sqrt(N / EI), E1 = Math.exp(-k * L), p = q / (2 * N);
  const A = [[1, 0, 1, E1], [0, 1, -k, k * E1], [1, L, E1, 1], [0, 1, -k * E1, k]];
  const b = [0, 0, h - p * L * L, -2 * p * L];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const f = A[j][i] / A[i][i];
    for (let c = i; c < 4; c++) A[j][c] -= f * A[i][c];
    b[j] -= f * b[i];
  }
  const a = [0, 0, 0, 0];
  for (let i = 3; i >= 0; i--) a[i] = (b[i] - [1, 2, 3].filter((c) => c > i).reduce((s, c) => s + A[i][c] * a[c], 0)) / A[i][i];
  const w = (x: number) => a[0] + a[1] * x + a[2] * Math.exp(-k * x) + a[3] * Math.exp(-k * (L - x)) + p * x * x;
  const dw = (x: number) => a[1] - k * a[2] * Math.exp(-k * x) + k * a[3] * Math.exp(-k * (L - x)) + 2 * p * x;
  const M = (x: number) => EI * (k * k * a[2] * Math.exp(-k * x) + k * k * a[3] * Math.exp(-k * (L - x)) + 2 * p);
  return { w, dw, M };
}

describe("V2-9 restrained fixed length", () => {
  it("fully zero case gives N = 0 and zero stresses", () => {
    const r = ok({ hv: 0, hl: 0, q: 0 });
    expect(r.axial!.N).toBe(0);
    expect(r.axial!.combinedMax).toBe(0);
    expect(r.maxStress).toBe(0);
  });

  it("compatibility N = EA/(2L) int slopes^2 on the converged solution", () => {
    for (const over of [{ hv: 2500 }, { hv: 1000, hl: 700, numSupports: 3 }, { hv: 1000, groundZ: 0 }]) {
      const r = ok(over);
      expect(rel(r.axial!.N, ((REF.E * REF.A) / (2 * REF.L)) * slopeIntegral(r))).toBeLessThan(1e-8);
    }
  });

  it("small amplitude: cubic clamped shape and N -> (3/5) EA (hv^2 + hl^2)/L^2", () => {
    const errs = [250, 25, 2.5].map((a) => {
      const r = ok({ hv: a * 0.6, hl: a * 0.8, q: 0 });
      const ref = (0.6 * REF.E * REF.A * a * a) / REF.L ** 2;
      const u = 0.25, z = r.nodes.find((n) => Math.abs(n.x / REF.L - u) < 1e-9)!.z;
      expect(Math.abs(z - 0.6 * a * (3 * u * u - 2 * u ** 3))).toBeLessThan(0.02 * a);
      return Math.abs(r.axial!.N / ref - 1);
    });
    expect(errs[1]).toBeLessThan(errs[0]);
    expect(errs[2]).toBeLessThan(1e-3);
  });

  it("rotation invariance of (hv, hl) without load, supports or ground", () => {
    const a = ok({ hv: 1500, hl: 0, q: 0 }), b = ok({ hv: 1500 * Math.cos(0.7), hl: 1500 * Math.sin(0.7), q: 0 });
    expect(rel(b.axial!.N, a.axial!.N)).toBeLessThan(1e-9);
    expect(rel(b.axial!.combinedMax, a.axial!.combinedMax)).toBeLessThan(1e-6);
  });

  it("matches the closed-form tension beam at the computed N, with self-weight (tension matters)", () => {
    for (const hv of [2500, 300]) {
      const r = ok({ hv }), N = r.axial!.N, EI = REF.E * REF.I;
      const t = tensionBeam(N, EI, REF.L, hv, REF.q);
      for (const n of r.nodes) expect(Math.abs(n.z - t.w(n.x))).toBeLessThan(1e-3 * hv);
      let mMax = 0, S = 0;
      const K = 20000;
      for (let k = 0; k <= K; k++) { const x = (k / K) * REF.L; mMax = Math.max(mMax, Math.abs(t.M(x))); S += t.dw(x) ** 2 * (REF.L / K) * (k === 0 || k === K ? 0.5 : 1); }
      expect(rel(r.maxStress, (REF.c * mMax) / REF.I)).toBeLessThan(3e-3);
      expect(rel(N, ((REF.E * REF.A) / (2 * REF.L)) * S)).toBeLessThan(3e-3); // continuous compatibility
      const free = solveBiaxialFixedLength({ ...REF, hv }) as BiaxialSuccess;
      expect(rel(r.maxStress, free.maxStress)).toBeGreaterThan(0.05);
    }
  });

  it("ground far below agrees with the restrained solver without ground", () => {
    const a = ok({ hv: 1200, hl: 400, numSupports: 2 }), b = ok({ hv: 1200, hl: 400, numSupports: 2, groundZ: -1e5 });
    expect(rel(b.axial!.N, a.axial!.N)).toBeLessThan(1e-9);
    expect(rel(b.axial!.combinedMax, a.axial!.combinedMax)).toBeLessThan(1e-9);
    expect(b.ground!.contactNodes).toBe(0);
  });

  it("pipe lying on the ground (hv = hl = 0): N = 0 and zero bending", () => {
    const r = ok({ hv: 0, hl: 0, groundZ: 0 });
    // Discrete nodal contact leaves an inter-node sag that vanishes with refinement.
    const lv = r.axial!.refinement.map((l) => l.N);
    lv.slice(1).forEach((n, k) => expect(n).toBeLessThanOrEqual(lv[k]));
    expect(r.axial!.sigmaAxial).toBeLessThan(1e-6);
    expect(r.maxStress).toBeLessThan(1e-2);
    expect(Math.abs(r.ground!.contactTotal - REF.q * REF.L)).toBeLessThan(1e-6 * REF.q * REF.L);
  });

  it("partial contact, several supports, lateral offset: complementarity, balances and hl coupling", () => {
    const r = ok({ hv: 2000, hl: 1500, numSupports: 3, groundZ: 0 });
    const tol = r.diagnostics.tolDisp, tf = r.diagnostics.tolForce;
    for (const s of r.supports) {
      expect(s.gap).toBeGreaterThanOrEqual(-tol);
      expect(s.reaction).toBeGreaterThanOrEqual(-tf);
      expect(Math.min(Math.abs(s.gap) / tol, Math.abs(s.reaction) / tf)).toBeLessThanOrEqual(1);
    }
    const g = r.ground!;
    const sum = r.endReactions.left.force + r.endReactions.right.force + r.supports.reduce((a, s) => a + s.reaction, 0) + g.totalReaction;
    expect(Math.abs(sum - REF.q * REF.L)).toBeLessThan(1e-6 * REF.q * REF.L);
    expect(g.maxPenetration).toBeLessThanOrEqual(g.tolPenetration);
    const n0 = ok({ hv: 2000, hl: 0, numSupports: 3 }), n1 = ok({ hv: 2000, hl: 1500, numSupports: 3 });
    const Ms = (x: BiaxialSuccess) => x.supports.reduce((a, s) => a + s.reaction * s.x, 0) + x.endReactions.right.force * REF.L + x.endReactions.left.couple + x.endReactions.right.couple;
    expect(Math.abs(Ms(n1) - REF.q * REF.L ** 2 / 2 - n1.axial!.N * 2000)).toBeLessThan(1e-6 * REF.q * REF.L ** 2);
    expect(n1.supports.map((s) => s.reaction)).not.toEqual(n0.supports.map((s) => s.reaction));
    expect(n1.axial!.N).toBeGreaterThan(n0.axial!.N);
  });

  it("refuses an unconverged mesh explicitly", () => {
    const r = solveRestrained({ ...R, hv: 2500 }, { maxElements: 64 });
    expect(r.status).toBe("incomplete");
  });

  it("combined criterion is separate from the bending criterion", () => {
    const r = ok({ hv: 300 }), a = r.axial!;
    expect(a.combinedMax).toBeCloseTo(a.sigmaAxial + r.maxStress, 9);
    const t = ok({ hv: 300, sigmaAllow: r.maxStress + a.sigmaAxial / 2 });
    expect(t.bendingCriterionMet).toBe(true);
    expect(t.axial!.combinedCriterionMet).toBe(false);
    expect(r.physicalValidity).toBe("not-assessed");
  });
});
