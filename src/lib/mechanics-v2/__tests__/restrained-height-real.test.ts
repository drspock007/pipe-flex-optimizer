// créé par Giovanni Malagnino, 2026-09-26 17:30 CEST (Europe/Rome, UTC+2)
// V2-10 Find h restrained with the real solver: symmetry, independent tensioned
// beam, ground domains, published points re-verified (never a coverage proof).
import { describe, expect, it } from "vitest";
import { classifyRestrained, RestrainedHeightInput, searchHeightRestrained, solveBiaxialFixedLength } from "..";
import { REF, rel } from "./helpers";

const { hv: _hv, numSupports: _n, ...B0 } = REF;
const B: RestrainedHeightInput = { ...B0, axialMode: "restrained" };
const S = (over: Partial<RestrainedHeightInput> = {}, n = 0) => searchHeightRestrained({ ...B, ...over }, n);

/** Independent clamped beam under tension N with end offset hv, q = 0 (4x4 system),
 *  N from compatibility N = EA/(2L) int z'^2 (bisection). Returns N and combined max. */
function tensioned(hv: number) {
  const { L, E, A, I, c } = REF;
  const field = (N: number) => {
    const k = Math.sqrt(N / (E * I)), ch = Math.cosh(k * L), sh = Math.sinh(k * L);
    // unknowns C, D (a = -C, b = -D k): z(L) = -C - D k L + C ch + D sh = hv ; z'(L) = -D k + C k sh + D k ch = 0
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

describe("restrained Find h, no load, no support, no ground", { timeout: 60000 }, () => {
  const r = S({ q: 0 });
  it("signed symmetric domain and ranges (hv <-> -hv)", () => {
    if (r.status !== "found") throw new Error(r.status);
    expect(r.domain!.lower).toBe(-r.domain!.upper);
    expect(r.meta.domainOrigin).toEqual({ lower: "axial-bound", upper: "axial-bound" });
    expect(rel(-r.ranges[0].lower.value, r.ranges[r.ranges.length - 1].upper.value)).toBeLessThan(1e-9);
  });
  it("matches the independent tensioned beam with axial compatibility", () => {
    const t = tensioned(200);
    const s = solveBiaxialFixedLength({ ...REF, q: 0, hv: 200, axialMode: "restrained" });
    if (s.status !== "ok") throw new Error(s.status);
    expect(rel(s.axial!.N, t.N)).toBeLessThan(2e-3);
    expect(rel(s.axial!.combinedMax, t.combined)).toBeLessThan(3e-3);
  });
});

describe("restrained Find h with ground and supports", { timeout: 60000 }, () => {
  it("ground at zero: no negative height published", () => {
    const r = S({ groundZ: 0 }, 0);
    if (r.status !== "found") throw new Error(r.status);
    expect(r.domain!.lower).toBe(0);
    expect(r.meta.domainOrigin?.lower).toBe("ground-level");
    expect(r.samples.every((x) => x.hv >= 0)).toBe(true);
    expect(r.ranges.every((g) => g.lower.value >= 0)).toBe(true);
  });
  it("ground below zero: negative heights possible", () => {
    const r = S({ groundZ: -200 }, 0);
    if (r.status !== "found") throw new Error(r.status);
    expect(r.ranges[0].lower.value).toBeLessThan(0);
    expect(r.ranges[0].lower.value).toBeGreaterThanOrEqual(-200);
  });
  it("3 supports, ground: published bounds and intermediate samples re-solved", () => {
    const r = S({ groundZ: 0, hl: 300 }, 3);
    if (r.status !== "found") throw new Error(r.status);
    const inp = { ...B, hl: 300, groundZ: 0, numSupports: 3 };
    for (const g of r.ranges) for (const h of [g.lower.value, g.upper.value]) expect(classifyRestrained(inp, h).cls).toBe("admissible");
    for (const x of r.samples.filter((_, i) => i % 7 === 3)) expect(classifyRestrained(inp, x.hv).cls).toBe(x.cls);
    expect(r.meta.finalCheck.hv).toBe(r.largestFound);
    expect(r.coverage.certified).toBe(false);
  });
});
