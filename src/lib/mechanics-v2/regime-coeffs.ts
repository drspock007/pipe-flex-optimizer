// créé par Giovanni Malagnino, 2026-09-25 01:04 CEST (Europe/Rome, UTC+2)
// Affine regime coefficients on the normalized geometry (L = 1, EI = 1).
// a: support-free gaps for a unit end offset; b: for a unit load; C: flexibility.
// Active set A: rho_A = gamma + delta Lambda with
//   gamma = -C_AA^-1 (hv a_A),  delta = -C_AA^-1 b_A   (rho = R L^3 / EI, mm).
// Inactive: g_I = (hv a_I + C_IA gamma) + (b_I + C_IA delta) Lambda.
// Zero handling: each coefficient carries a magnitude estimate (sum of the
// absolute values of its terms, with |C_AA^-1| for solves). A coefficient below
// ZERO_REL_TOL times its own magnitude is indistinguishable from rounding and set
// to 0; up to UNCERTAIN_REL_TOL it is kept but flagged as sign-uncertain. Small
// physical coefficients (small terms) are therefore preserved.

import { buildVerticalSystem, condense } from "./vertical-system";
import { factorize } from "./linear-algebra";
import { RegimeConstraint } from "./regime-types";

export const ZERO_REL_TOL = 1e-9;
export const UNCERTAIN_REL_TOL = 1e-7;

export interface NormalizedData { n: number; a: number[]; b: number[]; C: number[][] }
const cache = new Map<number, NormalizedData>();

export function normalizedData(n: number): NormalizedData {
  const hit = cache.get(n);
  if (hit) return hit;
  let d: NormalizedData = { n, a: [], b: [], C: [] };
  if (n > 0) {
    const A = condense(buildVerticalSystem(1, 1, 1, 0, n));
    d = { n, a: A.g0, b: condense(buildVerticalSystem(1, 0, 1, 1, n)).g0, C: A.C };
  }
  cache.set(n, d);
  return d;
}

interface Classified { value: number; roundingZero: boolean; uncertain: boolean }
function classify(v: number, mag: number): Classified {
  if (!Number.isFinite(v) || !Number.isFinite(mag)) throw new RangeError("Non-finite regime coefficient");
  if (v !== 0 && Math.abs(v) <= ZERO_REL_TOL * mag) return { value: 0, roundingZero: true, uncertain: false };
  return { value: v, roundingZero: false, uncertain: v !== 0 && Math.abs(v) <= UNCERTAIN_REL_TOL * mag };
}

export interface RegimeCoefficients {
  active: number[]; // 0-based, sorted
  constraints: RegimeConstraint[];
  gamma: number[];
  delta: number[];
}

export type PhysicalSlope = (scaled: number) => { slope: number; ok: boolean };

export function regimeCoefficients(
  nd: NormalizedData, hv: number, active: number[], withLoad: boolean, phys: PhysicalSlope,
): RegimeCoefficients {
  const { n, a, b, C } = nd;
  let Minv: number[][] = [];
  if (active.length) {
    const f = factorize(active.map((i) => active.map((j) => C[i][j])));
    const cols = active.map((_, k) => f.solve(active.map((_, j) => (j === k ? 1 : 0))));
    Minv = active.map((_, r) => cols.map((col) => col[r]));
  }
  const mul = (rhs: number[], abs: boolean) =>
    Minv.map((row) => row.reduce((s, v, j) => s + (abs ? Math.abs(v * rhs[j]) : v * rhs[j]), 0));
  const rA = active.map((i) => -hv * a[i]);
  const rB = active.map((i) => -b[i]);
  const gamma = mul(rA, false), gMag = mul(rA, true), delta = mul(rB, false), dMag = mul(rB, true);
  const zero: Classified = { value: 0, roundingZero: false, uncertain: false };

  const make = (kind: "reaction" | "gap", i: number, c: Classified, s0: Classified): RegimeConstraint => {
    const s = withLoad ? s0 : zero;
    const p = phys(s.value);
    return {
      kind, support: i + 1, constant: c.value, slope: p.slope, scaledSlope: s.value,
      slopeRepresentable: p.ok, identicallyZero: c.value === 0 && s.value === 0,
      roundingZero: { constant: c.roundingZero, slope: s.roundingZero },
      signUncertain: c.uncertain || s.uncertain,
    };
  };
  const out = active.map((i, k) => make("reaction", i, classify(gamma[k], gMag[k]), classify(delta[k], dMag[k])));
  for (let i = 0; i < n; i++) {
    if (active.includes(i)) continue;
    let c = hv * a[i], cm = Math.abs(hv * a[i]), s = b[i], sm = Math.abs(b[i]);
    active.forEach((j, k) => {
      c += C[i][j] * gamma[k]; cm += Math.abs(C[i][j]) * gMag[k];
      s += C[i][j] * delta[k]; sm += Math.abs(C[i][j]) * dMag[k];
    });
    out.push(make("gap", i, classify(c, cm), classify(s, sm)));
  }
  return { active, constraints: out, gamma, delta };
}
