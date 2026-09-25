// créé par Giovanni Malagnino, 2026-09-25 01:43 CEST (Europe/Rome, UTC+2)
// Builds an export report only from a coherent, current set of results.

import { ChannelState } from "./channel-state";
import { AppInputs } from "./inputs";
import { searchKey, solveKeyOf } from "./bridge";
import { V2Report } from "@/lib/pdf/report-types";
import type { SearchData, SolveData, SolveTarget } from "@/hooks/useV2Engine";

export function buildReport(
  inputs: AppInputs, target: SolveTarget | null, searchMode: boolean,
  search: ChannelState<SearchData>, solve: ChannelState<SolveData>,
  extras: { searchStatus: string | null; ranges: string[]; searchNotes?: [string, string][] },
): V2Report | null {
  const key = solveKeyOf(inputs, target);
  const d = solve.data;
  if (!key || solve.status !== "ready" || solve.refreshing || !d || d.key !== key || d.result.status !== "ok") return null;
  if (searchMode && (search.status !== "ready" || search.data?.key !== searchKey(inputs))) return null;
  return { key, inputs: d.inputs, derived: d.derived, solution: d.result, ...extras };
}
