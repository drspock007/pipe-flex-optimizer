// créé par Giovanni Malagnino, 2026-09-25 01:43 CEST (Europe/Rome, UTC+2)
// V2-3-R1: zero labels, stale responses, reset, export coherence, coating load.
import { describe, expect, it } from "vitest";
import { channelReducer, initialChannel, ChannelState } from "../channel-state";
import { DEFAULT_INPUTS } from "../inputs";
import { derive, searchKey, solveKeyOf, toFixedInput } from "../bridge";
import { buildReport } from "../report-build";
import { runEngine } from "../protocol";
import { countLabel } from "@/components/v2/AnalysisCard";
import type { SearchData, SolveData } from "@/hooks/useV2Engine";

type S = ChannelState<string>;
const run = (acts: Parameters<typeof channelReducer<string>>[1][]) => acts.reduce<S>((s, a) => channelReducer(s, a), initialChannel<string>());

const solved = (inputs = DEFAULT_INPUTS, L = 30000, n = 0): SolveData => {
  const derived = derive(inputs);
  const o = runEngine({ kind: "solve", input: toFixedInput(inputs, L, n, derived) });
  if (o.kind !== "solve") throw new Error();
  return { ...o, key: solveKeyOf(inputs, { L_mm: L, numSupports: n })!, inputs, derived };
};
const ready = <T,>(data: T, id = 1): ChannelState<T> => ({ latestId: id, status: "ready", data, refreshing: false, error: null, progress: null });
const idle = initialChannel<SearchData>();
const extras = { searchStatus: null, ranges: [] };

describe("V2-3-R1 freshness", () => {
  it("renders 0 as a visible label", () => {
    expect(countLabel(0)).toBe("0");
    expect(countLabel(0).length).toBeGreaterThan(0);
  });
  it("rejects an old response arriving during the debounce of a new request", () => {
    const s = run([{ type: "request", id: 1 }, { type: "request", id: 2 }, { type: "success", id: 1, data: "old" }]);
    expect(s.status).toBe("loading");
    expect(s.data).toBeNull();
  });
  it("keeps previous data only as refreshing when invalidated", () => {
    const s = run([{ type: "request", id: 1 }, { type: "success", id: 1, data: "a" }, { type: "request", id: 2 }]);
    expect(s).toMatchObject({ status: "loading", data: "a", refreshing: true });
  });
  it("rejects a response received after reset (mode change during a calculation)", () => {
    const s = run([{ type: "request", id: 1 }, { type: "reset" }, { type: "success", id: 1, data: "x" }]);
    expect(s.data).toBeNull();
    expect(s.status).toBe("idle");
    const f = run([{ type: "request", id: 1 }, { type: "reset" }, { type: "failure", id: 1, error: "e" }]);
    expect(f.status).toBe("idle");
  });
  it("blocks export immediately after an input or length change", () => {
    const d = solved();
    const t = { L_mm: 30000, numSupports: 0 };
    expect(buildReport(DEFAULT_INPUTS, t, false, idle, ready(d), extras)).not.toBeNull();
    expect(buildReport({ ...DEFAULT_INPUTS, hl: 10 }, t, false, idle, ready(d), extras)).toBeNull();
    expect(buildReport(DEFAULT_INPUTS, { ...t, L_mm: 31000 }, false, idle, ready(d), extras)).toBeNull();
    expect(buildReport(DEFAULT_INPUTS, t, false, idle, { ...ready(d), status: "loading", refreshing: true }, extras)).toBeNull();
  });
  it("blocks export in search mode when the search belongs to other inputs", () => {
    const inputs = { ...DEFAULT_INPUTS, mode: "searchLength" as const };
    const d = solved(inputs);
    const t = { L_mm: 30000, numSupports: 0 };
    const srch = (key: string) => ready({ kind: "searchLength", key } as unknown as SearchData);
    expect(buildReport(inputs, t, true, srch(searchKey(inputs)), ready(d), extras)).not.toBeNull();
    expect(buildReport(inputs, t, true, srch("other"), ready(d), extras)).toBeNull();
  });
  it("exports inputs coherent with the exported solution", () => {
    const d = solved();
    const r = buildReport(DEFAULT_INPUTS, { L_mm: 30000, numSupports: 0 }, false, idle, ready(d), extras)!;
    expect(r.inputs).toBe(d.inputs);
    expect(r.solution.L).toBe(30000);
    expect(r.derived.q).toBeCloseTo(derive(r.inputs).q, 12);
  });
  it("reproduces the Yellow Jacket control case", () => {
    const i = { ...DEFAULT_INPUTS, Do: 219.1, t: 8.18, E: 207, L: 40, h: 1500, hl: 800, numSupports: 0, density: 7850,
      includeSelfWeight: true, coatingType: "yellowJacket", coatingThickness: 1.24, coatingDensity: 950 };
    const d = solved(i, 40000, 0);
    expect(Math.abs(d.derived.q - 0.4254062819) / 0.4254).toBeLessThan(1e-8);
    if (d.result.status !== "ok") throw new Error();
    expect(Math.abs(d.result.maxStress - 340.2702057) / 340.27).toBeLessThan(1e-8);
  });
});

// V2-8: progress messages are accepted only for the latest request.
describe("channel progress", () => {
  it("ignores stale progress and clears it on completion", () => {
    let st = channelReducer(initialChannel<number>(), { type: "request", id: 1 });
    st = channelReducer(st, { type: "request", id: 2 });
    st = channelReducer(st, { type: "progress", id: 1, progress: { n: 3 } });
    expect(st.progress).toBeNull();
    st = channelReducer(st, { type: "progress", id: 2, progress: { n: 1 } });
    expect(st.progress).toEqual({ n: 1 });
    st = channelReducer(st, { type: "success", id: 1, data: 5 });
    expect(st.status).toBe("loading");
    st = channelReducer(st, { type: "success", id: 2, data: 7 });
    expect(st.progress).toBeNull();
    expect(channelReducer(st, { type: "progress", id: 2, progress: { n: 9 } }).progress).toBeNull();
  });
});
