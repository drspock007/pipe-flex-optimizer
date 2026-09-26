// créé par Giovanni Malagnino, 2026-09-26 17:45 CEST (Europe/Rome, UTC+2)
// V2-10 closure: hv = 0, 20 supports, ground at 0, restrained (flat pipe on the ground).
import { describe, expect, it } from "vitest";
import { searchHeightRestrained, solveRestrained } from "..";
import { REF } from "./helpers";
import { groundHeightRows } from "@/lib/v2-app/ground-height-text";

const { hv: _h, numSupports: _n, ...BASE } = REF;
const IN = { ...BASE, hl: 0, axialMode: "restrained" as const, groundZ: 0 };

describe("restrained hv = 0 on the ground, 20 supports", () => {
  it("direct solve: discrete stress decays as h^2 towards 0, but the mesh cap stops before two passes", () => {
    const r = solveRestrained({ ...IN, hv: 0, numSupports: 20 });
    if (r.status !== "incomplete") throw new Error(r.status);
    expect(r.cause).toBe("mesh-not-converged");
    const s = r.refinement!.map((l) => l.maxStress);
    for (let k = 1; k < s.length; k++) expect(s[k - 1] / s[k]).toBeCloseTo(4, 2); // O(h^2) nodal-contact artefact
    const g = r.refinement!.map((l) => l.groundReaction!);
    for (let k = 1; k < g.length; k++) expect(g[k]).toBeGreaterThan(g[k - 1]); // load migrates to the ground
  });
  it("search keeps an explicit unresolved zone containing 0 and labels 1.53 mm as first admissible sample", () => {
    const r = searchHeightRestrained(IN, 20);
    if (!("ranges" in r)) throw new Error(r.status);
    const z = r.zones.find((x) => x.from === 0)!;
    expect(z.reason).toBe("solver-failure");
    expect(z.causes).toContain("mesh-not-converged");
    expect(r.samples.find((x) => x.hv === 0)!.cls).toBe("failed");
    expect(r.ranges[0].lower.value).toBe(z.to);
    const rows = groundHeightRows(r, (mm) => `${mm} mm`);
    expect(rows.some(([k, v]) => k === "Range 1 lower bound" && v.includes("first admissible sample found"))).toBe(true);
  });
});
