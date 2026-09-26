import { describe, it, expect } from "vitest";
import { normalizeAppInputs, unknownCoatingOf } from "../inputs";
import { groundContactRows } from "../ground-labels";
import type { GroundReport } from "@/lib/mechanics-v2";

describe("V2-9-R1 presentation", () => {
  it("flags an unknown preset coating without crashing, keeps valid ones", () => {
    expect(unknownCoatingOf({ coatingType: "bogus" })).toBe("bogus");
    expect(normalizeAppInputs({ coatingType: "bogus" }).coatingType).toBe("none");
    expect(unknownCoatingOf({ coatingType: "yellowJacket" })).toBeNull();
    expect(normalizeAppInputs({ coatingType: "yellowJacket" }).coatingType).toBe("yellowJacket");
    expect(unknownCoatingOf({})).toBeNull();
  });
  it("lists a clamped end at ground level separately from contact zones", () => {
    const g = { level: 0, tolPenetration: 1e-3, contactZones: [{ xStart: 0, xEnd: 0 }], contactPoints: [], contactNodes: 0 } as unknown as GroundReport;
    const rows = groundContactRows(g, 2500, 30000, (x) => `${x}`);
    expect(rows[0][1]).toBe("No interior ground-contact nodes");
    expect(rows[1][1]).toBe("No interior ground-contact nodes");
    expect(rows[2][1]).toBe("left end (x = 0)");
  });
});
