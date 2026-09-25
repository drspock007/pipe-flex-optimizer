// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-25 17:40 CEST (Europe/Rome, UTC+2): Find h (V2-4).
// Typed messages between the UI and the V2 engine worker, and the pure
// functions executed by the worker (also usable synchronously in tests).

import {
  BiaxialInput, BiaxialResult, CurveSample, GeneralFixedResult, GeneralMinResult, HeightSearchInput, HeightSearchResult, LengthSearchInput, searchHeightFixedSupports,
  sampleCurve, searchLengthGeneral, searchMinSupportsGeneral, solveBiaxialFixedLength,
} from "@/lib/mechanics-v2";

export type SearchRequest =
  | { kind: "searchLength"; input: LengthSearchInput; numSupports: number }
  | { kind: "minSupports"; input: LengthSearchInput; maxSupports: number }
  | { kind: "findH"; input: HeightSearchInput; numSupports: number };
export type SolveRequest = { kind: "solve"; input: BiaxialInput };
export type EngineRequest = SearchRequest | SolveRequest;

export type SearchOutcome =
  | { kind: "searchLength"; result: GeneralFixedResult }
  | { kind: "minSupports"; result: GeneralMinResult }
  | { kind: "findH"; result: HeightSearchResult };
export interface SolveOutcome { kind: "solve"; result: BiaxialResult; samples: CurveSample[] | null }
export type EngineOutcome = SearchOutcome | SolveOutcome;

export interface WorkerRequestMsg { id: number; channel: "search" | "solve"; request: EngineRequest }
export type WorkerResponseMsg =
  | { id: number; channel: "search" | "solve"; ok: true; outcome: EngineOutcome }
  | { id: number; channel: "search" | "solve"; ok: false; error: string };

/** Display samples per member: enough resolution, bounded total size. */
const perMember = (n: number) => Math.max(4, Math.ceil(240 / (n + 1)));

export function runEngine(req: EngineRequest): EngineOutcome {
  if (req.kind === "searchLength") return { kind: req.kind, result: searchLengthGeneral(req.input, req.numSupports) };
  if (req.kind === "minSupports") return { kind: req.kind, result: searchMinSupportsGeneral(req.input, req.maxSupports) };
  if (req.kind === "findH") return { kind: req.kind, result: searchHeightFixedSupports(req.input, req.numSupports) };
  const result = solveBiaxialFixedLength(req.input);
  const samples = result.status === "ok" ? sampleCurve(result, perMember(req.input.numSupports)) : null;
  return { kind: "solve", result, samples };
}
