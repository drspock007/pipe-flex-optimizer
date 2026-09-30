// créé par Giovanni Malagnino, 2026-09-25 22:40 CEST (Europe/Rome, UTC+2)
// V2-6: Find h with ground contact.
import { describe, expect, it } from "vitest";
import { GroundHeightInput, GroundHeightResult, searchHeightFixedSupports, searchHeightGround, solveGroundFixedLength } from "..";
import { REF, rel } from "./helpers";

const { hv: _hv, numSupports: _n, ...BASE } = REF;
const IN: GroundHeightInput = { ...BASE, groundZ: 0 };
const G = (over: Partial<GroundHeightInput> = {}, n = 0, lim = {}) => searchHeightGround({ ...IN, ...over }, n, lim);
type Pub = Extract<GroundHeightResult, { ranges: unknown }>;
const pub = (r: GroundHeightResult): Pub => { if (!("ranges" in r)) throw new Error(JSON.stringify(r)); return r; };
const verify = (hv: number, n: number, over: Partial<GroundHeightInput> = {}) => {
  const r = solveGroundFixedLength({ ...IN, ...over, hv, numSupports: n });
  if (r.status !== "ok") throw new Error(r.status);
  return r;
};

// Closed-form partial contact (0 support, groundZ = 0, hl = 0): sigma = q ell^2 c / (6 I),
// ell = (72 EI hv / q)^(1/4)  =>  hv_max = (6 I sA / (q c))^2 q / (72 EI).
const EI = IN.E * IN.I;
const hvMaxRef = ((6 * IN.I * IN.sigmaAllow) / (IN.q * IN.c)) ** 2 * IN.q / (72 * EI);

describe("Find h with ground", () => {
  it("ground at zero, 0 support: matches the closed form, no negative hv", () => {
    const r = pub(G());
    expect(r.status).toBe("found");
    expect(r.ranges).toHaveLength(1);
    expect(r.ranges[0].lower.value).toBe(0);
    expect(r.ranges[0].lower.domainEdge).toBe(true);
    expect(rel(r.ranges[0].upper.value, hvMaxRef)).toBeLessThan(5e-3);
    expect(r.ranges[0].upper.value).toBeLessThanOrEqual(hvMaxRef * (1 + 1e-4));
    expect(r.samples.every((s) => s.hv >= 0)).toBe(true);
    // Published bound and interior points re-checked with the full solver.
    const up = r.ranges[0].upper;
    expect(verify(up.value, 0).maxStress).toBeLessThanOrEqual(IN.sigmaAllow);
    expect(verify(0.5 * up.value, 0).maxStress).toBeLessThanOrEqual(IN.sigmaAllow);
    expect(up.bracket! > up.value).toBe(true);
  });

  it("ground low enough to stay inactive: agrees with the no-ground search", { timeout: 60000 }, () => {
    for (const n of [0, 1]) {
      const ng = searchHeightFixedSupports(BASE, n);
      if (ng.status !== "ok") throw new Error(ng.status);
      const r = pub(G({ groundZ: -1e5 }, n));
      expect(r.status).toBe("found");
      expect(r.ranges).toHaveLength(1);
      // The exact bound lies inside the published bracket: verified value .. transition zone end.
      const up = r.ranges[0].upper, lw = r.ranges[0].lower;
      const zU = r.zones.find((z) => z.from === up.value), zL = r.zones.find((z) => z.to === lw.value);
      expect(up.value).toBeLessThanOrEqual(ng.extremes.max);
      expect((zU?.to ?? up.bracket!) >= ng.extremes.max).toBe(true);
      expect(lw.value).toBeGreaterThanOrEqual(ng.extremes.min);
      expect((zL?.from ?? lw.bracket!) <= ng.extremes.min).toBe(true);
      expect(rel(up.value, ng.extremes.max)).toBeLessThan(1e-2);
    }
  });

  it("ground below zero allows negative hv; above zero is incompatible", () => {
    const r = pub(G({ groundZ: -300 }));
    expect(r.domain!.lower).toBe(-300);
    expect(r.ranges[0].lower.value).toBeLessThan(0);
    expect(G({ groundZ: 10 }).status).toBe("geometry-incompatible");
  });

  it("several supports with contact changes", () => {
    const r = pub(G({}, 3));
    expect(r.status).toBe("found");
    expect(r.ranges.length).toBeGreaterThan(0);
    for (const rg of r.ranges) for (const b of [rg.lower, rg.upper]) expect(verify(b.value, 3).maxStress).toBeLessThanOrEqual(IN.sigmaAllow);
  });

  it("q = 0 and lateral stress alone above the allowable", () => {
    const r0 = pub(G({ q: 0 }));
    expect(r0.ranges.length).toBe(1);
    const hl = 2 * (IN.sigmaAllow * IN.L ** 2) / (6 * IN.E * IN.c);
    const r = pub(G({ hl }));
    expect(r.status).toBe("none-found");
    expect(r.ranges).toHaveLength(0);
  });

  it("resource limit gives incomplete, never no-solution", () => {
    const r = pub(G({}, 0, { maxEvaluations: 5 }));
    expect(r.status).toBe("incomplete");
    expect(r.zones.some((z) => z.reason === "budget")).toBe(true);
  });

  it("failed evaluations are never counted as not admissible", () => {
    const r = pub(G({}, 0, { solve: { maxElements: 64 } }));
    expect(r.status).not.toBe("impossible");
    expect(r.coverage.failedEvaluations).toBeGreaterThan(0);
    expect(r.samples.some((s) => s.cls === "failed")).toBe(true);
    expect(r.zones.some((z) => z.reason === "solver-failure")).toBe(true);
  });

  it("20 supports within the resource limits", () => {
    const t = performance.now();
    const r = pub(G({}, 20));
    expect(r.status).not.toBe("incomplete");
    expect(performance.now() - t).toBeLessThan(25000);
  }, 60000);
});
