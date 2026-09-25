// créé par Giovanni Malagnino, 2026-09-25 17:40 CEST (Europe/Rome, UTC+2)
// V2-4 Find h: references, general path vs reference solver, edge cases.
import { describe, expect, it } from "vitest";
import { HeightSearchInput, searchHeightFixedSupports, solveBiaxialFixedLength } from "..";
import { REF, rel } from "./helpers";

const { hv: _hv, numSupports: _n, ...BASE } = REF;
const H = (over: Partial<HeightSearchInput> = {}, n = 0) => searchHeightFixedSupports({ ...BASE, ...over }, n);
const sig = (hv: number, n: number, over: Partial<HeightSearchInput> = {}) => {
  const r = solveBiaxialFixedLength({ ...REF, ...over, hv, numSupports: n });
  if (r.status !== "ok") throw new Error(r.status);
  return r.maxStress;
};
const ok = (r: ReturnType<typeof H>) => { if (r.status !== "ok") throw new Error(JSON.stringify(r)); return r; };

/** Independent closed form for 0 (k=12) or 1 central (k=48) support. */
const hmax = (n: 0 | 1, hl: number, s = REF.sigmaAllow, q = REF.q) => {
  const a = (6 * REF.E * REF.c) / REF.L ** 2, b = (q * REF.c * REF.L ** 2) / ((n ? 48 : 12) * REF.I);
  return (Math.sqrt(s * s - (a * hl) ** 2) - b) / a;
};

describe("Find h references", () => {
  const cases: [0 | 1, number, number][] = [[0, 0, 783.3097047813], [0, 1000, 641.2036236444], [1, 0, 2887.9909057604], [1, 1000, 2745.8848246234]];
  for (const [n, hl, ref] of cases) {
    it(`${n} support(s), hl=${hl}`, () => {
      const r = ok(H({ hl }, n));
      expect(r.ranges).toHaveLength(1);
      expect(rel(r.extremes.max, ref)).toBeLessThan(1e-9);
      expect(rel(-r.extremes.min, ref)).toBeLessThan(1e-9);
      expect(rel(ref, hmax(n, hl))).toBeLessThan(1e-9);
      expect(sig(r.extremes.max, n, { hl })).toBeLessThanOrEqual(REF.sigmaAllow);
      expect(sig(r.extremes.max * (1 + 1e-7), n, { hl })).toBeGreaterThan(REF.sigmaAllow);
    });
  }
  it("negative hl gives the same ranges", () => {
    expect(rel(ok(H({ hl: -1000 }, 1)).extremes.max, 2745.8848246234)).toBeLessThan(1e-9);
  });
  it("q = 0 gives the lateral/offset-only bound", () => {
    const r = ok(H({ q: 0 }, 0));
    expect(rel(r.extremes.max, hmax(0, 0, REF.sigmaAllow, 0))).toBeLessThan(1e-9);
  });
});

describe("Find h edge cases", () => {
  it("lateral offset alone already excessive: demonstrated no solution", () => {
    expect(H({ hl: 4000 }, 0).status).toBe("no-solution");
  });
  it("load alone already excessive: demonstrated no solution", () => {
    expect(H({ q: 10 }, 0).status).toBe("no-solution");
  });
  const b0 = (REF.q * REF.c * REF.L ** 2) / (12 * REF.I); // sigma at hv = 0, 0 support, hl = 0
  it("tangency just above: undecidable, nothing published", () => {
    expect(H({ sigmaAllow: b0 * (1 - 1e-13) }, 0).status).toBe("undecidable");
  });
  it("clearly below the minimum: no solution", () => {
    expect(H({ sigmaAllow: b0 * (1 - 1e-6) }, 0).status).toBe("no-solution");
  });
  it("narrow range around hv = 0", () => {
    const r = ok(H({ sigmaAllow: b0 * (1 + 1e-6) }, 0));
    expect(r.extremes.min).toBeLessThanOrEqual(0);
    expect(r.extremes.max).toBeGreaterThanOrEqual(0);
    expect(r.extremes.max - r.extremes.min).toBeLessThan(1);
  });
  it("invalid inputs are reported", () => {
    expect(H({}, 21).status).toBe("invalid-input");
    expect(H({ L: 0 }, 0).status).toBe("invalid-input");
    expect(H({ axialMode: "restrained" }, 0).status).toBe("not-implemented");
  });
});

describe("Find h with several supports", () => {
  it("2 supports: several contact changes", () => {
    const r = ok(H({}, 2));
    expect(r.regimes.length).toBeGreaterThanOrEqual(3);
  });
  for (const [n, hl] of [[5, 300], [10, 0], [20, -500]] as const) {
    it(`${n} supports, hl=${hl}: bounds, interior, exterior, symmetry`, () => {
      const r = ok(H({ hl }, n));
      const { min, max } = r.extremes;
      expect(rel(-min, max)).toBeLessThan(1e-9);
      for (const h of [min, max, 0, 0.5 * max, 0.5 * min]) expect(sig(h, n, { hl })).toBeLessThanOrEqual(REF.sigmaAllow);
      for (const h of [max * (1 + 1e-6), min * (1 + 1e-6)]) expect(sig(h, n, { hl })).toBeGreaterThan(REF.sigmaAllow);
      // Reflection x -> L - x maps hv -> -hv and support i -> n + 1 - i.
      const g = r.regimes, m = g.length;
      g.forEach((reg, k) => {
        const mirror = g[m - 1 - k].activeSet.map((i) => n + 1 - i).sort((a, b) => a - b);
        expect(reg.activeSet).toEqual(mirror);
      });
      expect(r.diagnostics.Hcap).toBeGreaterThan(max);
    });
  }
});
