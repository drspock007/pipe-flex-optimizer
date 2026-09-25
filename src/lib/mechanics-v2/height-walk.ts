// créé par Giovanni Malagnino, 2026-09-25 17:40 CEST (Europe/Rome, UTC+2)
// Traversal of contact regimes over hv in [-Hcap, Hcap] at fixed L.
// Normalized geometry (L = 1, EI = 1): free gaps g0 = hv a + Lambda b with
// Lambda = q L^4 / EI constant; the flexibility C does not depend on hv.
// For an active set, by linearity every constraint is  k hv + m  (mm), where
// k = coefficient of the unit-offset solve and m = Lambda * load coefficient
// (both from regimeCoefficients with hv = 1). The contact solution is unique
// (C SPD) and piecewise affine in hv: regimes form a chain of adjacent intervals.
// Start: contact problem at hv = -Hcap. At each event the degenerate set is
// resolved by the right-derivative problem along d g0 / d hv = a (no hv + eps
// probe). Single-point regimes are allowed; a cap yields "incomplete".

import { solveContact } from "./contact";
import { NormalizedData, PhysicalSlope, RegimeCoefficients, regimeCoefficients } from "./regime-coeffs";
import { CONTINUITY_REL_TOL, nextActiveDir } from "./regime-walk";
import { RegimeEvent } from "./regime-types";

const EVENT_REL_TOL = 1e-12;
const CLASSIFY_REL_TOL = 1e-9;

export interface HRegime {
  active: number[]; coeffs: RegimeCoefficients;
  lo: number; hi: number; hiEvents: RegimeEvent[]; ambiguous: boolean;
}
export type HWalk =
  | { status: "complete"; regimes: HRegime[] }
  | { status: "incomplete"; regimes: HRegime[]; message: string };

const sorted = (v: number[]) => [...v].sort((x, y) => x - y);

function initialSets(nd: NormalizedData, h0: number, Lambda: number): { P: number[]; D: number[] } {
  const idx = Array.from({ length: nd.n }, (_, i) => i);
  if (!nd.n) return { P: [], D: [] };
  const g0 = nd.a.map((v, i) => h0 * v + Lambda * nd.b[i]);
  const scale = Math.max(...nd.a.map((v, i) => Math.abs(h0 * v) + Math.abs(Lambda * nd.b[i])));
  if (scale === 0) return { P: [], D: idx };
  const rhoScale = scale / Math.max(...nd.C.map((r, i) => r[i]));
  const r = solveContact(g0, nd.C, 1e-13 * scale, 1e-13 * rhoScale);
  if (!r.converged) throw new RangeError(`Contact problem at hv=${h0} not converged: ${r.message}`);
  const g = g0.map((v, i) => v + nd.C[i].reduce((s, c, j) => s + c * r.R[j], 0));
  const P = idx.filter((i) => r.R[i] > CLASSIFY_REL_TOL * rhoScale);
  const D = idx.filter((i) => !P.includes(i) && !(g[i] > CLASSIFY_REL_TOL * scale));
  return { P, D };
}

export function walkHeights(nd: NormalizedData, Lambda: number, Hcap: number, phys: PhysicalSlope): HWalk {
  const tol = CONTINUITY_REL_TOL * Hcap;
  let { P, D } = initialSets(nd, -Hcap, Lambda);
  let h0 = -Hcap;
  const regimes: HRegime[] = [];
  const cap = 20 * (nd.n + 1) + 20;
  for (let it = 0; it < cap; it++) {
    const active = D.length ? nextActiveDir(nd.C, nd.a, P, D) : sorted(P);
    const coeffs = regimeCoefficients(nd, 1, active, Lambda !== 0, phys);
    const label = `[${active.map((i) => i + 1).join(",")}]`;
    let lo = -Infinity, hi = Infinity;
    const roots: { h: number; ev: RegimeEvent; unc: boolean }[] = [];
    for (const c of coeffs.constraints) {
      const k = c.constant, m = Lambda * c.scaledSlope;
      if (!Number.isFinite(m)) throw new RangeError("Non-representable load term in height regime");
      if (k === 0) {
        if (m < 0) throw new RangeError(`Regime ${label} is empty at hv=${h0}`);
        continue;
      }
      const h = -m / k;
      const ev: RegimeEvent = { kind: c.kind === "reaction" ? "reaction-zero" : "gap-zero", support: c.support };
      roots.push({ h, ev, unc: c.signUncertain });
      if (k > 0) lo = Math.max(lo, h); else hi = Math.min(hi, h);
    }
    if (lo > h0 + tol) throw new RangeError(`Coverage gap: regime ${label} does not contain hv=${h0}`);
    if (hi < h0 - tol) throw new RangeError(`Regime ${label} ends before hv=${h0}`);
    const end = Math.min(Math.max(hi, h0), Hcap);
    const hiEvents = end < Hcap ? roots.filter((r) => Math.abs(r.h - end) <= Math.max(EVENT_REL_TOL * Hcap, tol * 1e-3)) : [];
    const ambiguous = hiEvents.some((r) => r.unc);
    regimes.push({ active, coeffs, lo: h0, hi: end, hiEvents: hiEvents.map((r) => r.ev), ambiguous });
    if (end >= Hcap) return { status: "complete", regimes };
    const ev = new Set(hiEvents.map((r) => r.ev.support - 1));
    P = active.filter((i) => !ev.has(i));
    D = sorted([...ev]);
    h0 = end;
  }
  return { status: "incomplete", regimes, message: `Regime cap (${cap}) reached before hv = Hcap` };
}
