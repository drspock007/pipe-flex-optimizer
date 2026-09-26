// créé par Giovanni Malagnino, 2026-09-26 05:10 CEST (Europe/Rome, UTC+2)
// Min. supports with ground (V2-8): status, progress, per-count table and details.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListOrdered } from "lucide-react";
import { GroundMinResult } from "@/lib/mechanics-v2";
import type { SearchProgress } from "@/lib/v2-app/protocol";
import { GROUND_MIN_LIMITS, ROW_LABEL } from "@/lib/v2-app/ground-min-text";
import { StatusText } from "@/lib/v2-app/status-text";
import { StatusBanner, Busy } from "./StatusBanner";

interface Props {
  loading: boolean; refreshing: boolean; error: string | null; status: StatusText | null;
  result: GroundMinResult | null; details: [string, string][]; progress: SearchProgress | null; title?: string;
}

const GroundMinCard = ({ loading, refreshing, error, status, result, details, progress, title = "Minimum supports with ground" }: Props) => {
  const rows = result && "rows" in result ? result.rows : [];
  const busy = progress ? `Examining ${progress.n} installed support${progress.n === 1 ? "" : "s"} (ceiling ${progress.maxSupports}, ${progress.evaluations} solves so far)…` : "Searching the smallest support count…";
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><ListOrdered className="h-4 w-4 text-primary" /> {title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {loading && <Busy label={refreshing ? `${busy} — the content below belongs to the previous inputs` : busy} />}
        {error && <StatusBanner s={{ tone: "error", title: "Search failed", detail: error }} />}
        {status && <StatusBanner s={status} />}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="text-left text-muted-foreground"><th className="pr-2">n</th><th className="pr-2">Result</th><th className="pr-2 text-right">Solves</th><th className="pr-2 text-right">Adm.</th><th className="pr-2 text-right">Unc.</th><th className="text-right">Fail.</th></tr></thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.n} className={`border-t border-border/50 ${x.status === "candidate" ? "font-semibold text-primary" : ""}`}>
                    <td className="pr-2 font-mono">{x.n}</td><td className="pr-2">{ROW_LABEL[x.status]}</td>
                    <td className="pr-2 text-right font-mono">{x.evaluations}</td><td className="pr-2 text-right font-mono">{x.admissible}</td>
                    <td className="pr-2 text-right font-mono">{x.uncertain}</td><td className="text-right font-mono">{x.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {details.length > 0 && (
          <dl className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
            {details.filter(([a]) => !a.startsWith("n = ")).map(([a, b], i) => (<div key={i} className="contents"><dt className="text-muted-foreground">{a}</dt><dd className="font-mono break-words">{b}</dd></div>))}
          </dl>
        )}
        {result && <p className="text-[11px] text-muted-foreground">{GROUND_MIN_LIMITS}</p>}
        {result?.status === "found" && (
          <p className="text-[11px] text-muted-foreground">The installed-supports input of the other modes is unchanged: the candidate count belongs to this search result. The verdict at the represented length is shown below and may differ for a custom length.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default GroundMinCard;
