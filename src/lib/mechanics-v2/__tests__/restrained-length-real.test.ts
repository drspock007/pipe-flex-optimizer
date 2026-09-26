// créé par Giovanni Malagnino, 2026-09-26 18:10 CEST (Europe/Rome, UTC+2)
// V2-11 Find L restrained with the real solver: independent tensioned beam over
// several L, low ground vs no ground, partial contact, supports, hv = hl = 0.
import { describe, expect, it } from "vitest";
import { RestrainedLengthInput, searchLengthRestrained, solveBiaxialFixedLength, solveGroundFixedLength } from "..";
import { REF, rel } from "./helpers";

const { L: _L, numSupports: _n, ...B0 } = REF;
const B: RestrainedLengthInput = { ...B0, axialMode: "restrained", Lmin: 7500, Lmax: 120000 };

/** Independent clamped beam under tension (q = 0), N from compatibility (bisection). */
function tensioned(hv: number, L: number) {
  const { E, A, I, c } = REF;
  const field = (N: number) => {
    const k = Math.sqrt(N / (E * I)), ch = Math.cosh(k * L), sh = Math.sinh(k * L);
    const a11 = ch - 1, a12 = sh - k * L, a21 = k * sh, a22 = k * (ch - 1), det = a11 * a22 - a12 * a21;
    const C = (hv * a22) / det, D = (-hv * a21) / det;
    const zp = (x: number) => -D * k + C * k * Math.sinh(k * x) + D * k * Math.cosh(k * x);
    const zpp = (x: number) => C * k * k * Math.cosh(k * x) + D * k * k * Math.sinh(k * x);
    let s = 0; const m = 4000, h = L / m;
    for (let i = 0; i <= m; i++) s += (i === 0 || i === m ? 1 : i % 2 ? 4 : 2) * zp(i * h) ** 2;
    return { J: (s * h) / 3, kmax: Math.max(Math.abs(zpp(0)), Math.abs(zpp(L))) };
  };
  let lo = 1e-6, hi = 1e7;
  for (let i = 0; i < 200; i++) { const N = Math.sqrt(lo * hi); if ((E * A) / (2 * L) * field(N).J > N) lo = N; else hi = N; }
  const N = Math.sqrt(lo * hi);
  return { N, combined: N / A + E * c * field(N).kmax };
}

describe("restrained Find L, real solver", { timeout: 60000 }, () => {
  it("no support, no ground, q = 0: solver matches the independent tensioned beam at several L", () => {
    for (const L of [20000, 45000, 90000]) {
      const t = tensioned(1000, L), s = solveBiaxialFixedLength({ ...REF, q: 0, hv: 1000, L, axialMode: "restrained" });
      if (s.status !== "ok") throw new Error(s.status);
      expect(rel(s.axial!.N, t.N)).toBeLessThan(3e-3);
      expect(rel(s.axial!.combinedMax, t.combined)).toBeLessThan(3e-3);
    }
  });
  it("published bounds and the final check are re-verified admissible (combined criterion)", () => {
    const r = searchLengthRestrained({ ...B, hv: 1000, hl: 500, groundZ: 0 }, 2);
    if (r.status !== "found") throw new Error(r.status);
    for (const L of [r.ranges[0].lower.value, r.meta.finalCheck.L!]) {
      const s = solveGroundFixedLength({ ...B0, hv: 1000, hl: 500, L, numSupports: 2, groundZ: 0, axialMode: "restrained" });
      if (s.status !== "ok") throw new Error(s.status);
      expect(s.axial!.combinedCriterionMet).toBe(true);
      expect(s.axial!.criterionUncertain).toBe(false);
    }
  });
  it("a low ground gives the same result as no ground", () => {
    const a = searchLengthRestrained({ ...B, Lmax: 60000, hv: 0 }, 0), b = searchLengthRestrained({ ...B, Lmax: 60000, hv: 0, groundZ: -1e5 }, 0);
    if (!("ranges" in a) || !("ranges" in b)) throw new Error();
    expect(b.ranges.map((g) => [g.lower.value, g.upper.value])).toEqual(a.ranges.map((g) => [g.lower.value, g.upper.value]));
  });
  it("bending met but combined exceeded is never admissible", () => {
    const s = solveBiaxialFixedLength({ ...REF, hv: 2500, L: 90000, numSupports: 3, axialMode: "restrained" });
    if (s.status !== "ok") throw new Error(s.status);
    expect(s.axial!.bendingMax).toBeLessThan(REF.sigmaAllow);
    expect(s.axial!.combinedCriterionMet).toBe(false);
    const r = searchLengthRestrained({ ...B, Lmin: 89500, Lmax: 90500 }, 3);
    if (!("ranges" in r)) throw new Error(r.status);
    expect(r.ranges).toHaveLength(0);
  });
  it("several supports: range reaching Lmax is flagged as a domain edge", () => {
    const r = searchLengthRestrained(B, 3);
    if (r.status !== "found") throw new Error(r.status);
    expect(r.boundaryHits).toContain("upper");
  });
  it("hv = hl = 0 without ground: no exclusion, admissible from Lmin", () => {
    const r = searchLengthRestrained({ ...B, hv: 0, Lmax: 30000 }, 0);
    if (r.status !== "found") throw new Error(r.status);
    expect(r.meta.excluded).toBeNull();
    expect(r.boundaryHits).toContain("lower");
  });
  it("hv = hl = 0, ground at 0, 20 supports: mesh failures stay unresolved, never non-admissible", () => {
    const r = searchLengthRestrained({ ...B, hv: 0, groundZ: 0, Lmax: 30000 }, 20, { maxEvaluations: 40 });
    if (!("zones" in r)) throw new Error(r.status);
    const failed = r.samples.filter((s) => s.cls === "failed");
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.every((s) => s.status === "incomplete")).toBe(true);
    expect(r.zones.some((z) => z.reason === "solver-failure" || z.reason === "budget")).toBe(true);
  });
});
