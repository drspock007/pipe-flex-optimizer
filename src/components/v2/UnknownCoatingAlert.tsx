// créé par Giovanni Malagnino, 2026-09-26 17:05 CEST (Europe/Rome, UTC+2)
// Persistent warning after loading a preset with an unrecognized coating key.
// The fallback to "no coating" is never silent: the user confirms it or picks a coating.

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const UNKNOWN_COATING_TEXT =
  "Unknown coating type in this preset. No coating is currently applied; please confirm or select a coating before exporting.";

const UnknownCoatingAlert = ({ coatingKey, onConfirmNone }: { coatingKey: string; onConfirmNone: () => void }) => (
  <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs space-y-2">
    <p className="flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0 text-destructive" /><span>{UNKNOWN_COATING_TEXT}</span></p>
    <p className="text-muted-foreground">Stored value: <span className="font-mono break-all">"{coatingKey}"</span>. Choose a coating below, or:</p>
    <Button size="sm" variant="outline" onClick={onConfirmNone}>Confirm no coating</Button>
  </div>
);

export default UnknownCoatingAlert;
