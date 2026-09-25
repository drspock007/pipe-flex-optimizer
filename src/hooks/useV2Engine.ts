// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Runs V2 searches and fixed-length solutions in a Web Worker.
// Two channels: "search" (not re-run when only the represented length changes)
// and "solve". Inputs are debounced; stale responses are ignored by id.

import { useEffect, useReducer, useRef } from "react";
import { AppInputs } from "@/lib/v2-app/inputs";
import { derive, searchKey, toFixedInput, toSearchInput } from "@/lib/v2-app/bridge";
import { EngineRequest, SearchOutcome, SolveOutcome, WorkerRequestMsg, WorkerResponseMsg } from "@/lib/v2-app/protocol";
import { ChannelAction, ChannelState, channelReducer, initialChannel } from "@/lib/v2-app/channel-state";

type SearchState = ChannelState<SearchOutcome>;
type SolveState = ChannelState<SolveOutcome>;

export const isSearchMode = (m: AppInputs["mode"]) => m === "searchLength" || m === "minSupports";

export function useV2Engine(inputs: AppInputs, solveTarget: { L_mm: number; numSupports: number } | null, debounceMs = 300) {
  const [search, dispatchSearch] = useReducer(channelReducer<SearchOutcome>, initialChannel<SearchOutcome>()) as [SearchState, (a: ChannelAction<SearchOutcome>) => void];
  const [solve, dispatchSolve] = useReducer(channelReducer<SolveOutcome>, initialChannel<SolveOutcome>()) as [SolveState, (a: ChannelAction<SolveOutcome>) => void];
  const workerRef = useRef<Worker | null>(null);
  const nextId = useRef(0);
  const pending = useRef<{ search: number; solve: number }>({ search: 0, solve: 0 });

  useEffect(() => {
    if (typeof Worker === "undefined") return;
    const w = new Worker(new URL("../lib/v2-app/engine.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<WorkerResponseMsg>) => {
      const m = e.data;
      const d = m.channel === "search" ? dispatchSearch : dispatchSolve;
      if (m.ok) d({ type: "success", id: m.id, data: m.outcome as never });
      else d({ type: "failure", id: m.id, error: m.error });
    };
    w.onerror = (ev) => {
      ev.preventDefault();
      const msg = `Calculation worker failed${ev.message ? `: ${ev.message}` : ""}`;
      dispatchSearch({ type: "failure", id: pending.current.search, error: msg });
      dispatchSolve({ type: "failure", id: pending.current.solve, error: msg });
    };
    workerRef.current = w;
    return () => { w.terminate(); workerRef.current = null; };
  }, []);

  const post = (channel: "search" | "solve", request: EngineRequest) => {
    const id = ++nextId.current;
    pending.current[channel] = id;
    const d = channel === "search" ? dispatchSearch : dispatchSolve;
    d({ type: "request", id });
    if (!workerRef.current) {
      d({ type: "failure", id, error: "Web Workers are not available in this browser" });
      return;
    }
    workerRef.current.postMessage({ id, channel, request } satisfies WorkerRequestMsg);
  };

  const sKey = searchKey(inputs);
  const searchActive = isSearchMode(inputs.mode);
  useEffect(() => {
    if (!searchActive) { dispatchSearch({ type: "reset" }); return; }
    const t = setTimeout(() => {
      const input = toSearchInput(inputs);
      post("search", inputs.mode === "minSupports"
        ? { kind: "minSupports", input, maxSupports: inputs.maxSupports }
        : { kind: "searchLength", input, numSupports: inputs.numSupports });
    }, debounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sKey, searchActive, debounceMs]);

  const solveKey = solveTarget ? `${sKey}|${solveTarget.L_mm}|${solveTarget.numSupports}` : null;
  useEffect(() => {
    if (!solveTarget) { dispatchSolve({ type: "reset" }); return; }
    const t = setTimeout(() => {
      post("solve", { kind: "solve", input: toFixedInput(inputs, solveTarget.L_mm, solveTarget.numSupports, derive(inputs)) });
    }, debounceMs / 2);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solveKey, debounceMs]);

  return { search, solve };
}
