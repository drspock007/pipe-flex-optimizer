// créé par Giovanni Malagnino, 2026-09-25 00:54 CEST (Europe/Rome, UTC+2)
// Contact regime for an imposed active set, by linearity in u = x/L.
// On the normalized geometry (L = 1, EI = 1) two independent solves give the
// support-free gaps: a (unit end offset, no load) and b (unit load, no offset),
// plus the normalized flexibility Chat. Physical scaling:
//   g0_i = hv a_i + (q/EI) T b_i ,   C = (L^3/EI) Chat.
// Active set A (g_A = 0): Chat_AA (R L^3/EI) = -(hv a_A + (q/EI) T b_A).
// Inactive gaps: g_I = hv a_I + (q/EI) T b_I + Chat_IA (R L^3/EI).
// No length sampling or fitting is used; the interval is exact in T.

import { validateInput } from "./validate";
import { buildVerticalSystem, condense } from "./vertical-system";
import { factorize } from "./linear-algebra";
import { RegimeConstraint, RegimeEvent, RegimeInput, RegimeInterval, RegimeResult } from "./regime-types";

/** Coefficients below COEF_REL_TOL * (max of their family) are treated as exact zeros. */
export const COEF_REL_TOL = 1e-10;
/** Roots within EVENT_REL_TOL (relative in T) of a bound are simultaneous events. */
export const EVENT_REL_TOL = 1e-9;

function validate(input: RegimeInput): string[] {
  const errors = validateInput({ ...input, L: 1 });
  const n = input.numSupports;
  if (!Array.isArray(input.activeSet)) return [...errors, "activeSet must be an array"];
  const seen = new Set<number>();
  for (const i of input.activeSet) {
    if (!Number.isInteger(i) || i < 1 || i > n) errors.push(`active index ${i} must be an integer in [1, ${n}]`);
    else if (seen.has(i)) errors.push(`duplicate active index ${i}`);
    seen.add(i);
  }
  return errors;
}

function buildConstraints(input: RegimeInput): RegimeConstraint[] {
  const n = input.numSupports;
  if (n === 0) return [];
  const EI = input.E * input.I;
  const qr = input.q / EI; // 1/mm^3
  const a = condense(buildVerticalSystem(1, 1, 1, 0, n));
  const b = condense(buildVerticalSystem(1, 0, 1, 1, n)).g0;
  const C = a.C;
  const A = [...input.activeSet].sort((x, y) => x - y).map((i) => i - 1);
  const Iset = Array.from({ length: n }, (_, i) => i).filter((i) => !A.includes(i));
  let gam: number[] = [], del: number[] = [];
  if (A.length) {
    const f = factorize(A.map((i) => A.map((j) => C[i][j])));
    gam = f.solve(A.map((i) => -input.hv * a.g0[i]));
    del = f.solve(A.map((i) => -qr * b[i]));
  }
  const raw = [
    ...A.map((i, k) => ({ kind: "reaction" as const, support: i + 1, constant: gam[k], slope: del[k] })),
    ...Iset.map((i) => ({
      kind: "gap" as const, support: i + 1,
      constant: input.hv * a.g0[i] + A.reduce((s, j, k) => s + C[i][j] * gam[k], 0),
      slope: qr * b[i] + A.reduce((s, j, k) => s + C[i][j] * del[k], 0),
    })),
  ];
  if (!raw.every((c) => Number.isFinite(c.constant) && Number.isFinite(c.slope))) {
    throw new RangeError("Non-finite regime coefficient");
  }
  // Family scales: displacement-driven constants and load-driven slopes.
  const sc = Math.max(0, ...raw.map((c) => Math.abs(c.constant)));
  const ss = Math.max(0, ...raw.map((c) => Math.abs(c.slope)));
  return raw.map((c) => {
    const constant = Math.abs(c.constant) <= COEF_REL_TOL * sc ? 0 : c.constant;
    const slope = Math.abs(c.slope) <= COEF_REL_TOL * ss ? 0 : c.slope;
    return { ...c, constant, slope, identicallyZero: constant === 0 && slope === 0 };
  });
}

const evt = (c: RegimeConstraint): RegimeEvent =>
  ({ kind: c.kind === "reaction" ? "reaction-zero" : "gap-zero", support: c.support });

/** Exact intersection of T > 0 with constant + slope * T >= 0 for every constraint. */
export function intersectRegime(cs: RegimeConstraint[]): RegimeInterval {
  const empty: RegimeInterval = { status: "empty", lower: null, upper: null };
  let lo = 0, hi = Infinity;
  for (const c of cs) {
    if (c.slope === 0) { if (c.constant < 0) return empty; continue; }
    const r = -c.constant / c.slope;
    if (c.slope > 0) lo = Math.max(lo, r); else hi = Math.min(hi, r);
  }
  if (!(hi > 0) || lo > hi) return empty;
  const at = (T: number) => cs.filter((c) => c.slope !== 0 &&
    Math.abs(-c.constant / c.slope - T) <= EVENT_REL_TOL * T).map(evt);
  const len = (T: number) => {
    const L = Math.sqrt(Math.sqrt(T));
    if (!Number.isFinite(L) || !(L > 0)) throw new RangeError(`Non-representable length bound (T=${T})`);
    return L;
  };
  const lower = lo > 0
    ? { value: len(lo), included: true, kind: "finite" as const, events: at(lo) }
    : { value: null, included: false, kind: "zero-excluded" as const, events: [] };
  const upper = Number.isFinite(hi)
    ? { value: len(hi), included: true, kind: "finite" as const, events: at(hi) }
    : { value: null, included: false, kind: "unbounded" as const, events: [] };
  return { status: lo === hi ? "single-point" : "interval", lower, upper };
}

export function computeRegime(input: RegimeInput): RegimeResult {
  const errors = validate(input);
  if (errors.length) return { status: "invalid-input", errors };
  if (input.axialMode === "restrained") {
    return { status: "not-implemented", message: 'axialMode "restrained" is not implemented' };
  }
  try {
    const constraints = buildConstraints(input);
    return {
      status: "ok", numSupports: input.numSupports,
      activeSet: [...input.activeSet].sort((x, y) => x - y),
      constraints, interval: intersectRegime(constraints), physicalValidity: "not-assessed",
    };
  } catch (e) {
    return { status: "numerical-failure", message: (e as Error).message };
  }
}

/** Physical gaps (mm) and reactions (N) of the regime at length L (for checks only). */
export function evaluateRegime(input: RegimeInput, cs: RegimeConstraint[], L: number) {
  const T = L ** 4, EI = input.E * input.I;
  return cs.map((c) => ({
    kind: c.kind, support: c.support,
    value: c.kind === "gap" ? c.constant + c.slope * T : ((c.constant + c.slope * T) * EI) / L ** 3,
  }));
}
