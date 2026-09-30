// créé par Giovanni Malagnino, 2026-09-26 18:20 CEST (Europe/Rome, UTC+2)
// V2-11 Find L restrained wiring: keys, worker protocol, selection, coherence with the solve.
import { describe, expect, it } from "vitest";
import { DEFAULT_INPUTS, normalizeAppInputs } from "../inputs";
import { derive, isLengthRestrained, searchKey, solveKeyOf, toFixedInput, toLengthRestrainedInput } from "../bridge";
import { runEngine } from "../protocol";
import { glBest, glInitial, glSelected, groundLengthResult } from "../ground-length-selection";
import { describeSearch } from "../status-text";

const FL = { ...DEFAULT_INPUTS, mode: "searchLength" as const, axialMode: "restrained" as const, h: 1000, hl: 500, numSupports: 2, searchLmin: 7.5, searchLmax: 120 };

describe("Find L restrained keys", () => {
  it("routes to the restrained path, with and without ground", () => {
    expect(isLengthRestrained(FL)).toBe(true);
    expect("groundZ" in toLengthRestrainedInput(FL)).toBe(false);
    expect(toLengthRestrainedInput({ ...FL, groundEnabled: true, groundContactZ: -10 }).groundZ).toBe(-10);
    expect(toLengthRestrainedInput(FL).Lmax).toBe(120000);
  });
  it("domain and hl relaunch the search; L and the represented L do not", () => {
    expect(searchKey({ ...FL, searchLmax: 100 })).not.toBe(searchKey(FL));
    expect(searchKey({ ...FL, searchLmin: 8 })).not.toBe(searchKey(FL));
    expect(searchKey({ ...FL, hl: 300 })).not.toBe(searchKey(FL));
    expect(searchKey({ ...FL, L: 12 })).toBe(searchKey(FL));
    const t = { L_mm: 50000, numSupports: 2 };
    expect(solveKeyOf(FL, t)!.startsWith(searchKey(FL))).toBe(true);
    expect(solveKeyOf(FL, t)).not.toBe(solveKeyOf(FL, { ...t, L_mm: 60000 }));
  });
  it("legacy presets load with a domain and free sliding", () => {
    const a = normalizeAppInputs({ L: 40, calcMode: "standard" });
    expect([a.searchLmin, a.searchLmax]).toEqual([10, 160]);
    expect(a.axialMode).toBe("free");
  });
});

describe("Find L restrained through the worker protocol", { timeout: 60000 }, () => {
  const o = runEngine({ kind: "searchLengthRestrained", input: toLengthRestrainedInput({ ...FL, groundEnabled: true, groundContactZ: 0 }), numSupports: 2 });
  it("initial L = final-checked lowest combined stress sample; its solve is admissible", () => {
    if (o.kind !== "searchLengthRestrained" || o.result.status !== "found") throw new Error(JSON.stringify(o).slice(0, 300));
    expect(describeSearch(o).title).toMatch(/axial restraint, with ground/);
    const r = groundLengthResult(o)!, best = glBest(o)!;
    expect(best).toBe(o.result.meta.finalCheck.L);
    const L = glSelected(r, glInitial(r, best), best)!;
    expect(L).toBe(best);
    const g = { ...FL, groundEnabled: true, groundContactZ: 0 };
    const s = runEngine({ kind: "solve", input: toFixedInput(g, L, 2, derive(g)) });
    if (s.kind !== "solve" || s.result.status !== "ok") throw new Error();
    expect(s.result.axial!.combinedCriterionMet).toBe(true);
    expect(s.result.axial!.criterionUncertain).toBe(false);
  });
});
