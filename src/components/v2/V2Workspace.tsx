// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Right-hand workspace: search status, length selection, results, charts, export.
// Details and charts always come from the same fixed-length solution.
// Modifié par Giovanni Malagnino, 2026-09-25 01:43 CEST: export only from a coherent, current request.
// Modifié par Giovanni Malagnino, 2026-09-25 17:40 CEST: Find h (V2-4).
// Modifié par Giovanni Malagnino, 2026-09-25 20:10 CEST: ground contact, Fixed L only (V2-5).
// Modifié par Giovanni Malagnino, 2026-09-25 22:40 CEST: Find h with ground (V2-6).
// Modifié par Giovanni Malagnino, 2026-09-26 04:30 CEST: Find L with ground (V2-7).
// Modifié par Giovanni Malagnino, 2026-09-26 05:10 CEST: Min. supports with ground (V2-8).

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { useUnits } from "@/contexts/UnitContext";
import { useV2Engine, isSearchMode, SolveTarget } from "@/hooks/useV2Engine";
import { AppInputs } from "@/lib/v2-app/inputs";
import { getYieldStrength } from "@/lib/calculations";
import { Derived, isLengthGround, isMinGround, solveKeyOf } from "@/lib/v2-app/bridge";
import { buildReport } from "@/lib/v2-app/report-build";
import { initialChoice, lengthOptions, searchView } from "@/lib/v2-app/selection";
import { describeSearch } from "@/lib/v2-app/status-text";
import { solveText } from "@/lib/v2-app/solve-text";
import GroundLengthCard from "./GroundLengthCard";
import GroundMinCard from "./GroundMinCard";
import { groundMinRows, GROUND_MIN_LIMITS } from "@/lib/v2-app/ground-min-text";
import { glBest, glInitial, glSelected, groundLengthResult, GLSelection } from "@/lib/v2-app/ground-length-selection";
import { groundLengthRows, GROUND_LENGTH_LIMITS } from "@/lib/v2-app/ground-length-text";
import { StatusBanner, Busy } from "./StatusBanner";
import LengthSelector, { Selection, rangeText, useFmtLength } from "./LengthSelector";
import V2ResultsPanel from "./V2ResultsPanel";
import V2Charts from "./V2Charts";
import ExportPdfCard from "@/components/ExportPdfCard";
import HeightSearchCard, { useFmtHeight } from "./HeightSearchCard";
import { GROUND_HEIGHT_LIMITS, groundHeightRows } from "@/lib/v2-app/ground-height-text";
import { HeightSelection, heightRangeText, heightRanges, initialHeight, selectedHeight } from "@/lib/v2-app/height-selection";

const V2Workspace = ({ inputs, exportBlocked = null }: { inputs: AppInputs; derived?: Derived; exportBlocked?: string | null }) => {
  const { search, solve, setSolveTarget } = useV2Engine(inputs);
  const fmt = useFmtLength();
  const blocked = false;
  const minGround = isMinGround(inputs);
  const lengthGround = isLengthGround(inputs) || minGround;
  const searchMode = isSearchMode(inputs.mode) && !lengthGround;
  const gmr = minGround && search.data?.kind === "minSupportsGround" ? search.data.result : null;
  const glr = lengthGround ? groundLengthResult(search.data) : null;
  const best = glBest(search.data);
  const [glSel, setGlSel] = useState<GLSelection | null>(null);
  const glL = glSelected(glr, glSel, best);
  const view = searchMode && search.data ? searchView(search.data) : null;
  const [selection, setSelection] = useState<Selection | null>(null);
  const heightMode = inputs.mode === "findH" && !blocked;
  const fmtH = useFmtHeight();
  const { conv, label } = useUnits();
  const fmtS = (v: number) => `${conv(v, "MPa").toFixed(2)} ${label("MPa")}`;
  const hRanges = heightMode ? heightRanges(search.data) : [];
  const [hSel, setHSel] = useState<HeightSelection | null>(null);
  const selectedH = selectedHeight(hRanges, hSel);

  useEffect(() => {
    const c = view ? initialChoice(view) : null;
    setSelection(c ? { rangeIndex: c.rangeIndex, optionId: c.option.id, customL: null } : null);
    setHSel(initialHeight(heightRanges(search.data)));
    setGlSel(glInitial(groundLengthResult(search.data), glBest(search.data)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.data]);

  const options = view && selection && view.ranges[selection.rangeIndex] ? lengthOptions(view.ranges[selection.rangeIndex], view.infimum) : [];
  const selectedL = selection?.optionId === "custom" ? selection.customL : options.find((o) => o.id === selection?.optionId)?.L ?? null;
  const target: SolveTarget | null = useMemo(() => {
    if (blocked) return null;
    if (inputs.mode === "findH") {
      if (search.status !== "ready" || selectedH === null) return null;
      return { L_mm: inputs.L * 1000, numSupports: inputs.numSupports, hv_mm: selectedH };
    }
    if (minGround) return search.status === "ready" && glL !== null && gmr?.status === "found" ? { L_mm: glL, numSupports: gmr.candidate.n } : null;
    if (lengthGround) return search.status === "ready" && glL !== null ? { L_mm: glL, numSupports: inputs.numSupports } : null;
    if (inputs.mode === "fixedLength") return { L_mm: inputs.L * 1000, numSupports: inputs.numSupports };
    if (search.status !== "ready" || !view || view.numSupports === null || selectedL === null) return null;
    return { L_mm: selectedL, numSupports: view.numSupports };
  }, [blocked, inputs.mode, inputs.L, inputs.numSupports, search.status, view?.numSupports, selectedL, selectedH, lengthGround, glL, minGround, gmr]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setSolveTarget(target), [target?.L_mm, target?.numSupports, target?.hv_mm]); // eslint-disable-line react-hooks/exhaustive-deps

  const sol = solve.data?.result.status === "ok" ? solve.data.result : null;
  const searchStatus = search.data ? describeSearch(search.data) : null;
  const gh = heightMode && search.data?.kind === "findHGround" ? search.data.result : null;
  const ghRows = gh ? groundHeightRows(gh, fmtH) : [];
  const glRows = glr ? groundLengthRows(glr, fmt, fmtS) : [];
  const gmRows = gmr ? groundMinRows(gmr, fmt, fmtS) : [];
  const rangeExists = minGround ? (search.data ? (gmr?.status === "found" ? true : "undecidable" as const) : null) : glr ? ("ranges" in glr && glr.ranges.length > 0 ? true : "undecidable" as const) : !(searchMode || heightMode) || !search.data ? null
    : gh ? (hRanges.length > 0 ? true : gh.status === "impossible" ? false : "undecidable" as const)
    : search.data.kind !== "minSupports" && search.data.result.status === "undecidable" ? "undecidable" as const
    : heightMode ? hRanges.length > 0 : (view?.ranges.length ?? 0) > 0;
  const report = buildReport(inputs, target, searchMode || heightMode || lengthGround, search, solve, {
    searchStatus: searchStatus?.title ?? null,
    ranges: glr ? [] : heightMode ? hRanges.map((r) => heightRangeText(r, fmtH)) : view?.ranges.map((r) => rangeText(r, fmt)) ?? [],
    searchNotes: gh ? [...ghRows, ["Search method and limits", GROUND_HEIGHT_LIMITS]] : gmr ? [...gmRows, ["Support-count search method and limits", GROUND_MIN_LIMITS], ...glRows.map(([a, b]) => [`Candidate length search: ${a}`, b] as [string, string]), ["Length search method and limits", GROUND_LENGTH_LIMITS]] : glr ? [...glRows, ["Search method and limits", GROUND_LENGTH_LIMITS]] : undefined,
  });
  const stale = solve.data !== null && solve.data.key !== solveKeyOf(inputs, target);

  return (
    <div className="space-y-4">
      {minGround && <GroundMinCard loading={search.status === "loading"} refreshing={search.refreshing} error={search.status === "error" ? search.error : null}
        status={searchStatus} result={gmr} details={gmRows} progress={search.status === "loading" ? (search.progress as never) : null} />}
      {lengthGround && (!minGround || glr) && (
        <GroundLengthCard best={best} title={minGround ? `Candidate (${gmr?.status === "found" ? gmr.candidate.n : "–"} installed supports): estimated length ranges` : undefined}
          loading={!minGround && search.status === "loading"} refreshing={search.refreshing} error={!minGround && search.status === "error" ? search.error : null}
          status={minGround ? null : searchStatus} result={glr} details={glRows} selection={glSel} selectedL={glL} onChange={setGlSel} />
      )}
      {heightMode && (
        <HeightSearchCard loading={search.status === "loading"} refreshing={search.refreshing} error={search.status === "error" ? search.error : null}
          status={searchStatus} details={ghRows} limits={gh ? GROUND_HEIGHT_LIMITS : undefined} ranges={hRanges} selection={hSel} selectedH={selectedH} onChange={setHSel} />
      )}
      {searchMode && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Search className="h-4 w-4 text-primary" /> Length search</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {search.status === "loading" && <Busy label={search.refreshing ? "Updating search — the content below belongs to the previous inputs" : "Searching admissible lengths…"} />}
            {search.status === "error" && <StatusBanner s={{ tone: "error", title: "Search failed", detail: search.error ?? undefined }} />}
            {searchStatus && <StatusBanner s={searchStatus} />}
            {view && selectedL !== null && (
              <p className="text-xs">Represented length: <strong className="font-mono">{fmt(selectedL)}</strong>
                <span className="text-muted-foreground"> — initially the minimum-stress length of the first range, else its midpoint, else a finite bound.</span></p>
            )}
            {view && <LengthSelector view={view} selection={selection} onChange={setSelection} />}
          </CardContent>
        </Card>
      )}
      {solve.status === "loading" && <Busy label={solve.refreshing ? "Recomputing — results below belong to the previous inputs" : "Solving…"} />}
      {solve.status === "error" && <StatusBanner s={{ tone: "error", title: "Calculation failed", detail: solve.error ?? undefined }} />}
      {solve.data && solveText(solve.data.result) && <StatusBanner s={solveText(solve.data.result)!} />}
      {sol && solve.data?.samples && (
        <div className={solve.refreshing || stale ? "opacity-60" : ""}>
          <Card><CardContent className="pt-4"><V2Charts solution={sol} samples={solve.data.samples} /></CardContent></Card>
          <div className="mt-4">
            <V2ResultsPanel s={sol} mode={inputs.mode} yieldStrength={getYieldStrength(inputs.grade, inputs.customYield)} rangeExists={rangeExists} infimum={view?.infimum ?? null}
              atBound={lengthGround ? false : searchMode ? ["lower", "upper", "point"].includes(selection?.optionId ?? "") : heightMode && ["lower", "upper", "point"].includes(hSel?.optionId ?? "")} />
          </div>
        </div>
      )}
      <ExportPdfCard report={report} currentKey={solveKeyOf(inputs, target)} blockedReason={exportBlocked} />
    </div>
  );
};

export default V2Workspace;
