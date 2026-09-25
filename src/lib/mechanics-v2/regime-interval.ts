// créé par Giovanni Malagnino, 2026-09-25 01:04 CEST (Europe/Rome, UTC+2)
// Exact intersection of V > 0 with constant + s V >= 0, where L = scale * V^(1/4).
// Roots are computed directly in length as scale * |c|^(1/4) / |s|^(1/4), which
// stays representable when -c/s itself would over/underflow. A non-representable
// root raises an explicit error, never an "unbounded" or "zero-excluded" bound.
// Event grouping (EVENT_REL_TOL) only labels constraints vanishing at a bound;
// it never moves the bound, which is the exact max/min of the roots.

import { RegimeConstraint, RegimeEvent, RegimeInterval } from "./regime-types";

export const EVENT_REL_TOL = 1e-12;

export type Affine = Pick<RegimeConstraint, "kind" | "support" | "constant"> & { s: number };

const qr = (x: number) => Math.sqrt(Math.sqrt(x));
const evt = (c: Affine): RegimeEvent =>
  ({ kind: c.kind === "reaction" ? "reaction-zero" : "gap-zero", support: c.support });

function rootLength(c: number, s: number, scale: number): number {
  const L = scale * (qr(Math.abs(c)) / qr(Math.abs(s)));
  if (!Number.isFinite(L) || !(L > 0)) {
    throw new RangeError(`Non-representable regime bound (constant ${c}, slope ${s}, scale ${scale})`);
  }
  return L;
}

export function intersectAffine(cs: Affine[], scale: number): RegimeInterval {
  const empty: RegimeInterval = { status: "empty", lower: null, upper: null };
  let lo = 0, hi = Infinity;
  const roots: { L: number; ev: RegimeEvent }[] = [];
  for (const c of cs) {
    if (c.s === 0 || c.constant === 0) {
      // Constant constraint, or root at V = 0: sign of the non-zero coefficient decides.
      if (c.constant < 0 || (c.constant === 0 && c.s < 0)) return empty;
      continue;
    }
    if (c.s > 0 && c.constant > 0) continue;
    if (c.s < 0 && c.constant < 0) return empty;
    const L = rootLength(c.constant, c.s, scale);
    roots.push({ L, ev: evt(c) });
    if (c.s > 0) lo = Math.max(lo, L);
    else hi = Math.min(hi, L);
  }
  if (lo > hi) return empty;
  const at = (B: number) => roots.filter((r) => Math.abs(r.L - B) <= EVENT_REL_TOL * B).map((r) => r.ev);
  return {
    status: lo === hi ? "single-point" : "interval",
    lower: lo > 0
      ? { value: lo, included: true, kind: "finite", events: at(lo) }
      : { value: null, included: false, kind: "zero-excluded", events: [] },
    upper: Number.isFinite(hi)
      ? { value: hi, included: true, kind: "finite", events: at(hi) }
      : { value: null, included: false, kind: "unbounded", events: [] },
  };
}
