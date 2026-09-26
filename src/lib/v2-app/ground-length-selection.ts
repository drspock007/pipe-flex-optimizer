// créé par Giovanni Malagnino, 2026-09-26 04:30 CEST (Europe/Rome, UTC+2)
// Represented L options for Find L with ground (V2-7), L in mm. Initial rule:
// the verified admissible sample with the LOWEST computed stress (not a global
// minimum). A midpoint of an estimated range is not verified: it is re-solved.

import { GroundLengthRange, GroundLengthResult } from "@/lib/mechanics-v2";
import { SearchOutcome } from "./protocol";

export interface GLOption { id: string; label: string; value: number }
export interface GLSelection { rangeIndex: number; optionId: string; custom: number | null }

export const groundLengthResult = (o: SearchOutcome | null): GroundLengthResult | null =>
  o?.kind === "searchLengthGround" ? o.result : o?.kind === "minSupportsGround" && o.result.status === "found" ? o.result.candidate.search : null;
/** Preferred represented L: Min. supports with ground uses the L that passed the final check. */
export const glBest = (o: SearchOutcome | null): number | null =>
  o?.kind === "minSupportsGround" ? (o.result.status === "found" ? o.result.candidate.L : null)
  : o?.kind === "searchLengthGround" && "lowestStress" in o.result ? o.result.lowestStress?.L ?? null : null;
export const glRanges = (r: GroundLengthResult | null): GroundLengthRange[] => (r && "ranges" in r ? r.ranges : []);

export function glOptions(r: GroundLengthRange, best: number | null): GLOption[] {
  const lo = r.lower.value, hi = r.upper.value, out: GLOption[] = [];
  if (best !== null && best >= lo && best <= hi) out.push({ id: "best", label: "Verified admissible L (lowest stress)", value: best });
  if (lo === hi) return out.length ? out : [{ id: "point", label: "Single admissible L", value: lo }];
  out.push({ id: "lower", label: "Lower bound (verified)", value: lo }, { id: "mid", label: "Midpoint (not verified, re-solved)", value: 0.5 * (lo + hi) }, { id: "upper", label: "Upper bound (verified)", value: hi });
  return out;
}

export function glInitial(r: GroundLengthResult | null, best: number | null = r && "lowestStress" in r ? r.lowestStress?.L ?? null : null): GLSelection | null {
  const ranges = glRanges(r);
  if (!ranges.length || !r) return null;
  const k = Math.max(0, ranges.findIndex((g) => best !== null && best >= g.lower.value && best <= g.upper.value));
  return { rangeIndex: k, optionId: glOptions(ranges[k], best)[0].id, custom: null };
}

export function glSelected(r: GroundLengthResult | null, s: GLSelection | null, best: number | null = r && "lowestStress" in r ? r.lowestStress?.L ?? null : null): number | null {
  const ranges = glRanges(r);
  if (!s || !ranges[s.rangeIndex]) return null;
  if (s.optionId === "custom") return s.custom !== null && Number.isFinite(s.custom) && s.custom > 0 ? s.custom : null;
  return glOptions(ranges[s.rangeIndex], best).find((o) => o.id === s.optionId)?.value ?? null;
}
