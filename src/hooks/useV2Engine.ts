// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-25 01:43 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-25 17:40 CEST: Find h search channel (L relaunches it, hv only the solve).
// Modifié par Giovanni Malagnino, 2026-09-25 22:40 CEST: Find h with ground (V2-6).
// Modifié par Giovanni Malagnino, 2026-09-26 04:30 CEST: Find L with ground (V2-7).
// Modifié par Giovanni Malagnino, 2026-09-26 05:35 CEST: cancellation on deactivation, stale worker events (V2-8-R1).
// Modifié par Giovanni Malagnino, 2026-09-26 05:10 CEST: Min. supports with ground, worker cancellation, progress (V2-8).
// Runs V2 searches and fixed-length solutions in a Web Worker.
// Two channels: "search" (not re-run when only the represented length changes)
// and "solve". A request id is allocated as soon as the relevant inputs change,
// which immediately invalidates the previous result and any in-flight response;
// the debounce only delays the dispatch to the worker. Each result carries the
// key and the input snapshot of the request that produced it.

import { useEffect, useReducer, useRef, useState } from "react";
import { AppInputs } from "@/lib/v2-app/inputs";
import { derive, Derived, isLengthGround, isMinGround, searchKey, solveKeyOf, toFixedInput, toHeightInput, toSearchInput, toLengthGroundInput } from "@/lib/v2-app/bridge";
import { EngineRequest, SearchOutcome, SolveOutcome, WorkerRequestMsg, WorkerResponseMsg } from "@/lib/v2-app/protocol";
import { ChannelAction, ChannelState, channelReducer, initialChannel } from "@/lib/v2-app/channel-state";

export interface SolveTarget { L_mm: number; numSupports: number; hv_mm?: number }
export type SearchData = SearchOutcome & { key: string };
export type SolveData = SolveOutcome & { key: string; inputs: AppInputs; derived: Derived };
type Ctx = { key: string; inputs: AppInputs; derived: Derived };
type Channel = "search" | "solve";

export const isSearchMode = (m: AppInputs["mode"]) => m === "searchLength" || m === "minSupports";

export function useV2Engine(inputs: AppInputs, debounceMs = 300) {
  const [solveTarget, setSolveTarget] = useState<SolveTarget | null>(null);
  const [search, dSearch] = useReducer(channelReducer<SearchData>, initialChannel<SearchData>()) as [ChannelState<SearchData>, (a: ChannelAction<SearchData>) => void];
  const [solve, dSolve] = useReducer(channelReducer<SolveData>, initialChannel<SolveData>()) as [ChannelState<SolveData>, (a: ChannelAction<SolveData>) => void];
  // One worker per channel: a new request terminates a busy worker of its channel,
  // so an obsolete search never has to consume its budget (V2-8 cancellation).
  const workers = useRef<Record<Channel, Worker | null>>({ search: null, solve: null });
  /** Id of the request currently running in each channel's worker (0 = idle). */
  const running = useRef<Record<Channel, number>>({ search: 0, solve: 0 });
  const nextId = useRef(0);
  const ctx = useRef(new Map<number, Ctx>());
  const dispatchOf = (c: Channel) => (c === "search" ? dSearch : dSolve) as (a: ChannelAction<never>) => void;

  const spawn = (c: Channel): Worker | null => {
    if (typeof Worker === "undefined") return null;
    const w = new Worker(new URL("../lib/v2-app/engine.worker.ts", import.meta.url), { type: "module" });
    // Events from a replaced (terminated) worker are ignored: they never reach
    // the current request, even if the browser still delivers them.
    const current = () => workers.current[c] === w;
    w.onmessage = (e: MessageEvent<WorkerResponseMsg>) => {
      if (!current()) return;
      const m = e.data, d = dispatchOf(c);
      if ("progress" in m) { d({ type: "progress", id: m.id, progress: m.progress }); return; }
      if (m.id === running.current[c]) running.current[c] = 0;
      const x = ctx.current.get(m.id);
      ctx.current.delete(m.id);
      if (m.ok && x) d({ type: "success", id: m.id, data: { ...m.outcome, ...x } as never });
      else if (!m.ok) d({ type: "failure", id: m.id, error: (m as { error: string }).error });
    };
    w.onerror = (ev) => {
      ev.preventDefault();
      const id = running.current[c];
      if (!current() || id === 0) return; // stale worker or no request in flight
      running.current[c] = 0;
      ctx.current.delete(id);
      dispatchOf(c)({ type: "failure", id, error: `Calculation worker failed${ev.message ? `: ${ev.message}` : ""}` });
    };
    workers.current[c] = w;
    return w;
  };
  useEffect(() => {
    spawn("search"); spawn("solve");
    return () => { (["search", "solve"] as Channel[]).forEach((c) => { workers.current[c]?.terminate(); workers.current[c] = null; }); ctx.current.clear(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Terminate the channel's busy worker (replaced by a fresh one) and drop the context of the cancelled request. */
  const cancel = (c: Channel) => {
    const id = running.current[c];
    if (id === 0) return;
    ctx.current.delete(id);
    running.current[c] = 0;
    workers.current[c]?.terminate();
    workers.current[c] = null;
    spawn(c);
  };
  /** Invalidate the channel now (cancelling a busy worker) and return the id reserved for the next dispatch. */
  const begin = (c: Channel) => {
    const id = ++nextId.current;
    cancel(c);
    dispatchOf(c)({ type: "request", id });
    return id;
  };
  const send = (c: Channel, id: number, request: EngineRequest, context: Ctx) => {
    const w = workers.current[c];
    if (!w) { dispatchOf(c)({ type: "failure", id, error: "Web Workers are not available in this browser" }); return; }
    ctx.current.set(id, context);
    running.current[c] = id;
    w.postMessage({ id, channel: c, request } satisfies WorkerRequestMsg);
  };

  const sKey = searchKey(inputs);
  // Ground contact: available in every mode (V2-8).
  const searchActive = isSearchMode(inputs.mode) || inputs.mode === "findH";
  useEffect(() => {
    if (!searchActive) { cancel("search"); dSearch({ type: "reset" }); return; }
    const id = begin("search");
    const snap = inputs;
    const t = setTimeout(() => {
      const d = derive(snap), input = toSearchInput(snap, d);
      send("search", id, snap.mode === "findH"
        ? snap.groundEnabled
          ? { kind: "findHGround", input: { ...toHeightInput(snap, d), groundZ: snap.groundContactZ }, numSupports: snap.numSupports }
          : { kind: "findH", input: toHeightInput(snap, d), numSupports: snap.numSupports }
        : isLengthGround(snap)
        ? { kind: "searchLengthGround", input: toLengthGroundInput(snap, d), numSupports: snap.numSupports }
        : isMinGround(snap)
        ? { kind: "minSupportsGround", input: toLengthGroundInput(snap, d), maxSupports: snap.maxSupports }
        : snap.mode === "minSupports"
        ? { kind: "minSupports", input, maxSupports: snap.maxSupports }
        : { kind: "searchLength", input, numSupports: snap.numSupports }, { key: sKey, inputs: snap, derived: d });
    }, debounceMs);
    return () => clearTimeout(t);
  }, [sKey, searchActive, debounceMs]); // eslint-disable-line react-hooks/exhaustive-deps

  const solveKey = solveKeyOf(inputs, solveTarget);
  useEffect(() => {
    if (!solveTarget || !solveKey) { cancel("solve"); dSolve({ type: "reset" }); return; }
    const id = begin("solve");
    const target = solveTarget, hv = target.hv_mm ?? inputs.h;
    // The stored inputs carry the represented hv so that reports show it.
    const snap = { ...inputs, h: hv }, d = derive(snap);
    const t = setTimeout(() => {
      send("solve", id, { kind: "solve", input: toFixedInput(snap, target.L_mm, target.numSupports, d, hv) }, { key: solveKey, inputs: snap, derived: d });
    }, debounceMs / 2);
    return () => clearTimeout(t);
  }, [solveKey, debounceMs]); // eslint-disable-line react-hooks/exhaustive-deps

  return { search, solve, solveTarget, setSolveTarget };
}
