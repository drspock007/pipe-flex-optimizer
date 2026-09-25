// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Representative-length options derived from a search result. Only finite,
// included bounds are proposed; a midpoint only for a finite range; minima only
// when attained inside the selected range. Nothing is invented for unbounded
// ranges or non-attained infima.

import { GeneralInfimum, GeneralRange } from "@/lib/mechanics-v2";
import { SearchOutcome } from "./protocol";

export interface LengthOption { id: string; label: string; L: number } // L in mm

export interface SearchView {
  ranges: GeneralRange[];
  infimum: GeneralInfimum | null;
  numSupports: number | null; // installed count to use for the representation
}

/** Ranges and installed count usable for representation (none on failures). */
export function searchView(o: SearchOutcome): SearchView {
  if (o.kind === "findH") return { ranges: [], infimum: null, numSupports: null };
  if (o.kind === "searchLength") {
    const r = o.result;
    if (r.status === "ok") return { ranges: r.ranges, infimum: r.infimum, numSupports: r.scope.numSupports };
    if (r.status === "undecidable") return { ranges: [], infimum: r.infimum, numSupports: r.scope.numSupports };
    return { ranges: [], infimum: null, numSupports: null };
  }
  const r = o.result;
  if (r.status === "found") return { ranges: r.result.ranges, infimum: r.result.infimum, numSupports: r.numSupports };
  if (r.status === "incomplete" && r.candidate) {
    return { ranges: r.candidate.result.ranges, infimum: r.candidate.result.infimum, numSupports: r.candidate.numSupports };
  }
  return { ranges: [], infimum: null, numSupports: null };
}

const inRange = (L: number, r: GeneralRange) =>
  (r.lower.value === null || L >= r.lower.value) && (r.upper.value === null || L <= r.upper.value);

export function lengthOptions(r: GeneralRange, inf: GeneralInfimum | null): LengthOption[] {
  const out: LengthOption[] = [];
  const lo = r.lower.kind === "finite" && r.lower.included ? r.lower.value : null;
  const hi = r.upper.kind === "finite" && r.upper.included ? r.upper.value : null;
  if (lo !== null && hi !== null && lo === hi) return [{ id: "point", label: "Single admissible length", L: lo }];
  if (inf?.attained) inf.locations.filter((L) => inRange(L, r)).forEach((L, k) => out.push({ id: `min${k}`, label: "Minimum stress", L }));
  if (lo !== null && hi !== null) out.push({ id: "mid", label: "Midpoint", L: 0.5 * (lo + hi) });
  if (lo !== null) out.push({ id: "lower", label: "Lower bound", L: lo });
  if (hi !== null) out.push({ id: "upper", label: "Upper bound", L: hi });
  return out;
}

/** Initial choice rule: first range; minimum stress, else midpoint, else a finite bound. */
export function initialChoice(v: SearchView): { rangeIndex: number; option: LengthOption } | null {
  for (let k = 0; k < v.ranges.length; k++) {
    const opts = lengthOptions(v.ranges[k], v.infimum);
    if (opts.length) return { rangeIndex: k, option: opts[0] };
  }
  return null;
}

export const validCustomLength = (L_mm: number) => Number.isFinite(L_mm) && L_mm > 0;
