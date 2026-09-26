// créé par Giovanni Malagnino, 2026-09-26 04:30 CEST (Europe/Rome, UTC+2)
// V2-7: Find L with ground contact (real solver and simulated evaluators).
import { describe, expect, it } from "vitest";
import { GroundLengthInput, GroundLengthResult, searchLengthGeneral, searchLengthGround, solveGroundFixedLength } from "..";
import { REF, rel } from "./helpers";

const { L: _L, numSupports: _n, ...BASE } = REF;
const IN: GroundLengthInput = { ...BASE, hv: 1000, groundZ: 0, Lmin: 5000, Lmax: 60000 };
const G = (over: Partial<GroundLengthInput> = {}, n = 0, lim = {}) => searchLengthGround({ ...IN, ...over }, n, lim);
type Pub = Extract<GroundLengthResult, { ranges: unknown }>;
const pub = (r: GroundLengthResult): Pub => { if (!("ranges" in r)) throw new Error(JSON.stringify(r)); return r; };
const EI = IN.E * IN.I;

describe("Find L with ground: real solver", () => {
  it("partial contact, 0 support: stress matches the closed form wherever it applies; upper edge reached", { timeout: 60000 }, () => {
    const r = pub(G());
    const ell = ((72 * EI * IN.hv) / IN.q) ** 0.25, sig = (IN.q * ell ** 2 * IN.c) / (6 * IN.I);
    const checked = r.samples.filter((s) => s.L > 1.05 * ell && s.maxStress !== null);
    expect(checked.length).toBeGreaterThan(3);
    for (const s of checked) expect(rel(s.maxStress!, sig)).toBeLessThan(2e-3);
    expect(r.boundaryHits).toContain("upper");
    expect(r.ranges[r.ranges.length - 1].upper.domainEdge).toBe(true);
    expect(r.coverage.certified).toBe(false);
  });

  it("inactive ground: agrees with the no-ground ranges restricted to the domain", { timeout: 60000 }, () => {
    const g = pub(G({ groundZ: -1e7, hv: 2500 }));
    const ref = searchLengthGeneral({ ...BASE, hv: 2500 }, 0);
    if (ref.status !== "ok") throw new Error(ref.status);
    const up = ref.ranges[0].upper.value!;
    expect(g.ranges).toHaveLength(1);
    expect(g.ranges[0].upper.value).toBeLessThanOrEqual(up * (1 + 1e-6));
    expect(rel(g.ranges[0].upper.value, up)).toBeLessThan(5e-3);
  });

  it("flat pipe hv = hl = 0: whole domain admissible, edges are domain limits", { timeout: 60000 }, () => {
    const r = pub(G({ hv: 0 }));
    expect(r.ranges).toHaveLength(1);
    expect(r.boundaryHits).toEqual(["lower", "upper"]);
    expect(r.ranges[0].lower.bracket).toBeNull();
  });

  it("several supports: every published bound re-verified", { timeout: 60000 }, () => {
    const r = pub(G({ hv: 2500 }, 3));
    for (const g of r.ranges) for (const L of [g.lower.value, g.upper.value]) {
      const s = solveGroundFixedLength({ ...IN, hv: 2500, L, numSupports: 3 });
      expect(s.status === "ok" && s.maxStress <= IN.sigmaAllow).toBe(true);
    }
  });

  it("q = 0 and negative hv above a lower ground", { timeout: 60000 }, () => {
    expect(pub(G({ q: 0, hv: 0 })).boundaryHits).toEqual(["lower", "upper"]);
    expect(pub(G({ groundZ: -500, hv: -300 }, 0, { maxEvaluations: 40 })).status).not.toBe("geometry-incompatible");
  });

  it("geometric incompatibility and invalid domain", () => {
    expect(G({ groundZ: 10 }).status).toBe("geometry-incompatible");
    expect(G({ hv: -100 }).status).toBe("geometry-incompatible");
    for (const d of [{ Lmin: 0 }, { Lmin: 7000, Lmax: 7000 }, { Lmax: Infinity }, { Lmin: NaN }]) expect(G(d).status).toBe("invalid-input");
  });
});

// Simulated evaluator: stress profile f(L) in MPa, allowable = IN.sigmaAllow.
const sim = (f: (L: number) => number | "u" | "x") => ({ evaluate: (L: number) => {
  const v = f(L);
  if (v === "u") return { cls: "uncertain" as const, maxStress: IN.sigmaAllow, status: "ok" };
  if (v === "x") return { cls: "failed" as const, maxStress: null, status: "numerical-failure" };
  return { cls: v <= IN.sigmaAllow ? "admissible" as const : "not-admissible" as const, maxStress: v, status: "ok" };
} });
const lo = IN.sigmaAllow - 50, hi = IN.sigmaAllow + 50;

describe("Find L with ground: simulated evaluator", () => {
  it("narrow range, pocket and several transitions: never certified, no merge across a pocket", () => {
    const r = pub(G({}, 0, sim((L) => (L > 20000 && L < 21000) || L > 40000 && !(L > 50000 && L < 51000) ? lo : hi)));
    expect(r.ranges.length).toBe(3);
    expect(r.zones.filter((z) => z.reason === "transition-bracket").length).toBeGreaterThanOrEqual(4);
    expect(r.coverage.certified).toBe(false);
  });

  it("uncertain and failed evaluations are unresolved, never not-admissible", () => {
    const r = pub(G({}, 0, sim((L) => (L > 30000 && L < 32000 ? "u" : L > 45000 && L < 46000 ? "x" : lo))));
    expect(r.zones.some((z) => z.reason === "uncertain-verdict")).toBe(true);
    expect(r.zones.some((z) => z.reason === "solver-failure")).toBe(true);
    expect(r.ranges.length).toBeGreaterThanOrEqual(3);
    expect(r.coverage.uncertainEvaluations).toBeGreaterThan(0);
  });

  it("budget exhausted: incomplete with partial results, not 'none found'", () => {
    const r = G({}, 0, { ...sim(() => hi), maxEvaluations: 10 });
    expect(r.status).toBe("incomplete");
    expect(pub(r).zones.some((z) => z.reason === "budget")).toBe(true);
    expect(pub(G({}, 0, sim(() => hi))).status).toBe("none-found");
  });
});
