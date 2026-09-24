// créé par Giovanni Malagnino, 2026-09-24 03:46 CEST (Europe/Rome, UTC+2)
// V2-2A-R1: overflow-safe bounds and central finite-bound guarantee.
// Numbers are inspected directly (JSON.stringify would turn Infinity into null).

import { describe, expect, it } from "vitest";
import { LengthSearchInput, LengthWindow, searchLengthFixedSupports, searchMinSupportsLength } from "..";
import { REF } from "./helpers";

const { L: _L, numSupports: _n, ...BASE } = REF;
const IN: LengthSearchInput = { ...BASE, hv: 2500, hl: 0 };

const expectFiniteBounds = (w: LengthWindow) => {
  for (const b of [w.lower, w.upper]) {
    if (b?.kind === "finite") {
      expect(typeof b.value).toBe("number");
      expect(Number.isFinite(b.value)).toBe(true);
      expect(b.value as number).toBeGreaterThan(0);
    } else if (b) expect(b.value).toBeNull();
  }
};

describe("reproductions now return representable bounds", () => {
  for (const n of [0, 1] as const) {
    it(`q = 0, sigmaAllow = 1e-300, ${n} support(s)`, () => {
      const r = searchLengthFixedSupports({ ...IN, q: 0, sigmaAllow: 1e-300 }, n);
      expect(r.status).toBe("ok");
      if (r.status !== "ok") return;
      expectFiniteBounds(r.window);
      expect(r.window.lower!.kind).toBe("finite");
      const expected = Math.sqrt(6 * IN.E * IN.c * 2500) / Math.sqrt(1e-300);
      expect(Math.abs(r.window.lower!.value! - expected) / expected).toBeLessThan(1e-12);
      expect(r.window.upper!.kind).toBe("unbounded");
    });
    it(`hv = hl = 0, sigmaAllow = 1e308, ${n} support(s)`, () => {
      const r = searchLengthFixedSupports({ ...IN, hv: 0, sigmaAllow: 1e308 }, n);
      expect(r.status).toBe("ok");
      if (r.status !== "ok") return;
      expectFiniteBounds(r.window);
      expect(r.window.upper!.kind).toBe("finite");
    });
  }
});

describe("genuine overflow gives numerical-failure, never unbounded", () => {
  const lowerOverflow: LengthSearchInput = { ...IN, E: 1e290, q: 0, sigmaAllow: 5e-324 };
  const upperOverflow: LengthSearchInput = { ...IN, hv: 0, q: 1e-310, sigmaAllow: 1e308 };
  for (const n of [0, 1] as const) {
    it(`fixed supports = ${n}`, () => {
      expect(searchLengthFixedSupports(lowerOverflow, n).status).toBe("numerical-failure");
      expect(searchLengthFixedSupports(upperOverflow, n).status).toBe("numerical-failure");
    });
  }
  it("propagates through searchMinSupportsLength", () => {
    const a = searchMinSupportsLength(lowerOverflow);
    const b = searchMinSupportsLength(upperOverflow);
    expect(a.status).toBe("numerical-failure");
    expect(b.status).toBe("numerical-failure");
    if (a.status === "numerical-failure") expect(a.message).toMatch(/bound/);
  });
  it("underflow of a non-zero load is not treated as q = 0", () => {
    const r = searchLengthFixedSupports({ ...IN, hv: 0, q: 5e-324 }, 0);
    expect(r.status).toBe("numerical-failure");
  });
  it("representable reproductions propagate through searchMinSupportsLength", () => {
    const m = searchMinSupportsLength({ ...IN, q: 0, sigmaAllow: 1e-300 });
    expect(m.status).toBe("found");
    if (m.status === "found") expectFiniteBounds(m.window);
  });
});
