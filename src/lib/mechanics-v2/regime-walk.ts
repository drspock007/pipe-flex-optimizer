// créé par Giovanni Malagnino, 2026-09-25 01:04 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-25 17:40 CEST: directional problem shared with the height walk.
// Traversal of contact regimes over L > 0. Since the flexibility C is symmetric
// positive definite, the contact solution is unique for every L and piecewise
// affine in Lambda = T q / EI: the regimes form a chain of adjacent intervals.
// - Start (L -> 0+): contact problem with the constant terms only (hv a), then
//   the load terms decide contacts that are degenerate (zero gap, zero reaction).
// - At each event: contacts vanishing at the bound form the degenerate set D;
//   the right-derivative problem (min 0.5 x'Cx + b'x, x_P free, x_D >= 0) gives
//   the next active set exactly. No L + epsilon probe is used.
// Coverage: every regime must contain the previous breakpoint (relative
// CONTINUITY_REL_TOL, a detection tolerance; breakpoints are shared exactly) and
// strictly progress. A regime cap returns "incomplete", never "no solution".

import { solveContact } from "./contact";
import { factorize } from "./linear-algebra";
import { NormalizedData, PhysicalSlope, RegimeCoefficients, regimeCoefficients } from "./regime-coeffs";
import { intersectAffine } from "./regime-interval";
import { RegimeBound } from "./regime-types";

export const CONTINUITY_REL_TOL = 1e-9;
const CLASSIFY_REL_TOL = 1e-9;

export interface WalkRegime { active: number[]; coeffs: RegimeCoefficients; lower: RegimeBound; upper: RegimeBound }
export type WalkResult =
  | { status: "complete"; regimes: WalkRegime[] }
  | { status: "incomplete"; regimes: WalkRegime[]; message: string };

const maxAbs = (v: number[]) => Math.max(0, ...v.map(Math.abs));

/** Active set just after a breakpoint (right-derivative contact problem).
 *  b is the derivative of the free gaps along the traversed parameter. */
export function nextActiveDir(C: number[][], b: number[], P: number[], D: number[]): number[] {
  const sorted = (v: number[]) => [...v].sort((x, y) => x - y);
  if (!D.length) return sorted(P);
  let Ct = D.map((i) => D.map((j) => C[i][j]));
  let bt = D.map((i) => b[i]);
  if (P.length) {
    const f = factorize(P.map((i) => P.map((j) => C[i][j])));
    const y = f.solve(P.map((i) => b[i]));
    const X = D.map((j) => f.solve(P.map((i) => C[i][j])));
    Ct = D.map((i, r) => D.map((_, s) => Ct[r][s] - P.reduce((acc, p, k) => acc + C[i][p] * X[s][k], 0)));
    bt = D.map((i, r) => bt[r] - P.reduce((acc, p, k) => acc + C[i][p] * y[k], 0));
  }
  for (let i = 0; i < D.length; i++) for (let j = i + 1; j < D.length; j++) Ct[i][j] = Ct[j][i] = 0.5 * (Ct[i][j] + Ct[j][i]);
  const bs = maxAbs(bt);
  if (bs === 0) return sorted(P);
  const cs = Math.max(...Ct.map((r, i) => r[i]));
  const r = solveContact(bt, Ct, 1e-13 * bs, (1e-13 * bs) / cs);
  if (!r.converged) throw new RangeError(`Derivative contact problem not converged: ${r.message}`);
  const xs = maxAbs(r.R);
  return sorted([...P, ...D.filter((_, k) => r.R[k] > CLASSIFY_REL_TOL * xs)]);
}

/** Contact state for L -> 0+ from the constant (end offset) terms. */
function initialSets(nd: NormalizedData, hv: number): { P: number[]; D: number[] } {
  const idx = Array.from({ length: nd.n }, (_, i) => i);
  if (nd.n === 0) return { P: [], D: [] };
  if (hv === 0) return { P: [], D: idx };
  const rhoScale = Math.abs(hv) / Math.max(...nd.C.map((r, i) => r[i]));
  const g0 = nd.a.map((v) => hv * v);
  const r = solveContact(g0, nd.C, 1e-13 * Math.abs(hv), 1e-13 * rhoScale);
  if (!r.converged) throw new RangeError(`Limit contact problem (L -> 0) not converged: ${r.message}`);
  const g = g0.map((v, i) => v + nd.C[i].reduce((s, c, j) => s + c * r.R[j], 0));
  const P = idx.filter((i) => r.R[i] > CLASSIFY_REL_TOL * rhoScale);
  const D = idx.filter((i) => !P.includes(i) && !(g[i] > CLASSIFY_REL_TOL * Math.abs(hv)));
  return { P, D };
}

export function walkRegimes(
  nd: NormalizedData, hv: number, q: number, Lq: number | null, phys: PhysicalSlope,
): WalkResult {
  let { P, D } = initialSets(nd, hv);
  const regimes: WalkRegime[] = [];
  let prev: RegimeBound = { value: null, included: false, kind: "zero-excluded", events: [] };
  const cap = 20 * (nd.n + 1) + 20;
  for (let k = 0; k < cap; k++) {
    // With q = 0 the regime cannot change with L: degenerate contacts stay inactive.
    const active = q > 0 ? nextActiveDir(nd.C, nd.b, P, D) : [...P].sort((x, y) => x - y);
    const coeffs = regimeCoefficients(nd, hv, active, q > 0, phys);
    const iv = intersectAffine(coeffs.constraints.map((c) => ({ ...c, s: c.scaledSlope })), Lq ?? 1);
    const label = `[${active.map((i) => i + 1).join(",")}]`;
    if (iv.status === "empty") throw new RangeError(`Regime ${label} is empty after L=${prev.value}`);
    const pv = prev.value;
    if (pv === null ? iv.lower!.kind !== "zero-excluded" : (iv.lower!.value ?? 0) > pv * (1 + CONTINUITY_REL_TOL)) {
      throw new RangeError(`Coverage gap: regime ${label} does not contain L=${pv ?? "0+"}`);
    }
    const up = iv.upper!;
    if (up.kind === "finite" && pv !== null && !(up.value! > pv)) {
      throw new RangeError(`No progress at L=${pv} with regime ${label}`);
    }
    regimes.push({ active, coeffs, lower: prev, upper: up });
    if (up.kind === "unbounded") return { status: "complete", regimes };
    const ev = new Set(up.events.map((e) => e.support - 1));
    P = active.filter((i) => !ev.has(i));
    D = [...ev].sort((x, y) => x - y);
    prev = up;
  }
  return { status: "incomplete", regimes, message: `Regime cap (${cap}) reached before L -> infinity` };
}
