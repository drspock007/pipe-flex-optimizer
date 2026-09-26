// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-25 17:40 CEST (Europe/Rome, UTC+2): Find h (V2-4).
// Modifié par Giovanni Malagnino, 2026-09-25 20:10 CEST: ground branch dispatch (V2-5).
// Modifié par Giovanni Malagnino, 2026-09-25 22:40 CEST: Find h with ground (V2-6).
// Modifié par Giovanni Malagnino, 2026-09-26 04:30 CEST: Find L with ground (V2-7).
// Typed messages between the UI and the V2 engine worker, and the pure
// functions executed by the worker (also usable synchronously in tests).

import {
  BiaxialInput, GroundLengthInput, GroundLengthResult, searchLengthGround, BiaxialResult, GroundHeightInput, GroundHeightResult, searchHeightGround, CurveSample, GeneralFixedResult, GeneralMinResult, HeightSearchInput, HeightSearchResult, LengthSearchInput, searchHeightFixedSupports,
  sampleCurve, searchLengthGeneral, solveGroundFixedLength, searchMinSupportsGeneral, solveBiaxialFixedLength,
} from "@/lib/mechanics-v2";

export type SearchRequest =
  | { kind: "searchLength"; input: LengthSearchInput; numSupports: number }
  | { kind: "minSupports"; input: LengthSearchInput; maxSupports: number }
  | { kind: "findH"; input: HeightSearchInput; numSupports: number }
  | { kind: "findHGround"; input: GroundHeightInput; numSupports: number }
  | { kind: "searchLengthGround"; input: GroundLengthInput; numSupports: number };
export type SolveRequest = { kind: "solve"; input: BiaxialInput & { groundZ?: number } };
export type EngineRequest = SearchRequest | SolveRequest;

export type SearchOutcome =
  | { kind: "searchLength"; result: GeneralFixedResult }
  | { kind: "minSupports"; result: GeneralMinResult }
  | { kind: "findH"; result: HeightSearchResult }
  | { kind: "findHGround"; result: GroundHeightResult }
  | { kind: "searchLengthGround"; result: GroundLengthResult };
export interface SolveOutcome { kind: "solve"; result: BiaxialResult; samples: CurveSample[] | null }
export type EngineOutcome = SearchOutcome | SolveOutcome;

export interface WorkerRequestMsg { id: number; channel: "search" | "solve"; request: EngineRequest }
export type WorkerResponseMsg =
  | { id: number; channel: "search" | "solve"; ok: true; outcome: EngineOutcome }
  | { id: number; channel: "search" | "solve"; ok: false; error: string };

/** Display samples per member: enough resolution, bounded total size. */
const perMember = (members: number) => Math.max(1, Math.ceil(240 / members));

export function runEngine(req: EngineRequest): EngineOutcome {
  if (req.kind === "searchLength") return { kind: req.kind, result: searchLengthGeneral(req.input, req.numSupports) };
  if (req.kind === "minSupports") return { kind: req.kind, result: searchMinSupportsGeneral(req.input, req.maxSupports) };
  if (req.kind === "findHGround") return { kind: req.kind, result: searchHeightGround(req.input, req.numSupports) };
  if (req.kind === "searchLengthGround") return { kind: req.kind, result: searchLengthGround(req.input, req.numSupports) };
  if (req.kind === "findH") return { kind: req.kind, result: searchHeightFixedSupports(req.input, req.numSupports) };
  const { groundZ, ...input } = req.input;
  const result = groundZ === undefined ? solveBiaxialFixedLength(input) : solveGroundFixedLength({ ...input, groundZ });
  const samples = result.status === "ok" ? thin(sampleCurve(result, perMember(result.members.length)), 800) : null;
  return { kind: "solve", result, samples };
}

/** Display only: keep at most max samples (first and last always kept). */
function thin<T>(a: T[], max: number): T[] {
  if (a.length <= max) return a;
  const step = Math.ceil(a.length / max);
  return a.filter((_, i) => i % step === 0 || i === a.length - 1);
}
