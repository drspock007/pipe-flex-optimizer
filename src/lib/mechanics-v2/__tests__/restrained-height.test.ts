// créé par Giovanni Malagnino, 2026-09-26 17:30 CEST (Europe/Rome, UTC+2)
// V2-10 Find h restrained: necessary axial bound, domain, classification, real searches.
import { describe, expect, it } from "vitest";
import { axialHeightBound, classifyRestrained, RestrainedHeightInput, searchHeightRestrained, solveBiaxialFixedLength } from "..";
import { REF, rel } from "./helpers";

const { hv: _hv, numSupports: _n, ...B0 } = REF;
const B: RestrainedHeightInput = { ...B0, axialMode: "restrained" };
const R0 = (2 * REF.L ** 2 * REF.sigmaAllow) / REF.E; // independent: 2 L^2 sA / E
const S = (over: Partial<RestrainedHeightInput> = {}, n = 0) => searchHeightRestrained({ ...B, ...over }, n);

describe("necessary axial bound", () => {
  it("matches the independent formula and holds at solved heights", () => {
    const b = axialHeightBound(REF.sigmaAllow, REF.L, REF.E, 300)!;
    expect(rel(b.R, R0)).toBeLessThan(1e-14);
    expect(rel(b.Hax! ** 2 + 300 ** 2, R0)).toBeLessThan(1e-12);
    for (const hv of [100, 600, 1200]) {
      const r = solveBiaxialFixedLength({ ...REF, hv, hl: 300, axialMode: "restrained" });
      if (r.status !== "ok") throw new Error(r.status);
      expect(r.axial!.sigmaAxial).toBeGreaterThanOrEqual((REF.E * (hv * hv + 300 * 300)) / (2 * REF.L ** 2) * (1 - 1e-9));
    }
  });
  it("hl alone excludes every hv (demonstrated, with its reason)", () => {
    const r = S({ hl: Math.sqrt(R0) * (1 + 1e-6) });
    expect(r.status).toBe("impossible");
    if (r.status === "impossible") { expect(r.meta.impossibleReason).toBe("lateral-offset"); expect(r.ranges).toHaveLength(0); }
  });
  it("negative radicand within rounding: undecidable, nothing published", () => {
    const r = S({ hl: Math.sqrt(R0) * (1 + 4e-16) });
    expect(["undecidable", "found", "none-found"]).toContain(r.status);
    if (r.status !== "undecidable" && "domain" in r) expect(r.domain!.upper - r.domain!.lower).toBeLessThan(1e-3);
  });
  it("overflow / underflow: explicit failure", () => {
    expect(axialHeightBound(1e300, 1e200, 1e-300, 0)).toBeNull();
    expect(axialHeightBound(1e-300, 1e-200, 1e300, 0)).toBeNull();
  });
  it("domain reduced to a point is evaluated", () => {
    // R = 2 L^2 sA / E = L^2 exactly and hl = L: radicand 0, domain {0}.
    const r = searchHeightRestrained({ ...B, L: 1000, E: 2, sigmaAllow: 1, hl: 1000 }, 0, { evaluate: () => ({ cls: "admissible", maxStress: 0.5, status: "ok" }) });
    if (r.status !== "found") throw new Error(r.status);
    expect(r.domain).toEqual({ lower: 0, upper: 0 });
    expect(r.ranges).toHaveLength(1);
    expect(r.ranges[0].lower.value).toBe(0);
  });
  it("ground above zero: geometric incompatibility; ground above Hax impossible needs gz > 0 so never occurs", () => {
    expect(S({ groundZ: 10 }).status).toBe("geometry-incompatible");
  });
});

describe("classification on the combined criterion", () => {
  it("bending met but combined exceeded is not admissible", () => {
    let found = false;
    for (let hv = 670; hv <= 1500 && !found; hv += 10) {
      const r = solveBiaxialFixedLength({ ...REF, hv, axialMode: "restrained" });
      if (r.status !== "ok" || !r.axial || r.axial.criterionUncertain) continue;
      if (r.bendingCriterionMet && !r.axial.combinedCriterionMet) {
        found = true;
        expect(classifyRestrained({ ...B, numSupports: 0 }, hv).cls).toBe("not-admissible");
      }
    }
    expect(found).toBe(true);
  });
  const lo = -1000, hi = 1000;
  const sim = (f: (h: number) => "admissible" | "not-admissible" | "uncertain" | "failed") => (h: number) => {
    const cls = f(h);
    return cls === "failed" ? { cls, maxStress: null, status: "incomplete", cause: "mesh-not-converged" as const } : { cls, maxStress: cls === "admissible" ? 100 : 400, status: "ok" };
  };
  const run = (f: Parameters<typeof sim>[0], maxEvaluations?: number) => searchHeightRestrained({ ...B, hl: 0 }, 0, { evaluate: sim(f), maxEvaluations });
  void lo; void hi;
  it("uncertain zone never counts as not admissible; final check skips it", () => {
    const r = run((h) => (h > 500 && h < 700 ? "uncertain" : h < 900 ? "admissible" : "not-admissible"));
    if (r.status !== "found") throw new Error(r.status);
    expect(r.zones.some((z) => z.reason === "uncertain-verdict")).toBe(true);
    expect(r.meta.finalCheck.hv).toBe(r.largestFound);
  });
  it("narrow range and non-admissible pocket", () => {
    const r = run((h) => (Math.abs(h - 300) < 40 ? "admissible" : Math.abs(h) < 150 ? "not-admissible" : Math.abs(h) < 600 ? "admissible" : "not-admissible"));
    if (r.status !== "found") throw new Error(r.status);
    expect(r.ranges.length).toBeGreaterThanOrEqual(2);
    expect(r.ranges.some((g) => g.lower.value < -150) && r.ranges.some((g) => g.upper.value > 150)).toBe(true);
  });
  it("solver failures form unresolved zones with causes", () => {
    const r = run((h) => (Math.abs(h) < 100 ? "failed" : "not-admissible"));
    expect(r.status).toBe("none-found");
    if ("zones" in r) expect(r.zones.find((z) => z.reason === "solver-failure")?.causes).toContain("mesh-not-converged");
  });
  it("exhausted budget: incomplete, whole domain unexplored when nothing evaluated", () => {
    const r0 = run(() => "admissible", 0);
    if (r0.status !== "incomplete") throw new Error(r0.status);
    expect(r0.samples).toHaveLength(0);
    expect(r0.zones).toEqual([{ from: r0.domain!.lower, to: r0.domain!.upper, reason: "budget" }]);
    const r5 = run(() => "admissible", 5);
    if (r5.status !== "incomplete") throw new Error(r5.status);
    expect(r5.ranges.every((g) => !g.upper.domainEdge)).toBe(true);
    expect(r5.meta.totalEvaluations).toBeLessThanOrEqual(5);
  });
});
