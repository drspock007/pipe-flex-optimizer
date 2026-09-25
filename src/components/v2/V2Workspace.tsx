// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Right-hand workspace: search status, length selection, results, charts, export.
// Details and charts always come from the same fixed-length solution.

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { useV2Engine, isSearchMode, SolveTarget } from "@/hooks/useV2Engine";
import { AppInputs } from "@/lib/v2-app/inputs";
import { Derived } from "@/lib/v2-app/bridge";
import { initialChoice, lengthOptions, searchView } from "@/lib/v2-app/selection";
import { describeSearch, StatusText } from "@/lib/v2-app/status-text";
import { BiaxialResult } from "@/lib/mechanics-v2";
import { StatusBanner, Busy } from "./StatusBanner";
import LengthSelector, { Selection, rangeText, useFmtLength } from "./LengthSelector";
import V2ResultsPanel from "./V2ResultsPanel";
import V2Charts from "./V2Charts";
import ExportPdfCard from "@/components/ExportPdfCard";

const solveText = (r: BiaxialResult): StatusText | null => {
  switch (r.status) {
    case "ok": return null;
    case "invalid-input": return { tone: "error", title: "Invalid input", detail: r.errors.join("; ") };
    case "not-implemented": return { tone: "info", title: "Not implemented", detail: r.message };
    case "contact-not-converged": return { tone: "error", title: "Contact did not converge", detail: r.diagnostics.messages.join("; ") };
    default: return { tone: "error", title: "Numerical failure", detail: r.message };
  }
};

const V2Workspace = ({ inputs, derived }: { inputs: AppInputs; derived: Derived }) => {
  const { search, solve, setSolveTarget } = useV2Engine(inputs);
  const fmt = useFmtLength();
  const searchMode = isSearchMode(inputs.mode);
  const view = searchMode && search.data ? searchView(search.data) : null;
  const [selection, setSelection] = useState<Selection | null>(null);

  useEffect(() => {
    const c = view ? initialChoice(view) : null;
    setSelection(c ? { rangeIndex: c.rangeIndex, optionId: c.option.id, customL: null } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.data]);

  const options = view && selection && view.ranges[selection.rangeIndex] ? lengthOptions(view.ranges[selection.rangeIndex], view.infimum) : [];
  const selectedL = selection?.optionId === "custom" ? selection.customL : options.find((o) => o.id === selection?.optionId)?.L ?? null;
  const target: SolveTarget | null = useMemo(() => {
    if (inputs.mode === "findH") return null;
    if (inputs.mode === "fixedLength") return { L_mm: inputs.L * 1000, numSupports: inputs.numSupports };
    if (search.status !== "ready" || !view || view.numSupports === null || selectedL === null) return null;
    return { L_mm: selectedL, numSupports: view.numSupports };
  }, [inputs.mode, inputs.L, inputs.numSupports, search.status, view?.numSupports, selectedL]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setSolveTarget(target), [target?.L_mm, target?.numSupports]); // eslint-disable-line react-hooks/exhaustive-deps

  const sol = solve.data?.result.status === "ok" ? solve.data.result : null;
  const searchStatus = search.data ? describeSearch(search.data) : null;
  const rangeExists = !searchMode || !search.data ? null
    : search.data.kind === "searchLength" && search.data.result.status === "undecidable" ? "undecidable" as const
    : (view?.ranges.length ?? 0) > 0;
  const current = solve.status === "ready" && sol && (!searchMode || search.status === "ready");
  const report = current && sol ? { solution: sol, searchStatus: searchStatus?.title ?? null, ranges: view?.ranges.map((r) => rangeText(r, fmt)) ?? [] } : null;

  return (
    <div className="space-y-4">
      {inputs.mode === "findH" && <StatusBanner s={{ tone: "info", title: "Find h is not available with the biaxial engine (V2)", detail: "Choose Fixed L, Find L range or Min. supports." }} />}
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
        <div className={solve.refreshing ? "opacity-60" : ""}>
          <Card><CardContent className="pt-4"><V2Charts solution={sol} samples={solve.data.samples} /></CardContent></Card>
          <div className="mt-4">
            <V2ResultsPanel s={sol} rangeExists={rangeExists} infimum={view?.infimum ?? null}
              atBound={["lower", "upper", "point"].includes(selection?.optionId ?? "") && searchMode} />
          </div>
        </div>
      )}
      <ExportPdfCard inputs={inputs} derived={derived} report={report} />
    </div>
  );
};

export default V2Workspace;
