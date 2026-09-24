// créé par Giovanni Malagnino, 2026-09-24 03:38 CEST (Europe/Rome, UTC+2)
// Tests of the analytical admissible-length search (0 or 1 support).

import { describe, expect, it } from "vitest";
import {
  LengthSearchInput, LengthWindow, searchLengthFixedSupports, searchMinSupportsLength,
  verifyWindowWithEngine,
} from "..";
import { REF } from "./helpers";

const { L: _L, numSupports: _n, ...BASE } = REF;
const IN: LengthSearchInput = { ...BASE, hv: 2500, hl: 0 };

function win(over: Partial<LengthSearchInput>, n: 0 | 1): LengthWindow {
  const r = searchLengthFixedSupports({ ...IN, ...over }, n);
  if (r.status !== "ok") throw new Error(r.status);
  return r.window;
}
const relOk = (a: number | null | undefined, b: number, tol = 1e-9) =>
  expect(Math.abs((a as number) - b) / Math.abs(b)).toBeLessThan(tol);
const engineOk = (over: Partial<LengthSearchInput>, w: LengthWindow) => {
  const checks = verifyWindowWithEngine({ ...IN, ...over }, w);
  expect(checks.length).toBeGreaterThan(0);
  for (const ch of checks) expect(ch.ok, JSON.stringify(ch)).toBe(true);
  return checks;
};

describe("reference cases", () => {
  const refs = [
    { hl: 0, s0: 423.8447418046, Lmin: 27358.305216, Lmax: 62099.884126, Lopt: 41218.291859, s1: 211.9223709023 },
    { hl: 1000, s0: 431.9301261561, Lmin: 28437.430087, Lmax: 62001.776201, Lopt: 41990.131888, s1: 215.965063078 },
  ];
  for (const k of refs) {
    it(`hl=${k.hl}`, () => {
      const w0 = win({ hl: k.hl }, 0);
      expect(w0.status).toBe("none");
      relOk(w0.optimum!.sigmaMin, k.s0, 1e-10);
      const w1 = win({ hl: k.hl }, 1);
      expect(w1.status).toBe("window");
      relOk(w1.lower!.value, k.Lmin);
      relOk(w1.upper!.value, k.Lmax);
      expect(w1.lower!.included && w1.upper!.included).toBe(true);
      relOk(w1.optimum!.Lopt, k.Lopt);
      relOk(w1.optimum!.sigmaMin, k.s1, 1e-10);
      const checks = engineOk({ hl: k.hl }, w1);
      for (const ch of checks.filter((c) => c.role === "lower" || c.role === "upper")) {
        expect(Math.abs(ch.engine! - IN.sigmaAllow) / IN.sigmaAllow).toBeLessThan(1e-8);
      }
      engineOk({ hl: k.hl }, w0);
      const m = searchMinSupportsLength({ ...IN, hl: k.hl });
      expect(m.status).toBe("found");
      if (m.status === "found") expect(m.numSupports).toBe(1);
    });
  }
});

describe("limit cases", () => {
  it("q = 0, H > 0: Lmin only, no upper bound, infimum 0 not attained", () => {
    for (const n of [0, 1] as const) {
      const w = win({ q: 0 }, n);
      relOk(w.lower!.value, Math.sqrt((6 * IN.E * IN.c * 2500) / IN.sigmaAllow), 1e-12);
      expect(w.upper).toEqual({ value: null, included: false, kind: "unbounded" });
      expect(w.optimum).toBeNull();
      expect(w.infimum).toEqual({ sigma: 0, attained: false, approachedAs: "L-to-infinity" });
      engineOk({ q: 0 }, w);
    }
  });
  it("q > 0, H = 0: 0 < L <= sqrt(s/b)", () => {
    const w = win({ hv: 0 }, 0);
    const b = (IN.q * IN.c) / (12 * IN.I);
    expect(w.lower).toEqual({ value: null, included: false, kind: "zero-excluded" });
    relOk(w.upper!.value, Math.sqrt(IN.sigmaAllow / b), 1e-12);
    expect(w.infimum.attained).toBe(false);
    engineOk({ hv: 0 }, w);
    engineOk({ hv: 0 }, win({ hv: 0 }, 1));
  });
  it("q = 0, H = 0: every L > 0, zero stress, no optimum", () => {
    const w = win({ q: 0, hv: 0 }, 0);
    expect(w.status).toBe("window");
    expect(w.upper!.value).toBeNull();
    expect(w.optimum).toBeNull();
    expect(w.infimum).toEqual({ sigma: 0, attained: true, approachedAs: "everywhere" });
    engineOk({ q: 0, hv: 0 }, w);
  });
  it("sigmaAllow below the minimum: no window; equal: single point", () => {
    const w1 = win({}, 1);
    expect(win({ sigmaAllow: 200 }, 1).status).toBe("none");
    const p = win({ sigmaAllow: w1.optimum!.sigmaMin }, 1);
    expect(p.status).toBe("single-point");
    expect(p.lower!.value).toBe(p.upper!.value);
    expect(p.lower!.value).toBe(w1.optimum!.Lopt);
  });
  it("very narrow window around Lopt", () => {
    const s = win({}, 1).optimum!.sigmaMin * (1 + 1e-6);
    const w = win({ sigmaAllow: s }, 1);
    expect(w.status).toBe("window");
    const { Lopt } = w.optimum!;
    expect(w.lower!.value!).toBeLessThan(Lopt);
    expect(w.upper!.value!).toBeGreaterThan(Lopt);
    expect((w.upper!.value! - w.lower!.value!) / Lopt).toBeLessThan(1e-2);
    engineOk({ sigmaAllow: s }, w);
  });
});

describe("signs, configurations and scope", () => {
  it("negative hv and hl give the same window", () => {
    const a = win({ hl: 1000 }, 1);
    const b = win({ hv: -2500, hl: -1000 }, 1);
    expect(b.lower!.value).toBe(a.lower!.value);
    expect(b.upper!.value).toBe(a.upper!.value);
    const checks = engineOk({ hv: -2500, hl: -1000 }, b);
    expect(checks.every((c) => c.ok)).toBe(true);
  });
  it("zero support suffices for a small offset", () => {
    const m = searchMinSupportsLength({ ...IN, hv: 100 });
    expect(m.status).toBe("found");
    if (m.status === "found") {
      expect(m.numSupports).toBe(0);
      engineOk({ hv: 100 }, m.window);
    }
  });
  it("neither 0 nor 1 support suffices: explicit scoped status", () => {
    const m = searchMinSupportsLength({ ...IN, sigmaAllow: 150 });
    expect(m.status).toBe("no-solution-in-0-or-1-support");
    if (m.status === "no-solution-in-0-or-1-support") {
      expect(m.scope).toBe("supports-0-or-1");
      expect(m.windows.map((w) => w.status)).toEqual(["none", "none"]);
    }
  });
  it("contract errors", () => {
    expect(searchLengthFixedSupports(IN, 2).status).toBe("invalid-input");
    expect(searchLengthFixedSupports({ ...IN, q: -1 }, 0).status).toBe("invalid-input");
    expect(searchMinSupportsLength({ ...IN, axialMode: "restrained" }).status).toBe("not-implemented");
    const json = JSON.stringify(win({ q: 0 }, 0));
    expect(json.includes("null")).toBe(true);
  });
});
