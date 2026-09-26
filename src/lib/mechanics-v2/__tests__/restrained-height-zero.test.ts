// créé par Giovanni Malagnino, 2026-09-26 17:45 CEST (Europe/Rome, UTC+2)
// V2-10 closure: hv = 0, 20 supports, ground at 0, restrained (flat pipe on the ground).
import { describe, expect, it } from "vitest";
import { searchHeightRestrained, solveRestrained } from "..";
import { REF } from "./helpers";

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
  it("V2-11-R1: hv = 0 is solved analytically, so the search range starts at 0 (no unresolved zone at 0)", () => {
    const r = searchHeightRestrained(IN, 20);
    if (!("ranges" in r)) throw new Error(r.status);
    expect(r.samples.find((x) => x.hv === 0)!.cls).toBe("admissible");
    expect(r.ranges[0].lower.value).toBe(0);
    expect(r.zones.some((z) => z.from === 0)).toBe(false);
  });
});
