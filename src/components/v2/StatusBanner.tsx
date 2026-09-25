// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
import { AlertTriangle, CheckCircle2, Info, XCircle, Loader2 } from "lucide-react";
import { StatusText } from "@/lib/v2-app/status-text";

const ICON = { ok: CheckCircle2, warn: AlertTriangle, error: XCircle, info: Info };
const TONE = {
  ok: "border-primary/40 bg-primary/5",
  warn: "border-warning-strong/50 bg-muted",
  error: "border-destructive/50 bg-destructive/10",
  info: "border-border bg-muted",
};

export const StatusBanner = ({ s }: { s: StatusText }) => {
  const Icon = ICON[s.tone];
  return (
    <div className={`rounded-md border px-3 py-2 text-xs ${TONE[s.tone]}`} role="status">
      <div className="flex items-center gap-2 font-semibold text-foreground">
        <Icon className={`h-4 w-4 ${s.tone === "error" ? "text-destructive" : "text-primary"}`} /> {s.title}
      </div>
      {s.detail && <p className="mt-1 text-muted-foreground">{s.detail}</p>}
    </div>
  );
};

export const Busy = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> {label}
  </div>
);
