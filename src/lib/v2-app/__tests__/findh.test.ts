// créé par Giovanni Malagnino, 2026-09-25 17:40 CEST (Europe/Rome, UTC+2)
// V2-4 Find h wiring: request keys, worker protocol, selection, export.
import { describe, expect, it } from "vitest";
import { DEFAULT_INPUTS, normalizeAppInputs } from "../inputs";
import { derive, searchKey, solveKeyOf, toFixedInput, toHeightInput } from "../bridge";
import { runEngine } from "../protocol";
import { heightRanges, initialHeight, selectedHeight } from "../height-selection";
import { describeSearch } from "../status-text";

const FH = { ...DEFAULT_INPUTS, mode: "findH" as const, numSupports: 2 };

describe("Find h request keys", () => {
  it("changing L relaunches the search", () => {
    expect(searchKey({ ...FH, L: 31 })).not.toBe(searchKey(FH));
  });
  it("the entered h neither drives nor relaunches the search", () => {
    expect(searchKey({ ...FH, h: 1 })).toBe(searchKey(FH));
    expect(toHeightInput({ ...FH, h: 1 })).toEqual(toHeightInput(FH));
  });
  it("changing only the represented hv relaunches only the solve", () => {
    const t = { L_mm: 30000, numSupports: 2 };
    expect(solveKeyOf(FH, { ...t, hv_mm: 10 })).not.toBe(solveKeyOf(FH, { ...t, hv_mm: 20 }));
    expect(solveKeyOf(FH, { ...t, hv_mm: 10 })!.startsWith(searchKey(FH))).toBe(true);
  });
  it("length searches keep ignoring L and following h", () => {
    const S = { ...DEFAULT_INPUTS, mode: "searchLength" as const };
    expect(searchKey({ ...S, L: 31 })).toBe(searchKey(S));
    expect(searchKey({ ...S, h: 1 })).not.toBe(searchKey(S));
  });
  it("L enters the engine in mm", () => {
    expect(toHeightInput(FH).L).toBe(30000);
  });
});

describe("Find h through the worker protocol", () => {
  const o = runEngine({ kind: "findH", input: toHeightInput(FH), numSupports: 2 });
  it("returns ranges, an initial upper-bound choice and a coherent solve", () => {
    if (o.kind !== "findH" || o.result.status !== "ok") throw new Error(JSON.stringify(o));
    expect(describeSearch(o).tone).toBe("ok");
    const rs = heightRanges(o);
    const sel = initialHeight(rs)!;
    const hv = selectedHeight(rs, sel)!;
    expect(hv).toBe(rs[rs.length - 1].upper.value);
    for (const h of [hv, 0, rs[0].lower.value]) {
      const s = runEngine({ kind: "solve", input: toFixedInput(FH, 30000, 2, derive(FH), h) });
      if (s.kind !== "solve" || s.result.status !== "ok") throw new Error();
      expect(s.result.bendingCriterionMet).toBe(true);
    }
    expect(selectedHeight(rs, { ...sel, optionId: "custom", customH: 0 })).toBe(0);
  });
  it("legacy findH presets map to the V2 Find h mode", () => {
    expect(normalizeAppInputs({ calcMode: "findH" }).mode).toBe("findH");
  });
});

import { normalizeAppInputs as norm5 } from "../inputs";
import { groundBlocksSearch } from "../bridge";
describe("ground contact wiring (V2-5)", () => {
  it("legacy presets load with ground disabled; groundZ passed only when enabled", () => {
    const legacy = norm5({ calcMode: "standard", targetSupports: 0 });
    expect(legacy.groundEnabled).toBe(false);
    expect(legacy.numSupports).toBe(0);
    expect("groundZ" in toFixedInput(legacy, 30000, 0)).toBe(false);
    const g = { ...legacy, groundEnabled: true, groundContactZ: -50 };
    expect(toFixedInput(g, 30000, 0).groundZ).toBe(-50);
    expect(groundBlocksSearch({ ...g, mode: "findH" })).toBe(true);
    expect(groundBlocksSearch(g)).toBe(false);
  });
});
