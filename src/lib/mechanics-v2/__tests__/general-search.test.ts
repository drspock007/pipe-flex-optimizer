// créé par Giovanni Malagnino, 2026-09-25 01:04 CEST (Europe/Rome, UTC+2)
import { describe, expect, it } from "vitest";
import { searchLengthFixedSupports, searchMinSupportsLength, searchLengthGeneral, searchMinSupportsGeneral, solveBiaxialFixedLength } from "..";
import { GeneralFixedResult } from "../general-search-types";
import { REF, rel } from "./helpers";

const { L: _L, numSupports: _n, ...BASE } = REF;
type Ok = Extract<GeneralFixedResult, { status: "ok" }>;
const gen = (n: number, o: object = {}): Ok => {
  const r = searchLengthGeneral({ ...BASE, ...o }, n);
  if (r.status !== "ok") throw new Error(JSON.stringify(r));
  return r;
};
const engine = (L: number, n: number, o: object = {}) => {
  const r = solveBiaxialFixedLength({ ...REF, ...o, L, numSupports: n });
  if (r.status !== "ok") throw new Error(r.status);
  return r;
};

describe("general length search (0..20 supports)", () => {
  it("recovers the analytical windows for 0 and 1 support", () => {
    for (const hl of [0, 1000]) {
      for (const n of [0, 1]) {
        const a = searchLengthFixedSupports({ ...BASE, hl }, n);
        if (a.status !== "ok") throw new Error();
        const g = gen(n, { hl });
        expect(rel(g.infimum.sigma, a.window.infimum.sigma)).toBeLessThan(1e-10);
        if (a.window.status === "none") expect(g.ranges).toEqual([]);
        else {
          expect(rel(g.ranges[0].lower.value!, a.window.lower!.value!)).toBeLessThan(1e-9);
          expect(rel(g.ranges[0].upper.value!, a.window.upper!.value!)).toBeLessThan(1e-9);
        }
      }
    }
  });

  it("two supports: transition at 37360.779883568 mm", () => {
    const g = gen(2);
    expect(g.regimes[0].activeSet).toEqual([1]);
    expect(rel(g.regimes[0].upper.value!, 37360.779883568)).toBeLessThan(1e-12);
    expect(g.regimes[0].upperEvents).toEqual([{ kind: "gap-zero", support: 2 }]);
  });

  it("several contact changes are continuous and match the engine contact state", () => {
    for (const n of [5, 10]) {
      const g = gen(n);
      expect(g.regimes.length).toBeGreaterThan(3);
      g.regimes.forEach((r, k) => {
        if (k) expect(r.lower.value).toBe(g.regimes[k - 1].upper.value);
        const lo = r.lower.value ?? 0.5 * r.upper.value!;
        const L = r.upper.value ? 0.5 * (lo + r.upper.value) : 2 * lo;
        const act = engine(L, n).supports.filter((s) => s.active).map((s) => s.index);
        expect(act).toEqual(r.activeSet);
      });
    }
  });

  it("bounds, minima, interior and exterior points agree with the engine", () => {
    for (const n of [2, 5]) {
      const g = gen(n);
      const { lower, upper } = g.ranges[0];
      const s = REF.sigmaAllow;
      for (const L of [lower.value!, upper.value!]) {
        const e = engine(L, n);
        expect(e.maxStress).toBeLessThanOrEqual(s * (1 + 1e-9));
        expect(rel(e.maxStress, s)).toBeLessThan(1e-8);
      }
      const Lm = g.infimum.locations[0];
      expect(rel(engine(Lm, n).maxStress, g.infimum.sigma)).toBeLessThan(1e-9);
      for (const f of [0.1, 0.5, 0.9]) {
        expect(engine(lower.value! + f * (upper.value! - lower.value!), n).bendingCriterionMet).toBe(true);
      }
      expect(engine(lower.value! * 0.99, n).bendingCriterionMet).toBe(false);
      expect(engine(upper.value! * 1.01, n).bendingCriterionMet).toBe(false);
    }
  });

  it("tangency and very narrow window", () => {
    const smin = gen(2).infimum.sigma;
    // Candidate above the threshold within the tangency tolerance: undecidable, never admissible.
    expect(searchLengthGeneral({ ...BASE, sigmaAllow: smin * (1 - 1e-13) }, 2).status).toBe("undecidable");
    const w = gen(2, { sigmaAllow: smin * (1 + 1e-6) });
    const [lo, hi] = [w.ranges[0].lower.value!, w.ranges[0].upper.value!];
    expect(hi / lo - 1).toBeLessThan(0.01);
    expect(hi).toBeGreaterThan(lo);
    expect(engine(0.5 * (lo + hi), 2, { sigmaAllow: smin * (1 + 1e-6) }).bendingCriterionMet).toBe(true);
    expect(gen(2, { sigmaAllow: smin * 0.99 }).ranges).toEqual([]);
  });

  it("no load, no offset and fully zero problems", () => {
    const H = REF.hv;
    const q0 = gen(3, { q: 0 });
    expect(q0.ranges[0].upper.kind).toBe("unbounded");
    expect(q0.infimum.approachedAs).toBe("L-to-infinity");
    expect(rel(gen(0, { q: 0 }).ranges[0].lower.value!, Math.sqrt((6 * REF.E * REF.c * H) / REF.sigmaAllow))).toBeLessThan(1e-12);
    const h0 = gen(3, { hv: 0 });
    expect(h0.ranges[0].lower.kind).toBe("zero-excluded");
    expect(h0.infimum.approachedAs).toBe("L-to-zero");
    expect(h0.regimes[0].activeSet).toEqual([1, 2, 3]); // simultaneous entry of all contacts
    const z = gen(4, { q: 0, hv: 0 });
    expect(z.infimum.approachedAs).toBe("everywhere");
    expect(z.ranges[0].lower.kind).toBe("zero-excluded");
    expect(z.ranges[0].upper.kind).toBe("unbounded");
  });

  it("minimum support count and certified absence within scope", () => {
    const m = searchMinSupportsGeneral(BASE, 20);
    expect(m.status).toBe("found");
    if (m.status === "found") expect(m.numSupports).toBe(1);
    const zero = searchMinSupportsGeneral({ ...BASE, sigmaAllow: 500 }, 20);
    expect(zero.status === "found" && zero.numSupports).toBe(0);
    expect(searchMinSupportsGeneral({ ...BASE, sigmaAllow: 50 }, 3).status).toBe("no-solution-in-scope");
  });

  it("tangency reproduction (0 supports): no admissible point, minimality not certified", () => {
    const sa = 423.8447418043896;
    const r0 = searchLengthGeneral({ ...BASE, sigmaAllow: sa }, 0);
    expect(r0.status).toBe("undecidable");
    const a0 = searchLengthFixedSupports({ ...BASE, sigmaAllow: sa }, 0);
    expect(a0.status === "ok" && a0.window.status).toBe("undecidable");
    const m = searchMinSupportsGeneral({ ...BASE, sigmaAllow: sa }, 3);
    expect(m.status).toBe("incomplete");
    if (m.status === "incomplete") expect(m.candidate?.numSupports).toBe(1);
    const ma = searchMinSupportsLength({ ...BASE, sigmaAllow: sa });
    expect(ma.status === "found" && ma.minimalityCertified).toBe(false);
  });

  it("numerical failures are never converted into absence of solution", () => {
    const bad = { ...BASE, E: 1e200, I: 1e200 };
    expect(searchLengthGeneral(bad, 2).status).toBe("numerical-failure");
    const m = searchMinSupportsGeneral(bad, 3);
    expect(m.status).toBe("incomplete");
    if (m.status === "incomplete") expect(m.candidate).toBeNull();
  });

  it("invalid inputs and restrained mode", () => {
    expect(searchLengthGeneral(BASE, 21).status).toBe("invalid-input");
    expect(searchMinSupportsGeneral(BASE, 21).status).toBe("invalid-input");
    expect(searchLengthGeneral({ ...BASE, axialMode: "restrained" }, 2).status).toBe("not-implemented");
  });

  it("5, 10 and 20 supports run fast", () => {
    for (const n of [5, 10, 20]) {
      const t = performance.now();
      const g = gen(n);
      const ms = performance.now() - t;
      console.log(`[general-search-timing] n=${n}: ${ms.toFixed(1)} ms, ${g.regimes.length} regimes`);
      expect(ms).toBeLessThan(3000);
      expect(g.ranges.length).toBeGreaterThan(0);
    }
  });
});
