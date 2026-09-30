// créé par Giovanni Malagnino, 2026-09-25 00:54 CEST (Europe/Rome, UTC+2)
import { describe, expect, it } from "vitest";
import { computeRegime, evaluateRegime, intersectRegime } from "../regime";
import { RegimeInput } from "../regime-types";
import { REF, rel, solveOk } from "./helpers";

const base = (o: Partial<RegimeInput>): RegimeInput => {
  const { L: _L, ...r } = REF;
  return { ...r, activeSet: [], ...o };
};
const ok = (o: Partial<RegimeInput>) => {
  const r = computeRegime(base(o));
  if (r.status !== "ok") throw new Error(JSON.stringify(r));
  return r;
};

describe("contact regime for an imposed active set", () => {
  it("zero supports: valid for every L > 0", () => {
    const r = ok({ numSupports: 0 });
    expect(r.interval.status).toBe("interval");
    expect(r.interval.lower!.kind).toBe("zero-excluded");
    expect(r.interval.upper!.kind).toBe("unbounded");
  });

  it("central support, q > 0: active admissible, inactive incompatible", () => {
    const act = ok({ numSupports: 1, activeSet: [1] });
    expect(act.interval.upper!.kind).toBe("unbounded");
    expect(act.interval.lower!.kind).toBe("zero-excluded");
    const R = evaluateRegime(base({ numSupports: 1 }), act.constraints, 30000)[0].value;
    expect(rel(R, (REF.q * 30000) / 2)).toBeLessThan(1e-10);
    expect(ok({ numSupports: 1, activeSet: [] }).interval.status).toBe("empty");
  });

  it("q = 0 and hv = hl = 0: degenerate, identically zero constraints", () => {
    for (const activeSet of [[], [1], [1, 2]]) {
      const r = ok({ numSupports: 2, q: 0, hv: 0, activeSet });
      expect(r.constraints.every((c) => c.identicallyZero)).toBe(true);
      expect(r.interval.status).toBe("interval");
    }
  });

  it("two supports, q = 0, hv > 0: R1 = 81/4 EI hv / L^3, g2 = hv/8", () => {
    const r = ok({ numSupports: 2, q: 0, activeSet: [1] });
    const L = 30000, EI = REF.E * REF.I;
    const v = evaluateRegime(base({ numSupports: 2 }), r.constraints, L);
    expect(rel(v[0].value, (81 / 4) * EI * REF.hv / L ** 3)).toBeLessThan(1e-9);
    expect(rel(v[1].value, REF.hv / 8)).toBeLessThan(1e-9);
  });

  it("finite transition: gap 2 closes where regime {1,2} starts (sign change)", () => {
    const one = ok({ numSupports: 2, activeSet: [1] });
    const two = ok({ numSupports: 2, activeSet: [1, 2] });
    const Lt = one.interval.upper!.value!;
    expect(one.interval.upper!.events).toEqual([{ kind: "gap-zero", support: 2 }]);
    expect(two.interval.lower!.events).toEqual([{ kind: "reaction-zero", support: 2 }]);
    expect(rel(two.interval.lower!.value!, Lt)).toBeLessThan(1e-9);
    const g = (L: number) => evaluateRegime(base({ numSupports: 2 }), one.constraints, L)[1].value;
    expect(g(Lt * 0.99)).toBeGreaterThan(0);
    expect(g(Lt * 1.01)).toBeLessThan(0);
  });

  it("matches solveBiaxialFixedLength at interior admissible lengths", () => {
    for (const [n, act] of [[2, [1]], [2, [1, 2]], [3, [1, 2, 3]]] as const) {
      const r = ok({ numSupports: n, activeSet: [...act] });
      const lo = r.interval.lower!.value ?? 0, hi = r.interval.upper!.value;
      for (const L of hi ? [lo + 0.25 * (hi - lo), lo + 0.75 * (hi - lo)] : [lo * 1.3 || 20000, (lo || 20000) * 2]) {
        const s = solveOk({ L, numSupports: n });
        for (const v of evaluateRegime(base({ numSupports: n }), r.constraints, L)) {
          const sup = s.supports[v.support - 1];
          const ref = v.kind === "gap" ? sup.gap : sup.reaction;
          expect(Math.abs(v.value - ref)).toBeLessThan(1e-7 * Math.max(Math.abs(ref), REF.q * L));
        }
      }
    }
  });

  it("hl changes neither coefficients nor interval", () => {
    const a = ok({ numSupports: 3, activeSet: [2] });
    const b = ok({ numSupports: 3, activeSet: [2], hl: 1234 });
    expect(b.constraints).toEqual(a.constraints);
    expect(b.interval).toEqual(a.interval);
  });

  it("simultaneous events are all reported", () => {
    const iv = intersectRegime([
      { kind: "gap", support: 1, constant: 4, slope: -1, identicallyZero: false },
      { kind: "reaction", support: 2, constant: 8, slope: -2, identicallyZero: false },
      { kind: "gap", support: 3, constant: -1, slope: 1, identicallyZero: false },
    ]);
    expect(iv.upper!.events.length).toBe(2);
    expect(iv.lower!.events).toEqual([{ kind: "gap-zero", support: 3 }]);
    const pt = intersectRegime([
      { kind: "gap", support: 1, constant: 16, slope: -1, identicallyZero: false },
      { kind: "gap", support: 2, constant: -16, slope: 1, identicallyZero: false },
    ]);
    expect(pt.status).toBe("single-point");
    expect(pt.lower!.value).toBeCloseTo(2, 12);
  });

  it("rejects invalid inputs and restrained mode", () => {
    expect(computeRegime(base({ numSupports: 2, activeSet: [1, 1] })).status).toBe("invalid-input");
    expect(computeRegime(base({ numSupports: 2, activeSet: [3] })).status).toBe("invalid-input");
    expect(computeRegime(base({ numSupports: 2, activeSet: [0.5] })).status).toBe("invalid-input");
    expect(computeRegime(base({ numSupports: 21 })).status).toBe("invalid-input");
    expect(computeRegime(base({ numSupports: 1, axialMode: "restrained" })).status).toBe("not-implemented");
  });
});
