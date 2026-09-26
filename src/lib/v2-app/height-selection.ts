// créé par Giovanni Malagnino, 2026-09-25 17:40 CEST (Europe/Rome, UTC+2)
// Ground (V2-6): every published bound is a solved admissible sample, so the
// initial choice (upper bound of the last range) is a verified admissible hv.
// Represented hv options after a Find h search (hv in mm, signed, zero allowed).
// Initial rule: upper bound of the range holding the largest admissible hv
// (the maximum admissible height), i.e. the last range.

import { HeightRange } from "@/lib/mechanics-v2";
import { SearchOutcome } from "./protocol";

export interface HeightOption { id: string; label: string; hv: number }
export interface HeightSelection { rangeIndex: number; optionId: string; customH: number | null }

export function heightRanges(o: SearchOutcome | null): HeightRange[] {
  if (o?.kind === "findHRestrained") return "ranges" in o.result ? o.result.ranges : [];
  if (o?.kind === "findHGround") return "ranges" in o.result ? o.result.ranges : [];
  return o?.kind === "findH" && o.result.status === "ok" ? o.result.ranges : [];
}

export function heightOptions(r: HeightRange): HeightOption[] {
  const lo = r.lower.value, hi = r.upper.value;
  if (lo === hi) return [{ id: "point", label: "Single admissible hv", hv: lo }];
  return [
    { id: "upper", label: "Upper bound", hv: hi },
    { id: "mid", label: "Midpoint", hv: 0.5 * (lo + hi) },
    { id: "lower", label: "Lower bound", hv: lo },
  ];
}

/** Restrained (V2-10): the finally re-verified hv, when available. */
export function checkedHeight(o: SearchOutcome | null): number | null | undefined {
  if (o?.kind !== "findHRestrained" || !("meta" in o.result)) return undefined;
  return o.result.meta.finalCheck.hv;
}

/** preferred: re-verified hv (restrained); null = none verified (no initial choice). */
export function initialHeight(ranges: HeightRange[], preferred?: number | null): HeightSelection | null {
  if (!ranges.length || preferred === null) return null;
  if (preferred !== undefined) {
    for (let k = ranges.length - 1; k >= 0; k--) {
      const opt = heightOptions(ranges[k]).find((o) => o.id !== "mid" && o.hv === preferred);
      if (opt) return { rangeIndex: k, optionId: opt.id, customH: null };
    }
    const k = ranges.findIndex((r) => r.lower.value <= preferred && preferred <= r.upper.value);
    return { rangeIndex: Math.max(0, k), optionId: "custom", customH: preferred };
  }
  const k = ranges.length - 1;
  return { rangeIndex: k, optionId: heightOptions(ranges[k])[0].id, customH: null };
}

export function selectedHeight(ranges: HeightRange[], s: HeightSelection | null): number | null {
  if (!s || !ranges[s.rangeIndex]) return null;
  if (s.optionId === "custom") return s.customH !== null && Number.isFinite(s.customH) ? s.customH : null;
  return heightOptions(ranges[s.rangeIndex]).find((o) => o.id === s.optionId)?.hv ?? null;
}

export const heightRangeText = (r: HeightRange, fmt: (mm: number) => string) =>
  `${r.lower.included ? "[" : "("}${fmt(r.lower.value)} ; ${fmt(r.upper.value)}${r.upper.included ? "]" : ")"}`;
