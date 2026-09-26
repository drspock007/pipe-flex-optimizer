// créé par Giovanni Malagnino, 2026-09-26 18:10 CEST (Europe/Rome, UTC+2)
// V2-11 Find L restrained: necessary bound, domains, statuses, simulated evaluator.
import { describe, expect, it } from "vitest";
import { axialLengthBound, RestrainedLengthInput, searchLengthRestrained } from "..";
import { REF, rel } from "./helpers";

const { L: _L, numSupports: _n, ...B0 } = REF;
const B: RestrainedLengthInput = { ...B0, axialMode: "restrained", Lmin: 7500, Lmax: 120000 };
type Ev = (L: number) => { cls: "admissible" | "not-admissible" | "uncertain" | "failed"; maxStress: number | null; status: string };
const S = (over: Partial<RestrainedLengthInput> = {}, evaluate?: Ev, extra: object = {}) => searchLengthRestrained({ ...B, ...over }, 0, { evaluate, ...extra });
const adm = (ok: (L: number) => boolean): Ev => (L) => ({ cls: ok(L) ? "admissible" : "not-admissible", maxStress: ok(L) ? 100 + L / 1e4 : 400, status: "ok" });
const Lax0 = Math.hypot(REF.hv, 0) * Math.sqrt(REF.E / (2 * REF.sigmaAllow));

describe("necessary axial length bound", () => {
  it("matches the closed form and is stable for huge offsets", () => {
    expect(rel(axialLengthBound(REF.hv, 0, REF.E, REF.sigmaAllow)!.Lax, Lax0)).toBeLessThan(1e-14);
    expect(rel(axialLengthBound(3e200, 4e200, 1, 0.5)!.Lax, 5e200)).toBeLessThan(1e-14); // hypot avoids overflow in squares
    expect(axialLengthBound(1e308, 1e308, 1e308, 1e-300)).toBeNull();
    expect(axialLengthBound(0, 0, REF.E, REF.sigmaAllow)!.Lax).toBe(0);
  });
  it("overflow gives an explicit numerical failure", () => {
    expect(S({ hv: 1e308, hl: 1e308, E: 1e308, sigmaAllow: 1e-300 }).status).toBe("numerical-failure");
  });
  it("reduced domain after exclusion: requested, excluded and sampled shown separately", () => {
    const r = S({}, adm(() => true));
    if (!("meta" in r) || !("ranges" in r)) throw new Error(r.status);
    expect(r.meta.excluded).toEqual({ lower: 7500, upper: Lax0 });
    expect(r.meta.sampled).toEqual({ lower: Lax0, upper: 120000 });
    expect(r.samples.every((s) => s.L >= Lax0)).toBe(true);
    expect(r.ranges[0].lower.domainEdge).toBe(false); // raised by the bound, not the requested edge
    expect(r.ranges[0].upper.domainEdge).toBe(true);
    expect(r.boundaryHits).toEqual(["upper"]);
  });
  it("whole domain excluded: impossible without any sample; equality within rounding: undecidable", () => {
    const r = S({ Lmax: 0.5 * Lax0 });
    expect(r.status).toBe("impossible");
    if (!("samples" in r)) throw new Error();
    expect(r.samples).toHaveLength(0);
    expect(S({ Lmax: Lax0 * (1 + 1e-17) }).status).toBe("undecidable");
  });
});

describe("domain and geometry validation", () => {
  it("invalid domains", () => {
    expect(S({ Lmin: 0 }).status).toBe("invalid-input");
    expect(S({ Lmin: 50000, Lmax: 40000 }).status).toBe("invalid-input");
    expect(S({ Lmax: Infinity }).status).toBe("invalid-input");
  });
  it("incompatible ground rejected before any search", () => {
    expect(S({ groundZ: 10 }).status).toBe("geometry-incompatible");
    expect(S({ hv: -100, groundZ: -50 }).status).toBe("geometry-incompatible");
  });
});

describe("simulated evaluator (coverage never certified)", () => {
  const O = { hv: 0 }; // no exclusion
  it("narrow range, non-admissible pocket and several transitions", () => {
    // Continuous stress: admissible where the distance inside a window is positive.
    const W = [[20000, 20400], [50000, 70000], [71000, 90000]];
    const g = (L: number) => Math.max(...W.map(([a, b]) => Math.min(L - a, b - L) / 1000));
    const ok = (L: number) => g(L) > 0;
    const r = S(O, (L) => { const f = 287.2 - 50 * g(L); return { cls: f <= 287.2 && ok(L) ? "admissible" : "not-admissible", maxStress: f, status: "ok" }; });
    if (r.status !== "found") throw new Error(r.status);
    expect(r.ranges.length).toBeGreaterThanOrEqual(2);
    expect(r.coverage.certified).toBe(false);
    for (const g of r.ranges) { expect(ok(g.lower.value)).toBe(true); expect(ok(g.upper.value)).toBe(true); }
  });
  it("uncertain and failed samples never become non-admissible; budget gives incomplete", () => {
    const r = S(O, (L) => (L < 30000 ? { cls: "failed", maxStress: null, status: "incomplete" } : L < 40000 ? { cls: "uncertain", maxStress: 287, status: "ok" } : { cls: "admissible", maxStress: 100, status: "ok" }));
    if (!("zones" in r)) throw new Error(r.status);
    expect(r.zones.some((z) => z.reason === "solver-failure")).toBe(true);
    const bad = r.samples.filter((x) => x.cls === "failed" || x.cls === "uncertain");
    expect(bad.length).toBeGreaterThan(0);
    for (const x of bad) expect(r.ranges.some((g) => x.L >= g.lower.value && x.L <= g.upper.value)).toBe(false);
    const b = S(O, adm(() => true), { maxEvaluations: 5 });
    expect(b.status).toBe("incomplete");
  });
  it("admissible at the requested lower edge is flagged; final check picks the lowest stress", () => {
    const r = S(O, adm(() => true));
    if (r.status !== "found") throw new Error(r.status);
    expect(r.ranges[0].lower.domainEdge).toBe(true);
    expect(r.meta.finalCheck.L).toBe(7500);
  });
  it("final check falls back when the first candidate turns uncertain", () => {
    let seen = 0;
    const r = S(O, (L) => (L === 7500 && ++seen > 1 ? { cls: "uncertain", maxStress: 287, status: "ok" } : { cls: "admissible", maxStress: 100 + L / 1e4, status: "ok" }));
    if (r.status !== "found") throw new Error(r.status);
    expect(r.meta.finalCheck.attempts[0]).toMatchObject({ L: 7500, cls: "uncertain" });
    expect(r.meta.finalCheck.L).not.toBe(7500);
  });
  it("no admissible sample: none-found, never impossible", () => {
    expect(S(O, adm(() => false)).status).toBe("none-found");
  });
});
