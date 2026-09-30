// créé par Giovanni Malagnino, 2026-09-26 05:05 CEST (Europe/Rome, UTC+2)
// V2-7-R1 non-regression: lengths that failed before (precision loss on the
// fine meshes, ground inactive) and consistency of the exact path.
import { describe, expect, it } from "vitest";
import { REF } from "./helpers";
import { solveGroundFixedLength } from "../ground-solve";
import { solveBiaxialFixedLength } from "../solve";
import { failureCause } from "../ground-classify";
import type { BiaxialSuccess } from "../types";

const { L: _L, numSupports: _n, ...B } = REF;
const ok = (r: unknown) => { expect((r as BiaxialSuccess).status).toBe("ok"); return r as BiaxialSuccess; };

describe("V2-7-R1 previously failing lengths", () => {
  // Lengths (mm) that returned "incomplete" (precision loss) before the fix.
  const cases: [number, number, number][] = [[0, 1000, 7797.6], [0, 2500, 20257], [3, 2500, 10590], [8, 2500, 7500], [20, 2500, 7500], [20, 2500, 15000], [20, 2500, 31290]];
  it.each(cases)("n=%i hv=%i L=%f is solved and valid", (n, hv, L) => {
    const r = ok(solveGroundFixedLength({ ...B, L, hv, numSupports: n, groundZ: 0 }));
    expect(r.numericalValid).toBe(true);
    expect(r.ground!.method).toBe("exact-no-contact");
    // Ends lie on the ground (groundZ = 0): the true global minimum is 0 (V2-8-R1).
    expect(Math.abs(r.ground!.minClearance!)).toBeLessThan(1e-6);
  });
});

describe("V2-7-R1 exact path equals the no-ground engine", () => {
  it("same stress, supports and reactions; clamp reaction counted at ground level", () => {
    const inp = { ...B, L: 15000, hv: 2500, numSupports: 20 };
    const g = ok(solveGroundFixedLength({ ...inp, groundZ: 0 })), f = ok(solveBiaxialFixedLength(inp));
    expect(g.maxStress).toBe(f.maxStress);
    g.supports.forEach((s, k) => expect(s.reaction).toBe(f.supports[k].reaction));
    expect(g.ground!.endReaction).toBe(f.endReactions.left.force);
    expect(g.ground!.contactTotal).toBe(g.ground!.endReaction);
    expect(g.ground!.refinement).toHaveLength(0);
  });
  it("large lateral offset does not change the vertical decision", () => {
    const a = ok(solveGroundFixedLength({ ...B, L: 12000, hv: 2500, numSupports: 3, groundZ: 0 }));
    const b = ok(solveGroundFixedLength({ ...B, L: 12000, hv: 2500, hl: 3000, numSupports: 3, groundZ: 0 }));
    expect(b.ground!.method).toBe(a.ground!.method);
    expect(b.ground!.minClearance).toBeCloseTo(a.ground!.minClearance!, 9);
  });
  it("real contact still goes through the mesh path (analytic partial-contact case)", () => {
    const r = ok(solveGroundFixedLength({ ...B, L: 30000, numSupports: 0, hv: 1000, groundZ: 0 }));
    expect(r.ground!.method).toBe("mesh-refinement");
    expect(r.ground!.contactNodes).toBeGreaterThan(0);
  });
  it("pipe fully laid on the ground (hv = groundZ = 0) uses the analytical full-contact path (V2-11-R1)", () => {
    const r = ok(solveGroundFixedLength({ ...B, L: 60000, numSupports: 0, hv: 0, hl: 0, groundZ: 0 }));
    expect(r.ground!.method).toBe("analytical-full-contact");
    expect(r.maxStress).toBeLessThan(1e-6 * REF.sigmaAllow + 1e-9);
  });
  it("different initial meshes give the same accepted mesh result", () => {
    const i = { ...B, L: 30000, numSupports: 0, hv: 1000, groundZ: 0 };
    const a = ok(solveGroundFixedLength(i, { minElements: 32 })), b = ok(solveGroundFixedLength(i, { minElements: 128 }));
    expect(Math.abs(a.maxStress - b.maxStress)).toBeLessThan(2e-3 * a.maxStress);
  });
  it("explicit refusal kept: tiny element cap gives a named cause", () => {
    const r = solveGroundFixedLength({ ...B, L: 30000, numSupports: 0, hv: 1000, groundZ: 0 }, { maxElements: 16, minElements: 4 });
    expect(r.status).toBe("incomplete");
    expect(failureCause(r)).toMatch(/mesh-not-converged|precision-loss/);
  });
});
