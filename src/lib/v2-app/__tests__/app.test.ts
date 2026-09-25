// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
import { describe, expect, it } from "vitest";
import { DEFAULT_INPUTS, normalizeAppInputs } from "../inputs";
import { derive, toFixedInput, toSearchInput, searchKey } from "../bridge";
import { channelReducer, initialChannel } from "../channel-state";
import { runEngine, SearchOutcome } from "../protocol";
import { initialChoice, lengthOptions, searchView } from "../selection";
import { describeSearch } from "../status-text";
import { fromDisplay, toDisplay } from "@/lib/unit-conversions";

const REF_APP = { ...DEFAULT_INPUTS, E: 210 }; // references use E = 210000 MPa

describe("V2 application bridge", () => {
  it("converts m -> mm and GPa -> MPa, keeps hv sign", () => {
    const f = toFixedInput({ ...REF_APP, h: -1200, hl: 300 }, 30000, 2);
    expect(f.L).toBe(30000);
    expect(f.E).toBe(210000);
    expect(f.hv).toBe(-1200);
    expect(f.hl).toBe(300);
    expect(Math.abs(f.q - 0.1577005743975421) / 0.1577).toBeLessThan(1e-6);
    expect(Math.abs(f.A - 2047.8333482348326)).toBeLessThan(1e-6);
  });

  it("reproduces the engine reference stress through the UI inputs", () => {
    const o = runEngine({ kind: "solve", input: toFixedInput(REF_APP, REF_APP.L * 1000, 0) });
    if (o.kind !== "solve" || o.result.status !== "ok") throw new Error();
    expect(Math.abs(o.result.maxStress - 424.5523905204) / 424.55).toBeLessThan(1e-5);
    expect(o.samples!.length).toBeGreaterThan(10);
  });

  it("SI / imperial display round trip leaves physical inputs unchanged", () => {
    for (const u of ["mm", "m", "MPa", "GPa", "N"] as const) {
      expect(fromDisplay(toDisplay(123.456, u, "Imperial"), u, "Imperial")).toBeCloseTo(123.456, 10);
    }
  });

  it("legacy preset: hl = 0, axial free, mode mapped", () => {
    const n = normalizeAppInputs({ Do: 168.3, h: 1800, calcMode: "findL", targetSupports: 3 }, { ...DEFAULT_INPUTS, hl: 999 });
    expect(n.hl).toBe(0);
    expect(n.axialMode).toBe("free");
    expect(n.mode).toBe("searchLength");
    expect(n.numSupports).toBe(3);
    expect(n.h).toBe(1800);
    expect(normalizeAppInputs({ numSupports: 25 }).numSupports).toBe(0);
  });

  it("search key ignores the fixed length", () => {
    expect(searchKey({ ...REF_APP, L: 10 })).toBe(searchKey({ ...REF_APP, L: 99 }));
  });
});

describe("request channel", () => {
  it("ignores an older response after a newer request", () => {
    let s = channelReducer(initialChannel<string>(), { type: "request", id: 1 });
    s = channelReducer(s, { type: "request", id: 2 });
    s = channelReducer(s, { type: "success", id: 1, data: "old" });
    expect(s.data).toBeNull();
    s = channelReducer(s, { type: "success", id: 2, data: "new" });
    expect(s.data).toBe("new");
    s = channelReducer(s, { type: "request", id: 3 });
    expect(s.refreshing).toBe(true);
  });

  it("never keeps a previous result as current after an error", () => {
    let s = channelReducer(initialChannel<string>(), { type: "request", id: 1 });
    s = channelReducer(s, { type: "success", id: 1, data: "r1" });
    s = channelReducer(s, { type: "request", id: 2 });
    s = channelReducer(s, { type: "failure", id: 2, error: "boom" });
    expect(s.status).toBe("error");
    expect(s.data).toBeNull();
  });
});

describe("searches through the app layer", () => {
  it("minimum supports = 1 (certified) and length options inside the range", () => {
    const o = runEngine({ kind: "minSupports", input: toSearchInput(REF_APP), maxSupports: 20 }) as SearchOutcome;
    expect(describeSearch(o).title).toContain("certified");
    const v = searchView(o);
    expect(v.numSupports).toBe(1);
    const opts = lengthOptions(v.ranges[0], v.infimum).map((x) => x.id);
    expect(opts).toEqual(["min0", "mid", "lower", "upper"]);
    expect(initialChoice(v)!.option.id).toBe("min0");
  });

  it("unbounded range (q = 0): no invented Lmax or midpoint", () => {
    const o = runEngine({ kind: "searchLength", input: toSearchInput({ ...REF_APP, includeSelfWeight: false }), numSupports: 0 }) as SearchOutcome;
    const v = searchView(o);
    expect(v.ranges[0].upper.kind).toBe("unbounded");
    expect(lengthOptions(v.ranges[0], v.infimum).map((x) => x.id)).toEqual(["lower"]);
  });

  it("tangency: undecidable is never shown as no solution nor certified minimum", () => {
    const sa = 423.8447418043896;
    const input = { ...toSearchInput(REF_APP), sigmaAllow: sa };
    const o = runEngine({ kind: "minSupports", input, maxSupports: 3 }) as SearchOutcome;
    const t = describeSearch(o).title;
    expect(t).toContain("NOT certified");
    expect(derive(REF_APP).E_MPa).toBe(210000);
  });
});
