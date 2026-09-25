// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-25 01:43 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-25 17:40 CEST: Find h search channel (L relaunches it, hv only the solve).
// Modifié par Giovanni Malagnino, 2026-09-25 22:40 CEST: Find h with ground (V2-6).
// Runs V2 searches and fixed-length solutions in a Web Worker.
// Two channels: "search" (not re-run when only the represented length changes)
// and "solve". A request id is allocated as soon as the relevant inputs change,
// which immediately invalidates the previous result and any in-flight response;
// the debounce only delays the dispatch to the worker. Each result carries the
// key and the input snapshot of the request that produced it.

import { useEffect, useReducer, useRef, useState } from "react";
import { AppInputs } from "@/lib/v2-app/inputs";
import { derive, Derived, groundBlocksSearch, searchKey, solveKeyOf, toFixedInput, toHeightInput, toSearchInput } from "@/lib/v2-app/bridge";
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
  const workerRef = useRef<Worker | null>(null);
  const nextId = useRef(0);
  const pending = useRef<Record<Channel, number>>({ search: 0, solve: 0 });
  const ctx = useRef(new Map<number, Ctx>());
  const dispatchOf = (c: Channel) => (c === "search" ? dSearch : dSolve) as (a: ChannelAction<never>) => void;

  useEffect(() => {
    if (typeof Worker === "undefined") return;
    const w = new Worker(new URL("../lib/v2-app/engine.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<WorkerResponseMsg>) => {
      const m = e.data;
      const c = ctx.current.get(m.id);
      ctx.current.delete(m.id);
      const d = dispatchOf(m.channel);
      if (m.ok && c) d({ type: "success", id: m.id, data: { ...m.outcome, ...c } as never });
      else if (!m.ok) d({ type: "failure", id: m.id, error: (m as Extract<WorkerResponseMsg, { ok: false }>).error });
    };
    w.onerror = (ev) => {
      ev.preventDefault();
      const msg = `Calculation worker failed${ev.message ? `: ${ev.message}` : ""}`;
      dSearch({ type: "failure", id: pending.current.search, error: msg });
      dSolve({ type: "failure", id: pending.current.solve, error: msg });
    };
    workerRef.current = w;
    return () => { w.terminate(); workerRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Invalidate the channel now and return the id reserved for the next dispatch. */
  const begin = (c: Channel) => {
    const id = ++nextId.current;
    pending.current[c] = id;
    dispatchOf(c)({ type: "request", id });
    return id;
  };
  const send = (c: Channel, id: number, request: EngineRequest, context: Ctx) => {
    if (!workerRef.current) { dispatchOf(c)({ type: "failure", id, error: "Web Workers are not available in this browser" }); return; }
    ctx.current.set(id, context);
    workerRef.current.postMessage({ id, channel: c, request } satisfies WorkerRequestMsg);
  };

  const sKey = searchKey(inputs);
  // Ground contact: Fixed L and Find h only; length searches stay blocked.
  const searchActive = (isSearchMode(inputs.mode) || inputs.mode === "findH") && !groundBlocksSearch(inputs);
  useEffect(() => {
    if (!searchActive) { dSearch({ type: "reset" }); return; }
    const id = begin("search");
    const snap = inputs;
    const t = setTimeout(() => {
      const d = derive(snap), input = toSearchInput(snap, d);
      send("search", id, snap.mode === "findH"
        ? snap.groundEnabled
          ? { kind: "findHGround", input: { ...toHeightInput(snap, d), groundZ: snap.groundContactZ }, numSupports: snap.numSupports }
          : { kind: "findH", input: toHeightInput(snap, d), numSupports: snap.numSupports }
        : snap.mode === "minSupports"
        ? { kind: "minSupports", input, maxSupports: snap.maxSupports }
        : { kind: "searchLength", input, numSupports: snap.numSupports }, { key: sKey, inputs: snap, derived: d });
    }, debounceMs);
    return () => clearTimeout(t);
  }, [sKey, searchActive, debounceMs]); // eslint-disable-line react-hooks/exhaustive-deps

  const solveKey = solveKeyOf(inputs, solveTarget);
  useEffect(() => {
    if (!solveTarget || !solveKey) { dSolve({ type: "reset" }); return; }
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
