// créé par Giovanni Malagnino, 2026-09-25 01:04 CEST (Europe/Rome, UTC+2)
import { describe, expect, it } from "vitest";
import { computeRegime, intersectRegime } from "../regime";
import { intersectAffine } from "../regime-interval";
import { RegimeInput } from "../regime-types";
import { REF } from "./helpers";

const { L: _L, ...BASE } = REF;
const inp = (o: Partial<RegimeInput>): RegimeInput => ({ ...BASE, activeSet: [], ...o });

describe("regime numerical protections (V2-2B)", () => {
  it("tiny slope: root in length stays finite, never unbounded", () => {
    const iv = intersectRegime([{ kind: "gap", support: 1, constant: 1, slope: -1e-320 }]);
    expect(iv.upper!.kind).toBe("finite");
    const v = iv.upper!.value!;
    expect(Number.isFinite(v)).toBe(true);
    expect(Math.abs(Math.log10(v) - 80)).toBeLessThan(1e-4);
  });

  it("q = 1e-310: the load is kept through the scaled representation", () => {
    const r = computeRegime(inp({ numSupports: 2, activeSet: [1], q: 1e-310 }));
    if (r.status !== "ok") throw new Error(JSON.stringify(r));
    expect(Number.isFinite(r.loadLengthScale!)).toBe(true);
    const g2 = r.constraints.find((c) => c.kind === "gap")!;
    expect(g2.scaledSlope).toBeLessThan(0);
    expect(r.interval.upper!.kind).toBe("finite");
    expect(Number.isFinite(r.interval.upper!.value!)).toBe(true);
  });

  it("small physical coefficients are preserved (no family-wide truncation)", () => {
    const r = computeRegime(inp({ numSupports: 2, activeSet: [1], hv: 1e-200 }));
    if (r.status !== "ok") throw new Error(JSON.stringify(r));
    expect(r.constraints.every((c) => c.constant !== 0)).toBe(true);
    expect(r.constraints.some((c) => c.roundingZero.constant)).toBe(false);
  });

  it("theoretical zeros stay zero (hv = 0) and symmetric regime is consistent", () => {
    const r = computeRegime(inp({ numSupports: 2, activeSet: [1, 2], hv: 0 }));
    if (r.status !== "ok") throw new Error(JSON.stringify(r));
    expect(r.constraints.every((c) => c.constant === 0 && c.scaledSlope > 0)).toBe(true);
    expect(r.interval.upper!.kind).toBe("unbounded");
    expect(r.ambiguous).toBe(false);
  });

  it("non-representable roots are explicit failures", () => {
    const c = { kind: "gap" as const, support: 1, constant: 1e300, s: -1e-300 };
    expect(() => intersectAffine([c], 1e200)).toThrow(RangeError);
    expect(intersectRegime([{ kind: "gap", support: 1, constant: 1e300, slope: -1e-300 }]).upper!.value).toBeCloseTo(1e150, -140);
  });
});
