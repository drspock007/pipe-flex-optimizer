// créé par Giovanni Malagnino, 2026-09-26 05:35 CEST (Europe/Rome, UTC+2)
// V2-8-R1: worker lifecycle of useV2Engine with a simulated Worker.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useV2Engine } from "../useV2Engine";
import { DEFAULT_INPUTS, AppInputs } from "@/lib/v2-app/inputs";

class FakeWorker {
  static all: FakeWorker[] = [];
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: { preventDefault: () => void; message: string }) => void) | null = null;
  posted: { id: number; channel: string }[] = [];
  terminated = false;
  constructor() { FakeWorker.all.push(this); }
  postMessage(m: { id: number; channel: string }) { this.posted.push(m); }
  terminate() { this.terminated = true; }
  reply(data: unknown) { this.onmessage?.({ data }); }
  fail() { this.onerror?.({ preventDefault: () => {}, message: "boom" }); }
}
const searchWorkers = () => FakeWorker.all.filter((w) => w.posted.some((p) => p.channel === "search"));

beforeEach(() => { FakeWorker.all = []; vi.useFakeTimers(); vi.stubGlobal("Worker", FakeWorker); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const start = (mode: AppInputs["mode"]) => renderHook(({ i }) => useV2Engine(i, 10), { initialProps: { i: { ...DEFAULT_INPUTS, mode } as AppInputs } });

describe("useV2Engine worker lifecycle", () => {
  it("a mode change to Fixed L terminates the running search; late events are ignored", () => {
    const h = start("searchLength");
    act(() => { vi.advanceTimersByTime(20); });
    const w = searchWorkers()[0];
    expect(w).toBeDefined();
    const id = w.posted[0].id;
    h.rerender({ i: { ...DEFAULT_INPUTS, mode: "fixedLength" } });
    expect(w.terminated).toBe(true);
    act(() => { w.reply({ id, progress: { n: 1 } }); w.reply({ id, ok: false, error: "late" }); w.fail(); });
    expect(h.result.current.search.status).toBe("idle");
    expect(h.result.current.search.error).toBeNull();
    // Back to a search: a fresh worker serves it.
    h.rerender({ i: { ...DEFAULT_INPUTS, mode: "searchLength" } });
    act(() => { vi.advanceTimersByTime(20); });
    const w2 = searchWorkers().at(-1)!;
    expect(w2).not.toBe(w);
    expect(h.result.current.search.status).toBe("loading");
  });
  it("an error of the current worker is attributed to the running request only", () => {
    const h = start("searchLength");
    act(() => { vi.advanceTimersByTime(20); });
    const w = searchWorkers()[0];
    act(() => { w.fail(); });
    expect(h.result.current.search.status).toBe("error");
    act(() => { w.fail(); }); // nothing running any more
    expect(h.result.current.search.status).toBe("error");
  });
  it("a solve whose target disappears is terminated", () => {
    const h = start("fixedLength");
    act(() => { h.result.current.setSolveTarget({ L_mm: 30000, numSupports: 0 }); });
    act(() => { vi.advanceTimersByTime(20); });
    const w = FakeWorker.all.find((x) => x.posted.some((p) => p.channel === "solve"))!;
    act(() => { h.result.current.setSolveTarget(null); });
    expect(w.terminated).toBe(true);
    act(() => { w.reply({ id: w.posted[0].id, ok: false, error: "late" }); });
    expect(h.result.current.solve.status).toBe("idle");
  });
});
