// créé par Giovanni Malagnino, 2026-09-26 04:30 CEST (Europe/Rome, UTC+2)
// User-facing status of a fixed-length solve (moved out of V2Workspace.tsx).

import { BiaxialResult } from "@/lib/mechanics-v2";
import type { StatusText } from "./status-text";

export const solveText = (r: BiaxialResult): StatusText | null => {
  switch (r.status) {
    case "ok": return null;
    case "invalid-input": return { tone: "error", title: "Invalid input", detail: r.errors.join("; ") };
    case "not-implemented": return { tone: "info", title: "Not implemented", detail: r.message };
    case "geometry-incompatible": return { tone: "error", title: "Geometric incompatibility", detail: r.message };
    case "incomplete": return { tone: "warn", title: "Calculation incomplete (no result published)", detail: r.message };
    case "contact-not-converged": return { tone: "error", title: "Contact did not converge", detail: r.diagnostics.messages.join("; ") };
    default: return { tone: "error", title: "Numerical failure", detail: r.message };
  }
};
