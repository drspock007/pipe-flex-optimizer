// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Closed-form checks without intermediate supports and input contract.

import { describe, expect, it } from "vitest";
import { evaluateAt, solveBiaxialFixedLength } from "..";
import { REF, rel, solveOk } from "./helpers";

const { L, E, I, q, c } = REF;
const EI = E * I;

describe("mechanics-v2 closed form (no support)", () => {
  it("zero loads and offsets give zero fields", () => {
    const r = solveOk({ q: 0, hv: 0, hl: 0 });
    expect(r.maxStress).toBe(0);
    expect(r.critical.phiTension).toBeNull();
    expect(Math.abs(evaluateAt(r, L / 3).z)).toBe(0);
  });

  it("self weight only", () => {
    const r = solveOk({ hv: 0 });
    expect(rel(evaluateAt(r, 0).Mv, (-q * L * L) / 12)).toBeLessThan(1e-10);
    expect(rel(evaluateAt(r, L / 2).Mv, (q * L * L) / 24)).toBeLessThan(1e-10);
    expect(rel(evaluateAt(r, L / 2).z, (-q * L ** 4) / (384 * EI))).toBeLessThan(1e-10);
  });

  it("vertical offset and combined weight + offset match references", () => {
    for (const qq of [0, q]) {
      const hv = 2500;
      const r = solveOk({ q: qq, hv });
      for (const s of [0, 0.13, 0.5, 0.77, 1]) {
        const x = s * L;
        const f = evaluateAt(r, x);
        const z = hv * (3 * s * s - 2 * s ** 3) - (qq * x * x * (L - x) ** 2) / (24 * EI);
        const Mv = (6 * EI * hv * (1 - 2 * s)) / L ** 2 - (qq * L * L * (1 - 6 * s + 6 * s * s)) / 12;
        expect(Math.abs(f.z - z)).toBeLessThan(1e-9 * hv);
        expect(Math.abs(f.Mv - Mv)).toBeLessThan(1e-9 * (6 * EI * hv) / L ** 2);
      }
      expect(rel(r.endReactions.left.force, (qq * L) / 2 - (12 * EI * hv) / L ** 3)).toBeLessThan(1e-9);
      expect(rel(r.endReactions.right.force, (qq * L) / 2 + (12 * EI * hv) / L ** 3)).toBeLessThan(1e-9);
    }
  });

  it("lateral offset only", () => {
    const hl = 1000;
    const r = solveOk({ q: 0, hv: 0, hl });
    const f = evaluateAt(r, 0.3 * L);
    expect(rel(f.y, hl * (3 * 0.09 - 2 * 0.027))).toBeLessThan(1e-12);
    expect(rel(f.Ml, (6 * EI * hl * 0.4) / L ** 2)).toBeLessThan(1e-12);
    expect(rel(r.maxStress, (c * 6 * EI * hl) / (L * L * I))).toBeLessThan(1e-10);
  });

  it("hv = hl gives sqrt(2) times the single-plane maximum", () => {
    const a = solveOk({ q: 0, hv: 1000, hl: 0 });
    const b = solveOk({ q: 0, hv: 1000, hl: 1000 });
    expect(rel(b.maxStress, Math.SQRT2 * a.maxStress)).toBeLessThan(1e-10);
  });

  it("input contract", () => {
    expect(solveBiaxialFixedLength({ ...REF, axialMode: "restrained" }).status).toBe("ok"); // V2-9: implemented in Fixed L
    expect(solveBiaxialFixedLength({ ...REF, L: -1 }).status).toBe("invalid-input");
    expect(solveBiaxialFixedLength({ ...REF, q: -0.1 }).status).toBe("invalid-input");
    expect(solveBiaxialFixedLength({ ...REF, numSupports: 1.5 }).status).toBe("invalid-input");
    expect(solveBiaxialFixedLength({ ...REF, numSupports: 21 }).status).toBe("invalid-input");
    expect(solveBiaxialFixedLength({ ...REF, hv: NaN }).status).toBe("invalid-input");
  });
});
