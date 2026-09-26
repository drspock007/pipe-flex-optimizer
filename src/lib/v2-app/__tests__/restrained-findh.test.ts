// créé par Giovanni Malagnino, 2026-09-26 17:30 CEST (Europe/Rome, UTC+2)
// V2-10 wiring: restrained Find h request, keys, selection = re-verified hv, coherent solve.
import { describe, expect, it } from "vitest";
import { DEFAULT_INPUTS } from "../inputs";
import { derive, searchKey, toFixedInput, toRestrainedHeightInput, toSearchInput } from "../bridge";
import { runEngine } from "../protocol";
import { checkedHeight, heightOptions, heightRanges, initialHeight, selectedHeight } from "../height-selection";
import { describeSearch } from "../status-text";
import { restrainedHeightRows } from "../restrained-height-text";

const FH = { ...DEFAULT_INPUTS, mode: "findH" as const, axialMode: "restrained" as const, numSupports: 2, groundEnabled: true, groundContactZ: 0 };

describe("restrained Find h through the worker protocol", () => {
  const o = runEngine({ kind: "findHRestrained", input: toRestrainedHeightInput(FH), numSupports: 2 });
  it("initial choice is the re-verified hv and its full solve meets the combined criterion", () => {
    if (o.kind !== "findHRestrained" || !("meta" in o.result)) throw new Error(JSON.stringify(o));
    const rs = heightRanges(o), chk = checkedHeight(o)!;
    expect(chk).not.toBeNull();
    const hv = selectedHeight(rs, initialHeight(rs, chk))!;
    expect(hv).toBe(chk);
    const s = runEngine({ kind: "solve", input: toFixedInput(FH, FH.L * 1000, 2, derive(FH), hv) });
    if (s.kind !== "solve" || s.result.status !== "ok") throw new Error();
    expect(s.result.axial?.combinedCriterionMet).toBe(true);
    expect(s.result.axial?.criterionUncertain).toBe(false);
    // The midpoint is re-solved, never assumed admissible: it just gets a verdict.
    const mid = heightOptions(rs[rs.length - 1]).find((x) => x.id === "mid");
    if (mid) { const m = runEngine({ kind: "solve", input: toFixedInput(FH, FH.L * 1000, 2, derive(FH), mid.hv) }); expect(m.kind).toBe("solve"); }
    expect(describeSearch(o).title).toMatch(/axial restraint/);
    expect(restrainedHeightRows(o.result, (v) => `${v} mm`, (v) => `${v} MPa`).some(([k]) => k.startsWith("Hax"))).toBe(true);
  });
  it("hl, L and supports relaunch the search; the entered h does not", () => {
    expect(searchKey({ ...FH, h: 1 })).toBe(searchKey(FH));
    expect(searchKey({ ...FH, hl: 10 })).not.toBe(searchKey(FH));
    expect(searchKey({ ...FH, numSupports: 3 })).not.toBe(searchKey(FH));
    expect(searchKey({ ...FH, axialMode: "free" })).not.toBe(searchKey(FH));
  });
  it("without ground, no groundZ is passed", () => {
    expect("groundZ" in toRestrainedHeightInput({ ...FH, groundEnabled: false })).toBe(false);
  });
  it("Find L and Min. supports stay unavailable in restrained", () => {
    const i = toSearchInput({ ...FH, mode: "searchLength" });
    const a = runEngine({ kind: "searchLength", input: i, numSupports: 2 });
    const b = runEngine({ kind: "minSupports", input: i, maxSupports: 3 });
    expect(a.kind === "searchLength" && a.result.status).toBe("not-implemented");
    expect(b.kind === "minSupports" && b.result.status).toBe("not-implemented");
  });
});
