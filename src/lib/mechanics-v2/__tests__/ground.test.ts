// créé par Giovanni Malagnino, 2026-09-25 20:10 CEST (Europe/Rome, UTC+2)
// V2-5 ground contact branch (rigid horizontal frictionless ground).

import { describe, expect, it } from "vitest";
import { BiaxialSuccess, solveBiaxialFixedLength, solveGroundFixedLength, GroundInput } from "..";
import { memberMinZ } from "../ground-mesh";
import { REF, rel } from "./helpers";

const g = (over: Partial<GroundInput>) => solveGroundFixedLength({ ...REF, groundZ: 0, ...over });
const ok = (over: Partial<GroundInput>): BiaxialSuccess => {
  const r = g(over);
  if (r.status !== "ok") throw new Error(`status ${r.status}: ${JSON.stringify(r)}`);
  return r;
};

describe("ground contact (V2-5)", () => {
  it("low ground stays inactive and matches the no-ground engine", () => {
    for (const n of [0, 1, 5]) {
      const a = ok({ groundZ: -5000, numSupports: n });
      const b = solveBiaxialFixedLength({ ...REF, numSupports: n });
      if (b.status !== "ok") throw new Error("reference failed");
      expect(rel(a.maxStress, b.maxStress)).toBeLessThan(1e-8);
      a.supports.forEach((s, k) => expect(Math.abs(s.reaction - b.supports[k].reaction)).toBeLessThan(1e-6 * REF.q * REF.L));
      expect(a.ground!.totalReaction).toBe(0);
      expect(a.ground!.contactZones).toEqual([]);
    }
  });

  it("hv = hl = 0 on the ground: pipe carried, bending tends to zero, equilibrium", () => {
    const r = ok({ hv: 0, hl: 0 });
    expect(r.maxStress).toBeLessThan(1e-3);
    const total = r.ground!.totalReaction + r.endReactions.left.force + r.endReactions.right.force;
    expect(Math.abs(total - REF.q * REF.L)).toBeLessThan(1e-6 * REF.q * REF.L);
    expect(r.ground!.contactZones).toEqual([{ xStart: 0, xEnd: REF.L }]);
    expect(r.diagnostics.equilibriumOk).toBe(true);
    // Stress decreases with refinement (limit solution: zero vertical bending).
    const s = r.ground!.refinement.map((x) => x.maxStress);
    for (let k = 1; k < s.length; k++) expect(s[k]).toBeLessThan(s[k - 1]);
  });

  it("partial uplift: carried zone near x = 0 then a lifted zone", () => {
    const r = ok({ hv: 1000 });
    const z = r.ground!.contactZones;
    expect(z.length).toBeGreaterThan(0);
    expect(z[0].xStart).toBe(0);
    expect(z[z.length - 1].xEnd).toBeLessThan(0.5 * REF.L);
    expect(r.ground!.totalReaction).toBeGreaterThan(0);
    expect(r.ground!.totalReaction).toBeLessThan(REF.q * REF.L);
    expect(r.ground!.maxPenetration).toBeLessThanOrEqual(r.ground!.tolPenetration);
    expect(r.ground!.converged).toBe(true);
    expect(r.numericalValid).toBe(true);
    expect(r.physicalValidity).toBe("not-assessed");
    expect(r.bendingCriterionMet).toBe(r.maxStress <= r.sigmaAllow);
  });

  it("end below the minimum axis elevation is an explicit incompatibility", () => {
    expect(g({ hv: -100 }).status).toBe("geometry-incompatible");
    expect(g({ hv: 2500, groundZ: 10 }).status).toBe("geometry-incompatible");
    expect(g({ hv: 0, groundZ: 0 }).status).toBe("ok");
  });

  it("support at the ground level: no singularity, combined reaction reported", () => {
    const r = ok({ hv: 0, hl: 100, numSupports: 3 }); // hl != 0: mesh path (flat analytical branch not triggered)
    expect(r.supports.every((s) => s.sharedWithGround)).toBe(true);
    expect(r.ground!.combinedReaction).toBeGreaterThan(0);
    expect(r.supports.length).toBe(3); // installed supports, not contact points
    expect(r.ground!.contactNodes).toBeGreaterThan(3);
  });

  it("lateral offset does not change the vertical contact", () => {
    const a = ok({ hv: 1000, hl: 0 }), b = ok({ hv: 1000, hl: 1000 });
    expect(Math.abs(a.ground!.totalReaction - b.ground!.totalReaction)).toBeLessThan(1e-9 * REF.q * REF.L);
    a.nodes.forEach((n, i) => expect(Math.abs(n.z - b.nodes[i].z)).toBeLessThan(1e-9));
    expect(b.maxStress).toBeGreaterThan(a.maxStress);
  });

  it("refinement converges and interior minima are checked exactly", () => {
    const r = ok({ hv: 300 });
    const lv = r.ground!.refinement;
    expect(lv.length).toBeGreaterThanOrEqual(2);
    const [p, l] = lv.slice(-2);
    expect(Math.abs(p.maxStress - l.maxStress)).toBeLessThanOrEqual(1e-3 * l.maxStress);
    // Free member with zero end values: min = -q l^4 / (384 EI) at mid-span.
    const EI = REF.E * REF.I, len = 1000;
    expect(rel(memberMinZ(0, 0, 0, 0, len, REF.q, EI), -(REF.q * len ** 4) / (384 * EI))).toBeLessThan(1e-9);
  });

  it("resource limit never yields a false success", () => {
    const r = g({ hv: 1000 }, );
    expect(r.status).toBe("ok");
    const lim = solveGroundFixedLength({ ...REF, groundZ: 0, hv: 1000 }, { maxElements: 64, minElements: 64 });
    expect(lim.status).toBe("incomplete");
    expect(g({ axialMode: "restrained" }).status).toBe("ok"); // V2-9: implemented in Fixed L
    expect(g({ groundZ: NaN }).status).toBe("invalid-input");
  });
});
